import { Router } from "express";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";
import { logActivity, notifyUser } from "../utils/activity.js";
import { nextNumber, calcTax } from "../utils/numbers.js";
import { sendPoNotification } from "../utils/email.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  let sql = `SELECT po.*, v.name AS vendor_name, r.title AS rfq_title, u.name AS created_by_name
    FROM purchase_orders po
    JOIN vendors v ON v.id = po.vendor_id
    JOIN rfqs r ON r.id = po.rfq_id
    LEFT JOIN users u ON u.id = po.created_by WHERE 1=1`;
  const params = [];
  if (req.user.role === "vendor") {
    params.push(req.user.vendor_id);
    sql += ` AND po.vendor_id = $${params.length}`;
  }
  sql += ` ORDER BY po.created_at DESC`;
  const { rows } = await query(sql, params);
  return res.json({ purchaseOrders: rows });
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT po.*, v.name AS vendor_name, v.email AS vendor_email, v.gst_number, r.title AS rfq_title
     FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id JOIN rfqs r ON r.id = po.rfq_id
     WHERE po.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "PO not found" });
  if (req.user.role === "vendor" && rows[0].vendor_id !== req.user.vendor_id) {
    return res.status(403).json({ error: "Access denied" });
  }
  const { rows: items } = await query(`SELECT * FROM po_items WHERE po_id = $1`, [req.params.id]);
  return res.json({ purchaseOrder: { ...rows[0], items } });
});

router.post("/generate", authRequired, requireRoles("admin", "procurement_officer"), async (req, res) => {
  const { rfqId, taxRate = 18 } = req.body;
  if (!rfqId) return res.status(400).json({ error: "rfqId required" });

  const { rows: rfqRows } = await query(`SELECT * FROM rfqs WHERE id = $1 AND status = 'approved'`, [rfqId]);
  if (!rfqRows[0]) return res.status(400).json({ error: "RFQ not approved or not found" });

  const quotationId = rfqRows[0].selected_quotation_id;
  const { rows: quoteRows } = await query(`SELECT * FROM quotations WHERE id = $1`, [quotationId]);
  if (!quoteRows[0]) return res.status(400).json({ error: "Selected quotation not found" });

  const existing = await query(`SELECT id FROM purchase_orders WHERE rfq_id = $1`, [rfqId]);
  if (existing.rows[0]) return res.status(409).json({ error: "PO already exists for this RFQ" });

  const { rows: qItems } = await query(
    `SELECT qi.*, ri.product_name, ri.quantity, ri.unit
     FROM quotation_items qi JOIN rfq_items ri ON ri.id = qi.rfq_item_id WHERE qi.quotation_id = $1`,
    [quotationId],
  );

  const subtotal = Number(quoteRows[0].total_price);
  const { tax, total } = calcTax(subtotal, taxRate);
  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS c FROM purchase_orders`);
  const poNumber = nextNumber("PO", countRows[0].c + 1);

  const client = await (await import("../db.js")).getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows: poRows } = await client.query(
      `INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, vendor_id, subtotal, tax_rate, tax_amount, total_amount, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [poNumber, rfqId, quotationId, quoteRows[0].vendor_id, subtotal, taxRate, tax, total, req.userId],
    );
    const poId = poRows[0].id;
    for (const item of qItems) {
      await client.query(
        `INSERT INTO po_items (po_id, product_name, quantity, unit, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [poId, item.product_name, item.quantity, item.unit, item.unit_price, item.total_price],
      );
    }
    await client.query(`UPDATE rfqs SET status = 'po_generated', updated_at = NOW() WHERE id = $1`, [rfqId]);
    await client.query("COMMIT");

    const vendorInfo = await query(
      `SELECT u.id, v.name AS vendor_name, v.email AS vendor_email FROM users u
       JOIN vendors v ON v.id = u.vendor_id WHERE u.vendor_id = $1`,
      [quoteRows[0].vendor_id],
    );
    for (const u of vendorInfo.rows) {
      await notifyUser(u.id, "Purchase Order Issued", `PO ${poNumber} has been issued`, "po", "purchase_order", poId);
      await sendPoNotification(u.vendor_email, { po_number: poNumber, total_amount: total }, u.vendor_name);
    }
    await logActivity(req.userId, "purchase_order", poId, "generated", { poNumber });

    const { rows: items } = await query(`SELECT * FROM po_items WHERE po_id = $1`, [poId]);
    return res.status(201).json({ purchaseOrder: { ...poRows[0], items } });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return res.status(500).json({ error: "Failed to generate PO" });
  } finally {
    client.release();
  }
});

export default router;
