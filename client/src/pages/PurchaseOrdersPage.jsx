import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, EmptyState, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function PurchaseOrdersPage() {
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [approvedRfqs, setApprovedRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [genRfq, setGenRfq] = useState("");
  const [taxRate, setTaxRate] = useState(18);

  async function load() {
    setLoading(true);
    try {
      const [po, rfqs] = await Promise.all([
        api("/api/purchase-orders"),
        hasRole("admin", "procurement_officer") ? api("/api/rfqs?status=approved") : Promise.resolve({ rfqs: [] }),
      ]);
      setOrders(po.purchaseOrders);
      setApprovedRfqs(rfqs.rfqs || []);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function generatePo() {
    setErr("");
    try {
      await api("/api/purchase-orders/generate", {
        method: "POST",
        body: JSON.stringify({ rfqId: Number(genRfq), taxRate: Number(taxRate) }),
      });
      setMsg("Purchase order generated");
      setGenRfq("");
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Official procurement documents from approved quotations" />
      <ErrorBanner message={err} />
      <SuccessBanner message={msg} />

      {hasRole("admin", "procurement_officer") && approvedRfqs.length > 0 && (
        <div className="card mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Approved RFQ</label>
            <select className="input-field min-w-[240px]" value={genRfq} onChange={(e) => setGenRfq(e.target.value)}>
              <option value="">Select RFQ...</option>
              {approvedRfqs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">GST %</label>
            <input className="input-field w-24" type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
          <button type="button" className="btn-primary" disabled={!genRfq} onClick={generatePo}>Generate PO</button>
        </div>
      )}

      {loading ? <LoadingState /> : orders.length === 0 ? (
        <EmptyState title="No purchase orders" description="Generate POs from approved RFQs." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>PO Number</th><th>RFQ</th><th>Vendor</th><th>Subtotal</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td className="font-mono font-medium">{po.po_number}</td>
                  <td>{po.rfq_title}</td>
                  <td>{po.vendor_name}</td>
                  <td>{formatCurrency(po.subtotal)}</td>
                  <td>{formatCurrency(po.total_amount)}</td>
                  <td>{formatDate(po.created_at)}</td>
                  <td><StatusBadge status={po.status} /></td>
                  <td><Link to={`/purchase-orders/${po.id}`} className="text-sm text-brand hover:underline">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
