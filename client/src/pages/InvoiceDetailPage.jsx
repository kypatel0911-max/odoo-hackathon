import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiUrl, getToken, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api(`/api/invoices/${id}`)
      .then((d) => {
        setInvoice(d.invoice);
        setEmail(d.invoice.vendor_email || "");
      })
      .catch((ex) => setErr(ex.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function printInvoice() {
    const headers = {};
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(apiUrl(`/api/invoices/${id}/pdf`), { headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) w.onload = () => w.print();
  }

  async function downloadPdf() {
    const headers = {};
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(apiUrl(`/api/invoices/${id}/pdf`), { headers });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function sendEmail() {
    setErr("");
    try {
      await api(`/api/invoices/${id}/send-email`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMsg(`Invoice emailed to ${email}`);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  if (loading) return <LoadingState />;
  if (!invoice) return <ErrorBanner message={err || "Not found"} />;

  return (
    <div>
      <PageHeader
        title={invoice.invoice_number}
        subtitle={`PO: ${invoice.po_number} · ${formatDate(invoice.created_at)}`}
        actions={
          <>
            <StatusBadge status={invoice.status} />
            <button type="button" className="btn-secondary" onClick={downloadPdf}>Download PDF</button>
            <button type="button" className="btn-secondary" onClick={printInvoice}>Print</button>
          </>
        }
      />
      <ErrorBanner message={err} />
      <SuccessBanner message={msg} />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold text-white">Bill To</h2>
          <p className="font-medium">{invoice.vendor_name}</p>
          <p className="text-sm text-slate-400">{invoice.vendor_email}</p>
          {invoice.gst_number && <p className="text-sm text-slate-500">GST: {invoice.gst_number}</p>}
          {invoice.address && <p className="mt-2 text-sm text-slate-400">{invoice.address}</p>}
        </div>
        <div className="card">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(invoice.tax_amount)}</span></div>
            <div className="flex justify-between border-t border-surface-700 pt-2 text-lg font-bold"><span>Total</span><span>{formatCurrency(invoice.total_amount)}</span></div>
          </div>
        </div>
      </div>

      <div className="table-wrap mb-6">
        <table className="data-table">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            {invoice.items?.map((it) => (
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

      <div className="card flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-400">Send invoice via email</label>
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="button" className="btn-primary" onClick={sendEmail}>Send Email</button>
      </div>
    </div>
  );
}
