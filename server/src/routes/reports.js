import { Router } from "express";
import { authRequired, requireRoles } from "../middleware/auth.js";
import { query } from "../db.js";

const router = Router();

router.get("/overview", authRequired, requireRoles("admin", "procurement_officer", "manager"), async (_req, res) => {
  const stats = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM rfqs) AS total_rfqs,
      (SELECT COUNT(*)::int FROM rfqs WHERE status = 'approved') AS approved_rfqs,
      (SELECT COUNT(*)::int FROM vendors WHERE status = 'active') AS active_vendors,
      (SELECT COUNT(*)::int FROM purchase_orders) AS total_pos,
      (SELECT COALESCE(SUM(total_amount), 0)::float FROM invoices WHERE status != 'cancelled') AS total_spend,
      (SELECT COALESCE(AVG(total_amount), 0)::float FROM invoices WHERE status != 'cancelled') AS avg_invoice
  `);

  const monthly = await query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::float AS spend
    FROM invoices WHERE created_at > NOW() - INTERVAL '12 months' AND status != 'cancelled'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month ASC
  `);

  const vendorPerf = await query(`
    SELECT v.id, v.name, v.category, v.rating,
      COUNT(DISTINCT q.id)::int AS quotations,
      COUNT(DISTINCT po.id)::int AS purchase_orders,
      COALESCE(SUM(i.total_amount), 0)::float AS total_value
    FROM vendors v
    LEFT JOIN quotations q ON q.vendor_id = v.id AND q.status IN ('submitted', 'selected')
    LEFT JOIN purchase_orders po ON po.vendor_id = v.id
    LEFT JOIN invoices i ON i.vendor_id = v.id AND i.status != 'cancelled'
    GROUP BY v.id ORDER BY total_value DESC LIMIT 10
  `);

  const byCategory = await query(`
    SELECT v.category, COUNT(DISTINCT po.id)::int AS po_count, COALESCE(SUM(i.total_amount), 0)::float AS spend
    FROM vendors v
    LEFT JOIN purchase_orders po ON po.vendor_id = v.id
    LEFT JOIN invoices i ON i.vendor_id = v.id AND i.status != 'cancelled'
    GROUP BY v.category ORDER BY spend DESC
  `);

  const statusBreakdown = await query(`
    SELECT status, COUNT(*)::int AS count FROM rfqs GROUP BY status ORDER BY count DESC
  `);

  const approvalTrends = await query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
      COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
    FROM approvals WHERE created_at > NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month ASC
  `);

  return res.json({
    stats: stats.rows[0],
    monthlyTrends: monthly.rows,
    vendorPerformance: vendorPerf.rows,
    spendingByCategory: byCategory.rows,
    rfqStatusBreakdown: statusBreakdown.rows,
    approvalTrends: approvalTrends.rows,
  });
});

router.get("/export/vendors", authRequired, requireRoles("admin", "procurement_officer", "manager"), async (_req, res) => {
  const { rows } = await query(`
    SELECT v.name, v.category, v.email, v.gst_number, v.rating, v.status,
      COUNT(DISTINCT q.id)::int AS quotations,
      COALESCE(SUM(i.total_amount), 0)::float AS total_spend
    FROM vendors v
    LEFT JOIN quotations q ON q.vendor_id = v.id
    LEFT JOIN invoices i ON i.vendor_id = v.id
    GROUP BY v.id ORDER BY v.name
  `);
  const header = "Name,Category,Email,GST,Rating,Status,Quotations,Total Spend\n";
  const csv = rows.map((r) =>
    [r.name, r.category, r.email, r.gst_number, r.rating, r.status, r.quotations, r.total_spend]
      .map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","),
  ).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="vendor-performance.csv"');
  return res.send(header + csv);
});

export default router;
