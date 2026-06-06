import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { body, validationResult } from "express-validator";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";
import { logActivity, notifyRole, notifyUser } from "../utils/activity.js";
import { sendRfqInvitation } from "../utils/email.js";

const router = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_MB || 5) * 1024 * 1024 },
});

async function getRfqDetail(id) {
  const { rows } = await query(`SELECT r.*, u.name AS created_by_name FROM rfqs r LEFT JOIN users u ON u.id = r.created_by WHERE r.id = $1`, [id]);
  if (!rows[0]) return null;
  const rfq = rows[0];
  const items = await query(`SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY id`, [id]);
  const vendors = await query(
    `SELECT v.* FROM rfq_vendors rv JOIN vendors v ON v.id = rv.vendor_id WHERE rv.rfq_id = $1`,
    [id],
  );
  const attachments = await query(`SELECT id, filename, filepath, uploaded_at FROM rfq_attachments WHERE rfq_id = $1`, [id]);
  const quotations = await query(
    `SELECT q.*, v.name AS vendor_name, v.rating AS vendor_rating
     FROM quotations q JOIN vendors v ON v.id = q.vendor_id WHERE q.rfq_id = $1 ORDER BY q.total_price ASC`,
    [id],
  );
  return { ...rfq, items: items.rows, vendors: vendors.rows, attachments: attachments.rows, quotations: quotations.rows };
}

router.get("/", authRequired, async (req, res) => {
  const { status, search } = req.query;
  let sql = `SELECT r.*, u.name AS created_by_name,
    (SELECT COUNT(*)::int FROM quotations q WHERE q.rfq_id = r.id AND q.status = 'submitted') AS quote_count
    FROM rfqs r LEFT JOIN users u ON u.id = r.created_by WHERE 1=1`;
  const params = [];

  if (req.user.role === "vendor") {
    params.push(req.user.vendor_id);
    sql += ` AND r.id IN (SELECT rfq_id FROM rfq_vendors WHERE vendor_id = $${params.length})`;
  }
  if (status) {
    params.push(status);
    sql += ` AND r.status = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    sql += ` AND r.title ILIKE $${params.length}`;
  }
  sql += ` ORDER BY r.created_at DESC`;
  const { rows } = await query(sql, params);
  return res.json({ rfqs: rows });
});

router.get("/:id", authRequired, async (req, res) => {
  const rfq = await getRfqDetail(req.params.id);
  if (!rfq) return res.status(404).json({ error: "RFQ not found" });
  if (req.user.role === "vendor" && !rfq.vendors.some((v) => v.id === req.user.vendor_id)) {
    return res.status(403).json({ error: "Not invited to this RFQ" });
  }
  return res.json({ rfq });
});

router.post(
  "/",
  authRequired,
  requireRoles("admin", "procurement_officer"),
  [
    body("title").trim().isLength({ min: 1, max: 255 }),
    body("description").optional().trim(),
    body("deadline").isISO8601().withMessage("Invalid deadline date"),
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("items.*.productName").trim().isLength({ min: 1 }),
    body("items.*.quantity").isFloat({ min: 0.01 }),
    body("vendorIds").isArray({ min: 1 }).withMessage("Assign at least one vendor"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { title, description, deadline, items, vendorIds, publish } = req.body;
    const client = await (await import("../db.js")).getPool().connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO rfqs (title, description, deadline, status, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [title.trim(), description || "", deadline.slice(0, 10), publish ? "published" : "draft", req.userId],
      );
      const rfqId = rows[0].id;
      for (const item of items) {
        await client.query(
          `INSERT INTO rfq_items (rfq_id, product_name, description, quantity, unit)
           VALUES ($1, $2, $3, $4, $5)`,
          [rfqId, item.productName, item.description || "", item.quantity, item.unit || "units"],
        );
      }
      for (const vid of vendorIds) {
        await client.query(`INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2)`, [rfqId, vid]);
      }
      await client.query("COMMIT");
      await logActivity(req.userId, "rfq", rfqId, publish ? "published" : "created", { title });
      if (publish) {
        await notifyRole("vendor", "New RFQ", `RFQ "${title}" has been published`, "rfq", "rfq", rfqId);
        const vendorUsers = await query(
          `SELECT u.id, u.email, v.name AS vendor_name, v.email AS vendor_email
           FROM users u JOIN vendors v ON v.id = u.vendor_id WHERE u.vendor_id = ANY($1::int[])`,
          [vendorIds],
        );
        const rfqData = { title, deadline: deadline.slice(0, 10) };
        for (const vu of vendorUsers.rows) {
          await notifyUser(vu.id, "New RFQ Invitation", `You are invited to quote for "${title}"`, "rfq", "rfq", rfqId);
          await sendRfqInvitation(vu.vendor_email || vu.email, rfqData, vu.vendor_name);
        }
      }
      const rfq = await getRfqDetail(rfqId);
      return res.status(201).json({ rfq });
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(e);
      return res.status(500).json({ error: "Failed to create RFQ" });
    } finally {
      client.release();
    }
  },
);

router.post("/:id/publish", authRequired, requireRoles("admin", "procurement_officer"), async (req, res) => {
  const { rows } = await query(
    `UPDATE rfqs SET status = 'published', updated_at = NOW() WHERE id = $1 AND status = 'draft' RETURNING *`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "RFQ not found or already published" });
  const vendors = await query(`SELECT vendor_id FROM rfq_vendors WHERE rfq_id = $1`, [req.params.id]);
  const vendorUsers = await query(
    `SELECT u.id, u.email, v.name AS vendor_name, v.email AS vendor_email
     FROM users u JOIN vendors v ON v.id = u.vendor_id WHERE u.vendor_id = ANY($1::int[])`,
    [vendors.rows.map((v) => v.vendor_id)],
  );
  for (const u of vendorUsers.rows) {
    await notifyUser(u.id, "New RFQ Invitation", `RFQ "${rows[0].title}" is now open for quotations`, "rfq", "rfq", rows[0].id);
    await sendRfqInvitation(u.vendor_email || u.email, rows[0], u.vendor_name);
  }
  await logActivity(req.userId, "rfq", rows[0].id, "published");
  return res.json({ rfq: rows[0] });
});

router.post(
  "/:id/attachments",
  authRequired,
  requireRoles("admin", "procurement_officer"),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { rows } = await query(
      `INSERT INTO rfq_attachments (rfq_id, filename, filepath) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.file.originalname, `/uploads/${req.file.filename}`],
    );
    return res.status(201).json({ attachment: rows[0] });
  },
);

