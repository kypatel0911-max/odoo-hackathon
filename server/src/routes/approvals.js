import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";
import { logActivity, notifyUser } from "../utils/activity.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const { status } = req.query;
  let sql = `SELECT a.*, r.title AS rfq_title, v.name AS vendor_name, q.total_price, q.delivery_days,
    u.name AS approver_name
    FROM approvals a
    JOIN rfqs r ON r.id = a.rfq_id
    JOIN quotations q ON q.id = a.quotation_id
    JOIN vendors v ON v.id = q.vendor_id
    LEFT JOIN users u ON u.id = a.approver_id WHERE 1=1`;
  const params = [];
  if (status) {
    params.push(status);
    sql += ` AND a.status = $${params.length}`;
  }
  if (req.user.role === "procurement_officer") {
    sql += ` AND r.created_by = ${req.userId}`;
  }
  sql += ` ORDER BY a.created_at DESC`;
  const { rows } = await query(sql, params);
  return res.json({ approvals: rows });
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, r.title AS rfq_title, r.description AS rfq_description,
      v.name AS vendor_name, q.total_price, q.delivery_days, q.notes
     FROM approvals a
     JOIN rfqs r ON r.id = a.rfq_id
     JOIN quotations q ON q.id = a.quotation_id
     JOIN vendors v ON v.id = q.vendor_id
     WHERE a.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Approval not found" });
  const { rows: timeline } = await query(
    `SELECT t.*, u.name AS actor_name FROM approval_timeline t
     LEFT JOIN users u ON u.id = t.actor_id WHERE t.approval_id = $1 ORDER BY t.created_at ASC`,
    [req.params.id],
  );
  return res.json({ approval: rows[0], timeline });
});

router.post(
  "/:id/decide",
  authRequired,
  requireRoles("admin", "manager"),
  [
    body("decision").isIn(["approved", "rejected"]),
    body("remarks").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { decision, remarks } = req.body;

    const { rows: existing } = await query(`SELECT * FROM approvals WHERE id = $1`, [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: "Approval not found" });
    if (existing[0].status !== "pending") return res.status(400).json({ error: "Already decided" });

    const { rows } = await query(
      `UPDATE approvals SET status = $1, approver_id = $2, remarks = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [decision, req.userId, remarks || "", req.params.id],
    );
    await query(
      `INSERT INTO approval_timeline (approval_id, action, remarks, actor_id) VALUES ($1, $2, $3, $4)`,
      [req.params.id, decision, remarks || "", req.userId],
    );

    const rfqStatus = decision === "approved" ? "approved" : "rejected";
    await query(`UPDATE rfqs SET status = $1, updated_at = NOW() WHERE id = $2`, [rfqStatus, rows[0].rfq_id]);

    const rfq = await query(`SELECT created_by, title FROM rfqs WHERE id = $1`, [rows[0].rfq_id]);
    if (rfq.rows[0]?.created_by) {
      await notifyUser(
        rfq.rows[0].created_by,
        `RFQ ${decision}`,
        `RFQ "${rfq.rows[0].title}" was ${decision}`,
        "approval",
        "approval",
        rows[0].id,
      );
    }
    await logActivity(req.userId, "approval", rows[0].id, decision, { remarks });
    return res.json({ approval: rows[0] });
  },
);

export default router;
