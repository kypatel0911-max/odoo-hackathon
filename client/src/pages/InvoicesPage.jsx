import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, EmptyState, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [pos, setPos] = useState([]);
  const [poId, setPoId] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [inv, po] = await Promise.all([
        api("/api/invoices"),
        api("/api/purchase-orders"),
      ]);
      setInvoices(inv.invoices);
      const withoutInv = po.purchaseOrders.filter((p) => !inv.invoices.some((i) => i.po_id === p.id));
      setPos(withoutInv);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setErr("");
    try {
      const data = await api("/api/invoices/generate", { method: "POST", body: JSON.stringify({ poId: Number(poId) }) });
      setMsg(`Invoice ${data.invoice.invoice_number} generated`);
      setPoId("");
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Generate, print, and email procurement invoices" />
      <ErrorBanner message={err} />
      <SuccessBanner message={msg} />

      {pos.length > 0 && (
        <div className="card mb-6 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Purchase Order</label>
            <select className="input-field min-w-[240px]" value={poId} onChange={(e) => setPoId(e.target.value)}>
              <option value="">Select PO...</option>
              {pos.map((p) => <option key={p.id} value={p.id}>{p.po_number} — {p.vendor_name}</option>)}
            </select>
          </div>
          <button type="button" className="btn-primary" disabled={!poId} onClick={generate}>Generate Invoice</button>
        </div>
      )}

      {loading ? <LoadingState /> : invoices.length === 0 ? (
        <EmptyState title="No invoices" description="Generate invoices from purchase orders." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Invoice #</th><th>PO #</th><th>Vendor</th><th>Total</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono font-medium">{inv.invoice_number}</td>
                  <td>{inv.po_number}</td>
                  <td>{inv.vendor_name}</td>
                  <td>{formatCurrency(inv.total_amount)}</td>
                  <td>{formatDate(inv.created_at)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td><Link to={`/invoices/${inv.id}`} className="text-sm text-brand hover:underline">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
