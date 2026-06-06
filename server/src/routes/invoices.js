import { Router } from "express";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";
import { logActivity, notifyUser } from "../utils/activity.js";
import { nextNumber, calcTax } from "../utils/numbers.js";
import { generateInvoicePdf } from "../utils/pdf.js";
import { sendInvoiceEmail } from "../utils/email.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  let sql = `SELECT i.*, v.name AS vendor_name, po.po_number
    FROM invoices i JOIN vendors v ON v.id = i.vendor_id
    JOIN purchase_orders po ON po.id = i.po_id WHERE 1=1`;
  const params = [];
  if (req.user.role === "vendor") {
    params.push(req.user.vendor_id);
    sql += ` AND i.vendor_id = $${params.length}`;
  }
  sql += ` ORDER BY i.created_at DESC`;
  const { rows } = await query(sql, params);
  return res.json({ invoices: rows });
});

router.get("/:id", authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT i.*, v.name AS vendor_name, v.email AS vendor_email, v.gst_number, v.address,
      po.po_number, po.tax_rate
     FROM invoices i JOIN vendors v ON v.id = i.vendor_id JOIN purchase_orders po ON po.id = i.po_id
     WHERE i.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Invoice not found" });
  if (req.user.role === "vendor" && rows[0].vendor_id !== req.user.vendor_id) {
    return res.status(403).json({ error: "Access denied" });
  }
  const { rows: items } = await query(`SELECT * FROM po_items WHERE po_id = $1`, [rows[0].po_id]);
  return res.json({ invoice: { ...rows[0], items } });
});

router.post("/generate", authRequired, requireRoles("admin", "procurement_officer"), async (req, res) => {
  const { poId } = req.body;
  if (!poId) return res.status(400).json({ error: "poId required" });

  const { rows: poRows } = await query(`SELECT * FROM purchase_orders WHERE id = $1`, [poId]);
  if (!poRows[0]) return res.status(404).json({ error: "PO not found" });

  const existing = await query(`SELECT id FROM invoices WHERE po_id = $1`, [poId]);
  if (existing.rows[0]) return res.status(409).json({ error: "Invoice already exists for this PO" });

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS c FROM invoices`);
  const invoiceNumber = nextNumber("INV", countRows[0].c + 1);
  const po = poRows[0];

  const { rows } = await query(
    `INSERT INTO invoices (invoice_number, po_id, vendor_id, subtotal, tax_amount, total_amount, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [invoiceNumber, poId, po.vendor_id, po.subtotal, po.tax_amount, po.total_amount, req.userId],
  );

  await query(`UPDATE rfqs SET status = 'invoiced', updated_at = NOW() WHERE id = $1`, [po.rfq_id]);
  await logActivity(req.userId, "invoice", rows[0].id, "generated", { invoiceNumber });

  const { rows: items } = await query(`SELECT * FROM po_items WHERE po_id = $1`, [poId]);
  return res.status(201).json({ invoice: { ...rows[0], items } });
});

router.get("/:id/pdf", authRequired, async (req, res) => {
  const { rows } = await query(
    `SELECT i.*, po.po_number, po.id AS po_id FROM invoices i JOIN purchase_orders po ON po.id = i.po_id WHERE i.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Invoice not found" });
  if (req.user.role === "vendor" && rows[0].vendor_id !== req.user.vendor_id) {
    return res.status(403).json({ error: "Access denied" });
  }
  const { rows: vendorRows } = await query(`SELECT * FROM vendors WHERE id = $1`, [rows[0].vendor_id]);
  const { rows: items } = await query(`SELECT * FROM po_items WHERE po_id = $1`, [rows[0].po_id]);
  const pdf = await generateInvoicePdf(rows[0], { po_number: rows[0].po_number }, vendorRows[0], items);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${rows[0].invoice_number}.pdf"`);
  return res.send(pdf);
});

router.post("/:id/send-email", authRequired, requireRoles("admin", "procurement_officer"), async (req, res) => {
  const { rows } = await query(
    `SELECT i.*, po.po_number, po.id AS po_id, v.email AS vendor_email FROM invoices i
     JOIN purchase_orders po ON po.id = i.po_id JOIN vendors v ON v.id = i.vendor_id WHERE i.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Invoice not found" });
  const to = req.body.email || rows[0].vendor_email;
  const { rows: vendorRows } = await query(`SELECT * FROM vendors WHERE id = $1`, [rows[0].vendor_id]);
  const { rows: items } = await query(`SELECT * FROM po_items WHERE po_id = $1`, [rows[0].po_id]);
  const pdf = await generateInvoicePdf(rows[0], { po_number: rows[0].po_number }, vendorRows[0], items);
  const result = await sendInvoiceEmail(to, rows[0], pdf);
  await query(`UPDATE invoices SET status = 'sent' WHERE id = $1`, [req.params.id]);
  await logActivity(req.userId, "invoice", rows[0].id, "emailed", { to });
  return res.json({ message: "Invoice sent", ...result });
});

export default router;
