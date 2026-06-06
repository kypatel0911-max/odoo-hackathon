import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api, formatCurrency, formatDateTime } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function ApprovalDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [approval, setApproval] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await api(`/api/approvals/${id}`);
      setApproval(data.approval);
      setTimeline(data.timeline);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function decide(decision) {
    setErr("");
    try {
      await api(`/api/approvals/${id}/decide`, {
        method: "POST",
        body: JSON.stringify({ decision, remarks }),
      });
      setMsg(`Request ${decision}`);
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  if (loading) return <LoadingState />;
  if (!approval) return <ErrorBanner message={err || "Not found"} />;

  const canDecide = hasRole("admin", "manager") && approval.status === "pending";

  return (
    <div>
      <PageHeader
        title={approval.rfq_title}
        subtitle={`Vendor: ${approval.vendor_name}`}
        actions={<StatusBadge status={approval.status} />}
      />
      <ErrorBanner message={err} />
      <SuccessBanner message={msg} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-xs text-slate-500">Total Amount</p><p className="text-xl font-bold">{formatCurrency(approval.total_price)}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Delivery</p><p className="text-xl font-bold">{approval.delivery_days} days</p></div>
        <div className="card"><p className="text-xs text-slate-500">Submitted</p><p className="text-sm">{formatDateTime(approval.created_at)}</p></div>
      </div>

      {approval.notes && (
        <div className="card mb-6">
          <p className="text-xs text-slate-500">Vendor notes</p>
          <p className="mt-1 text-slate-300">{approval.notes}</p>
        </div>
      )}

      {canDecide && (
        <div className="card mb-6">
          <h2 className="mb-3 font-semibold text-white">Decision</h2>
          <textarea className="input-field mb-3 min-h-[80px]" placeholder="Approval remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <div className="flex gap-3">
            <button type="button" className="btn-primary" onClick={() => decide("approved")}>Approve</button>
            <button type="button" className="btn-danger" onClick={() => decide("rejected")}>Reject</button>
          </div>
        </div>
      )}

      {approval.status === "approved" && hasRole("admin", "procurement_officer") && (
        <div className="card mb-6">
          <p className="text-sm text-slate-400">This RFQ is approved. Generate a purchase order next.</p>
          <Link to="/purchase-orders" className="btn-primary mt-3 inline-block">Go to Purchase Orders</Link>
        </div>
      )}

      <section className="card">
        <h2 className="mb-4 font-semibold text-white">Approval Timeline</h2>
        <div className="space-y-4">
          {timeline.map((t) => (
            <div key={t.id} className="flex gap-3 border-l-2 border-brand/40 pl-4">
              <div>
                <p className="text-sm font-medium capitalize text-slate-200">{t.action.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-500">{t.actor_name || "System"} · {formatDateTime(t.created_at)}</p>
                {t.remarks && <p className="mt-1 text-sm text-slate-400">{t.remarks}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
