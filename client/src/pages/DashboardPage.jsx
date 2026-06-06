import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatCard } from "../components/ui/StatCard.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { LoadingState } from "../components/ui/Feedback.jsx";

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/dashboard")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  const { stats, pendingApprovals, activeRfqs, recentPos, recentInvoices } = data;

  const isVendor = user.role === "vendor";

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        subtitle="Monitor procurement activities and take quick actions"
        actions={
          hasRole("admin", "procurement_officer") && (
            <>
              <Link to="/rfqs/new" className="btn-primary">+ Create RFQ</Link>
              <Link to="/vendors" className="btn-secondary">Manage Vendors</Link>
            </>
          )
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isVendor ? (
          <>
            <StatCard label="Invited RFQs" value={stats.invitedRfqs} icon="📋" />
            <StatCard label="Submitted Quotes" value={stats.submittedQuotes} icon="💰" />
            <StatCard label="Purchase Orders" value={stats.purchaseOrders} icon="📦" />
          </>
        ) : (
          <>
            <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon="⏳" sub="Awaiting decision" />
            <StatCard label="Active RFQs" value={stats.activeRfqs} icon="📋" />
            <StatCard label="Recent POs (30d)" value={stats.recentPos} icon="📦" />
            <StatCard label="Recent Invoices (30d)" value={stats.recentInvoices} icon="🧾" />
            {stats.totalSpend !== undefined && (
              <StatCard label="Total Spend" value={formatCurrency(stats.totalSpend)} icon="💳" />
            )}
            {stats.activeVendors !== undefined && (
              <StatCard label="Active Vendors" value={stats.activeVendors} icon="🏢" />
            )}
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!isVendor && pendingApprovals?.length > 0 && (
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Pending Approvals</h2>
              <Link to="/approvals" className="text-xs text-brand hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {pendingApprovals.map((a) => (
                <Link
                  key={a.id}
                  to={`/approvals/${a.id}`}
                  className="block rounded-lg border border-surface-700 bg-surface-900/50 p-3 transition hover:border-brand/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-200">{a.rfq_title}</p>
                      <p className="text-xs text-slate-500">{a.vendor_name} · {formatCurrency(a.total_price)}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!isVendor && activeRfqs?.length > 0 && (
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Active RFQs</h2>
              <Link to="/rfqs" className="text-xs text-brand hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {activeRfqs.map((r) => (
                <Link
                  key={r.id}
                  to={`/rfqs/${r.id}`}
                  className="block rounded-lg border border-surface-700 bg-surface-900/50 p-3 transition hover:border-brand/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-200">{r.title}</p>
                      <p className="text-xs text-slate-500">Deadline {formatDate(r.deadline)} · {r.quote_count} quotes</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recentPos?.length > 0 && (
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Purchase Orders</h2>
              <Link to="/purchase-orders" className="text-xs text-brand hover:underline">View all</Link>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentPos.map((po) => (
                    <tr key={po.id}>
                      <td><Link to={`/purchase-orders/${po.id}`} className="text-brand hover:underline">{po.po_number}</Link></td>
                      <td>{po.vendor_name}</td>
                      <td>{formatCurrency(po.total_amount)}</td>
                      <td><StatusBadge status={po.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!isVendor && recentInvoices?.length > 0 && (
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Invoices</h2>
              <Link to="/invoices" className="text-xs text-brand hover:underline">View all</Link>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Invoice #</th><th>Vendor</th><th>Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><Link to={`/invoices/${inv.id}`} className="text-brand hover:underline">{inv.invoice_number}</Link></td>
                      <td>{inv.vendor_name}</td>
                      <td>{formatCurrency(inv.total_amount)}</td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
