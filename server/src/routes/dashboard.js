import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { query } from "../db.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  const role = req.user.role;
  let stats = {};

  if (role !== "vendor") {
    const pending = await query(`SELECT COUNT(*)::int AS c FROM approvals WHERE status = 'pending'`);
    const rfqs = await query(`SELECT COUNT(*)::int AS c FROM rfqs WHERE status IN ('published', 'closed')`);
    const pos = await query(`SELECT COUNT(*)::int AS c FROM purchase_orders WHERE created_at > NOW() - INTERVAL '30 days'`);
    const invoices = await query(`SELECT COUNT(*)::int AS c FROM invoices WHERE created_at > NOW() - INTERVAL '30 days'`);
    const spend = await query(`SELECT COALESCE(SUM(total_amount), 0)::float AS total FROM invoices WHERE status != 'cancelled'`);
    const vendors = await query(`SELECT COUNT(*)::int AS c FROM vendors WHERE status = 'active'`);

    stats = {
      pendingApprovals: pending.rows[0].c,
      activeRfqs: rfqs.rows[0].c,
      recentPos: pos.rows[0].c,
      recentInvoices: invoices.rows[0].c,
      totalSpend: spend.rows[0].total,
      activeVendors: vendors.rows[0].c,
    };
  } else {
    const rfqs = await query(
      `SELECT COUNT(*)::int AS c FROM rfq_vendors rv
       JOIN rfqs r ON r.id = rv.rfq_id WHERE rv.vendor_id = $1 AND r.status IN ('published', 'closed')`,
      [req.user.vendor_id],
    );
    const quotes = await query(
      `SELECT COUNT(*)::int AS c FROM quotations WHERE vendor_id = $1 AND status = 'submitted'`,
      [req.user.vendor_id],
    );
    const pos = await query(
      `SELECT COUNT(*)::int AS c FROM purchase_orders WHERE vendor_id = $1`,
      [req.user.vendor_id],
    );
    stats = { invitedRfqs: rfqs.rows[0].c, submittedQuotes: quotes.rows[0].c, purchaseOrders: pos.rows[0].c };
  }

  let recentPos = { rows: [] };
  let recentInvoices = { rows: [] };
  let pendingApprovals = { rows: [] };
  let activeRfqs = { rows: [] };

  if (role === "vendor") {
    recentPos = await query(
      `SELECT po.*, v.name AS vendor_name FROM purchase_orders po
       JOIN vendors v ON v.id = po.vendor_id
       WHERE po.vendor_id = $1 ORDER BY po.created_at DESC LIMIT 5`,
      [req.user.vendor_id],
    );
  } else if (role === "manager") {
    pendingApprovals = await query(
      `SELECT a.*, r.title AS rfq_title, v.name AS vendor_name, q.total_price
       FROM approvals a
       JOIN rfqs r ON r.id = a.rfq_id
       JOIN quotations q ON q.id = a.quotation_id
       JOIN vendors v ON v.id = q.vendor_id
       WHERE a.status = 'pending' ORDER BY a.created_at DESC LIMIT 5`,
    );
  } else {
    pendingApprovals = await query(
      `SELECT a.*, r.title AS rfq_title, v.name AS vendor_name, q.total_price
       FROM approvals a JOIN rfqs r ON r.id = a.rfq_id
       JOIN quotations q ON q.id = a.quotation_id JOIN vendors v ON v.id = q.vendor_id
       WHERE a.status = 'pending' ORDER BY a.created_at DESC LIMIT 5`,
    );
    recentPos = await query(
      `SELECT po.*, v.name AS vendor_name FROM purchase_orders po
       JOIN vendors v ON v.id = po.vendor_id ORDER BY po.created_at DESC LIMIT 5`,
    );
    recentInvoices = await query(
      `SELECT i.*, v.name AS vendor_name FROM invoices i
       JOIN vendors v ON v.id = i.vendor_id ORDER BY i.created_at DESC LIMIT 5`,
    );
    activeRfqs = await query(
      `SELECT r.*, u.name AS created_by_name,
        (SELECT COUNT(*)::int FROM quotations q WHERE q.rfq_id = r.id AND q.status = 'submitted') AS quote_count
       FROM rfqs r LEFT JOIN users u ON u.id = r.created_by
       WHERE r.status IN ('published', 'closed', 'pending_approval')
       ORDER BY r.created_at DESC LIMIT 5`,
    );
  }

  return res.json({
    stats,
    pendingApprovals: pendingApprovals.rows,
    activeRfqs: activeRfqs.rows,
    recentPos: recentPos.rows,
    recentInvoices: recentInvoices.rows,
  });
});

export default router;
