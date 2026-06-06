import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api, apiUpload, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function RfqDetailPage() {
  const { id } = useParams();
  const { hasRole, user } = useAuth();
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api(`/api/rfqs/${id}`);
      setRfq(data.rfq);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function publish() {
    setErr("");
    try {
      await api(`/api/rfqs/${id}/publish`, { method: "POST" });
      setMsg("RFQ published — vendors notified");
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await apiUpload(`/api/rfqs/${id}/attachments`, fd);
      setMsg("Attachment uploaded");
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function submitForApproval(quotationId) {
    setErr("");
    try {
      await api(`/api/rfqs/${id}/submit-for-approval`, {
        method: "POST",
        body: JSON.stringify({ quotationId }),
      });
      setMsg("Submitted for manager approval");
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  if (loading) return <LoadingState />;
  if (!rfq) return <ErrorBanner message={err || "RFQ not found"} />;

  const isVendor = user.role === "vendor";
  const canManage = hasRole("admin", "procurement_officer");
  const submittedQuotes = rfq.quotations?.filter((q) => q.status === "submitted" || q.status === "selected") || [];

  return (
    <div>
      <PageHeader
        title={rfq.title}
        subtitle={`Deadline: ${formatDate(rfq.deadline)} · Created by ${rfq.created_by_name || "—"}`}
        actions={
          <>
            <StatusBadge status={rfq.status} />
            {canManage && submittedQuotes.length > 0 && (
              <Link to={`/rfqs/${id}/compare`} className="btn-primary">Compare Quotations</Link>
            )}
            {isVendor && ["published", "closed"].includes(rfq.status) && (
              <Link to={`/quotations/submit/${id}`} className="btn-primary">Submit Quotation</Link>
            )}
          </>
        }
      />
      <ErrorBanner message={err} />
      <SuccessBanner message={msg} />

      {rfq.description && <p className="mb-6 text-slate-400">{rfq.description}</p>}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold text-white">Line Items</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Qty</th><th>Unit</th></tr></thead>
              <tbody>
                {rfq.items?.map((it) => (
                  <tr key={it.id}>
                    <td><p>{it.product_name}</p><p className="text-xs text-slate-500">{it.description}</p></td>
                    <td>{it.quantity}</td>
                    <td>{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold text-white">Invited Vendors</h2>
          <ul className="space-y-2">
            {rfq.vendors?.map((v) => (
              <li key={v.id} className="flex justify-between rounded-lg bg-surface-900/50 px-3 py-2 text-sm">
                <span>{v.name}</span>
                <span className="text-slate-500">{Number(v.rating).toFixed(1)} ★</span>
              </li>
            ))}
          </ul>
          {canManage && rfq.status === "draft" && (
            <button type="button" className="btn-primary mt-4" onClick={publish}>Publish RFQ</button>
          )}
          {canManage && (
            <div className="mt-4">
              <label className="btn-secondary inline-block cursor-pointer">
                Upload attachment
                <input type="file" className="hidden" onChange={uploadFile} />
              </label>
              {rfq.attachments?.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  {rfq.attachments.map((a) => (
                    <li key={a.id}><a href={a.filepath} target="_blank" rel="noreferrer" className="text-brand hover:underline">{a.filename}</a></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      {submittedQuotes.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-semibold text-white">Received Quotations</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Vendor</th><th>Total</th><th>Delivery</th><th>Rating</th><th>Status</th>{canManage && <th></th>}</tr></thead>
              <tbody>
                {submittedQuotes.map((q) => (
                  <tr key={q.id}>
                    <td>{q.vendor_name}</td>
                    <td>{formatCurrency(q.total_price)}</td>
                    <td>{q.delivery_days} days</td>
                    <td>{Number(q.vendor_rating).toFixed(1)} ★</td>
                    <td><StatusBadge status={q.status} /></td>
                    {canManage && rfq.status === "published" && q.status === "submitted" && (
                      <td><button type="button" className="text-xs text-brand hover:underline" onClick={() => submitForApproval(q.id)}>Select & Submit for Approval</button></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
