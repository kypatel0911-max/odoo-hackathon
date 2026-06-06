import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState } from "../components/ui/Feedback.jsx";

export default function PoDetailPage() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(`/api/purchase-orders/${id}`)
      .then((d) => setPo(d.purchaseOrder))
      .catch((ex) => setErr(ex.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (!po) return <ErrorBanner message={err || "Not found"} />;

  return (
    <div>
      <PageHeader title={po.po_number} subtitle={`RFQ: ${po.rfq_title}`} actions={<StatusBadge status={po.status} />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-xs text-slate-500">Vendor</p>
          <p className="font-medium">{po.vendor_name}</p>
          <p className="text-sm text-slate-400">{po.vendor_email}</p>
          {po.gst_number && <p className="text-xs text-slate-500">GST: {po.gst_number}</p>}
        </div>
        <div className="card">
          <p className="text-xs text-slate-500">Issued</p>
          <p>{formatDate(po.created_at)}</p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(po.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax ({po.tax_rate}%)</span><span>{formatCurrency(po.tax_amount)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(po.total_amount)}</span></div>
          </div>
        </div>
      </div>

      <div className="table-wrap mb-6">
        <table className="data-table">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            {po.items?.map((it) => (
              <tr key={it.id}>
                <td>{it.product_name}</td>
                <td>{it.quantity} {it.unit}</td>
                <td>{formatCurrency(it.unit_price)}</td>
                <td>{formatCurrency(it.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/invoices" className="btn-primary">Generate Invoice →</Link>
    </div>
  );
}
