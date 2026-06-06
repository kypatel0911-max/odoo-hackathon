import { useEffect, useState } from "react";
import { api, apiUrl, getToken, formatCurrency } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { LoadingState } from "../components/ui/Feedback.jsx";
import { SpendTrendChart, ApprovalTrendChart, VendorPerformanceChart } from "../components/ui/Charts.jsx";

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/reports/overview").then(setData).finally(() => setLoading(false));
  }, []);

  async function exportCsv() {
    const headers = { Authorization: `Bearer ${getToken()}` };
    const res = await fetch(apiUrl("/api/reports/export/vendors"), { headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor-performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState />;
  const { stats, monthlyTrends, vendorPerformance, spendingByCategory, rfqStatusBreakdown, approvalTrends } = data;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Procurement insights, vendor performance, and spending trends"
        actions={<button type="button" className="btn-secondary" onClick={exportCsv}>Export Vendor CSV</button>}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total RFQs" value={stats.total_rfqs} icon="📋" />
        <StatCard label="Approved RFQs" value={stats.approved_rfqs} icon="✅" />
        <StatCard label="Active Vendors" value={stats.active_vendors} icon="🏢" />
        <StatCard label="Purchase Orders" value={stats.total_pos} icon="📦" />
        <StatCard label="Total Spend" value={formatCurrency(stats.total_spend)} icon="💳" />
        <StatCard label="Avg Invoice" value={formatCurrency(stats.avg_invoice)} icon="🧾" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold text-white">Monthly Spend</h2>
          <SpendTrendChart data={monthlyTrends} />
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold text-white">Approval Trends</h2>
          <ApprovalTrendChart data={approvalTrends} />
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold text-white">RFQ Status Breakdown</h2>
          <div className="space-y-2">
            {rfqStatusBreakdown?.map((s) => (
              <div key={s.status} className="flex items-center justify-between rounded-lg bg-surface-900/50 px-3 py-2 text-sm">
                <span className="capitalize text-slate-300">{s.status.replace(/_/g, " ")}</span>
                <span className="font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-semibold text-white">Vendor Performance</h2>
          <VendorPerformanceChart data={vendorPerformance} />
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold text-white">Top Vendors (Table)</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Vendor</th><th>Quotes</th><th>POs</th><th>Value</th><th>Rating</th></tr></thead>
              <tbody>
                {vendorPerformance?.map((v) => (
                  <tr key={v.id}>
                    <td><p>{v.name}</p><p className="text-xs text-slate-500">{v.category}</p></td>
                    <td>{v.quotations}</td>
                    <td>{v.purchase_orders}</td>
                    <td>{formatCurrency(v.total_value)}</td>
                    <td>{Number(v.rating).toFixed(1)} ★</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 font-semibold text-white">Spending by Category</h2>
          <div className="space-y-2">
            {spendingByCategory?.map((c) => (
              <div key={c.category} className="flex justify-between rounded-lg bg-surface-900/50 px-3 py-2 text-sm">
                <span>{c.category}</span>
                <span>{formatCurrency(c.spend)} <span className="text-slate-500">({c.po_count} POs)</span></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
