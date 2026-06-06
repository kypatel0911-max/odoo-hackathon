import { Router } from "express";
import { body, validationResult } from "express-validator";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";
import { logActivity, notifyRole } from "../utils/activity.js";
import { recommendVendor } from "../utils/recommendation.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const { rfqId } = req.query;
  let sql = `SELECT q.*, v.name AS vendor_name, v.rating AS vendor_rating, r.title AS rfq_title
    FROM quotations q
    JOIN vendors v ON v.id = q.vendor_id
    JOIN rfqs r ON r.id = q.rfq_id WHERE 1=1`;
  const params = [];
  if (req.user.role === "vendor") {
    params.push(req.user.vendor_id);
    sql += ` AND q.vendor_id = $${params.length}`;
  }
  if (rfqId) {
    params.push(rfqId);
    sql += ` AND q.rfq_id = $${params.length}`;
  }
  sql += ` ORDER BY q.created_at DESC`;
  const { rows } = await query(sql, params);
  return res.json({ quotations: rows });
});

router.get("/compare/:rfqId", authRequired, requireRoles("admin", "procurement_officer", "manager"), async (req, res) => {
  const { rows: rfqRows } = await query(`SELECT * FROM rfqs WHERE id = $1`, [req.params.rfqId]);
  if (!rfqRows[0]) return res.status(404).json({ error: "RFQ not found" });

  const { rows: items } = await query(`SELECT * FROM rfq_items WHERE rfq_id = $1`, [req.params.rfqId]);
  const { rows: quotes } = await query(
    `SELECT q.*, v.name AS vendor_name, v.rating AS vendor_rating, v.category AS vendor_category
     FROM quotations q JOIN vendors v ON v.id = q.vendor_id
     WHERE q.rfq_id = $1 AND q.status IN ('submitted', 'selected', 'rejected')
     ORDER BY q.total_price ASC`,
    [req.params.rfqId],
  );

  for (const q of quotes) {
    const { rows: qItems } = await query(
      `SELECT qi.*, ri.product_name, ri.quantity, ri.unit
       FROM quotation_items qi JOIN rfq_items ri ON ri.id = qi.rfq_item_id
       WHERE qi.quotation_id = $1`,
      [q.id],
    );
    q.items = qItems;
  }

  const lowestPrice = quotes.length ? Math.min(...quotes.map((q) => Number(q.total_price))) : null;
  const fastestDelivery = quotes.length ? Math.min(...quotes.map((q) => q.delivery_days)) : null;
  const aiRecommendation = recommendVendor(quotes);

  return res.json({
    rfq: rfqRows[0],
    items,
    quotations: quotes.map((q) => ({
      ...q,
      isLowestPrice: Number(q.total_price) === lowestPrice,
      isFastestDelivery: q.delivery_days === fastestDelivery,
      isAiRecommended: aiRecommendation?.recommended?.quotationId === q.id,
    })),
    lowestPrice,
    fastestDelivery,
    aiRecommendation,
  });
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT q.*, v.name AS vendor_name, r.title AS rfq_title FROM quotations q
     JOIN vendors v ON v.id = q.vendor_id JOIN rfqs r ON r.id = q.rfq_id WHERE q.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Quotation not found" });
  if (req.user.role === "vendor" && rows[0].vendor_id !== req.user.vendor_id) {
    return res.status(403).json({ error: "Access denied" });
  }
  const { rows: items } = await query(
    `SELECT qi.*, ri.product_name, ri.description, ri.quantity, ri.unit
     FROM quotation_items qi JOIN rfq_items ri ON ri.id = qi.rfq_item_id WHERE qi.quotation_id = $1`,
    [req.params.id],
  );
  return res.json({ quotation: { ...rows[0], items } });
});

router.post(
  "/",
  authRequired,
  requireRoles("vendor"),
  [
    body("rfqId").isInt(),
    body("deliveryDays").isInt({ min: 0 }),
    body("notes").optional().trim(),
    body("items").isArray({ min: 1 }),
    body("items.*.rfqItemId").isInt(),
    body("items.*.unitPrice").isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
    const { rfqId, deliveryDays, notes, items, submit } = req.body;

    const invited = await query(
      `SELECT 1 FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2`,
      [rfqId, req.user.vendor_id],
    );
    if (!invited.rows[0]) return res.status(403).json({ error: "Not invited to this RFQ" });

    const rfqCheck = await query(`SELECT status FROM rfqs WHERE id = $1`, [rfqId]);
    if (!rfqCheck.rows[0] || !["published", "closed"].includes(rfqCheck.rows[0].status)) {
      return res.status(400).json({ error: "RFQ is not open for quotations" });
    }

    let totalPrice = 0;
    const lineItems = [];
    for (const item of items) {
      const { rows: rfqItem } = await query(`SELECT quantity FROM rfq_items WHERE id = $1 AND rfq_id = $2`, [item.rfqItemId, rfqId]);
      if (!rfqItem[0]) return res.status(400).json({ error: "Invalid RFQ item" });
      const lineTotal = Math.round(Number(item.unitPrice) * Number(rfqItem[0].quantity) * 100) / 100;
      totalPrice += lineTotal;
      lineItems.push({ rfqItemId: item.rfqItemId, unitPrice: item.unitPrice, totalPrice: lineTotal });
    }

    const client = await (await import("../db.js")).getPool().connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT id FROM quotations WHERE rfq_id = $1 AND vendor_id = $2`,
        [rfqId, req.user.vendor_id],
      );
      let quotationId;
      const status = submit ? "submitted" : "draft";
      if (existing.rows[0]) {
        quotationId = existing.rows[0].id;
        await client.query(
          `UPDATE quotations SET delivery_days = $1, notes = $2, total_price = $3, unit_price = $4, status = $5, updated_at = NOW()
           WHERE id = $6`,
          [deliveryDays, notes || "", totalPrice, lineItems[0]?.unitPrice || 0, status, quotationId],
        );
        await client.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [quotationId]);
      } else {
        const { rows: qr } = await client.query(
          `INSERT INTO quotations (rfq_id, vendor_id, unit_price, total_price, delivery_days, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [rfqId, req.user.vendor_id, lineItems[0]?.unitPrice || 0, totalPrice, deliveryDays, notes || "", status],
        );
        quotationId = qr[0].id;
      }
      for (const li of lineItems) {
        await client.query(
          `INSERT INTO quotation_items (quotation_id, rfq_item_id, unit_price, total_price) VALUES ($1, $2, $3, $4)`,
          [quotationId, li.rfqItemId, li.unitPrice, li.totalPrice],
        );
      }
      await client.query("COMMIT");
      if (submit) {
        await logActivity(req.userId, "quotation", quotationId, "submitted", { rfqId });
        await notifyRole("procurement_officer", "Quotation Received", "A vendor submitted a new quotation", "quotation", "quotation", quotationId);
      }
      const { rows } = await query(`SELECT * FROM quotations WHERE id = $1`, [quotationId]);
      return res.status(201).json({ quotation: rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(e);
      return res.status(500).json({ error: "Failed to save quotation" });
    } finally {
      client.release();
    }
  },
);

export default router;