router.post("/:id/submit-for-approval", authRequired, requireRoles("admin", "procurement_officer"), async (req, res) => {
  const { quotationId } = req.body;
  if (!quotationId) return res.status(400).json({ error: "quotationId required" });
  const rfq = await getRfqDetail(req.params.id);
  if (!rfq) return res.status(404).json({ error: "RFQ not found" });
  const quote = rfq.quotations.find((q) => q.id === Number(quotationId) && q.status === "submitted");
  if (!quote) return res.status(400).json({ error: "Invalid quotation selection" });

  await query(`UPDATE quotations SET status = 'selected' WHERE id = $1`, [quotationId]);
  await query(`UPDATE quotations SET status = 'rejected' WHERE rfq_id = $1 AND id != $2 AND status = 'submitted'`, [req.params.id, quotationId]);
  const { rows } = await query(
    `INSERT INTO approvals (rfq_id, quotation_id, status) VALUES ($1, $2, 'pending') RETURNING *`,
    [req.params.id, quotationId],
  );
  await query(
    `INSERT INTO approval_timeline (approval_id, action, remarks, actor_id) VALUES ($1, 'submitted', 'Submitted for approval', $2)`,
    [rows[0].id, req.userId],
  );
  await query(`UPDATE rfqs SET status = 'pending_approval', selected_quotation_id = $1, updated_at = NOW() WHERE id = $2`, [quotationId, req.params.id]);
  await notifyRole("manager", "Approval Required", `RFQ "${rfq.title}" needs your approval`, "approval", "approval", rows[0].id);
  await logActivity(req.userId, "approval", rows[0].id, "submitted", { rfqId: req.params.id });
  return res.status(201).json({ approval: rows[0] });
});

export default router;
