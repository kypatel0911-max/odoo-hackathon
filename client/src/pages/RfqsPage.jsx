import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, EmptyState } from "../components/ui/Feedback.jsx";

export default function RfqsPage() {
  const { hasRole } = useAuth();
  const [rfqs, setRfqs] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (status) q.set("status", status);
      const data = await api(`/api/rfqs?${q}`);
      setRfqs(data.rfqs);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Request for Quotations"
        subtitle="Create and track procurement RFQs"
        actions={hasRole("admin", "procurement_officer") && (
          <Link to="/rfqs/new" className="btn-primary">+ Create RFQ</Link>
        )}
      />
      <ErrorBanner message={err} />

      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input-field max-w-xs" placeholder="Search RFQs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field max-w-[180px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="po_generated">PO Generated</option>
          <option value="invoiced">Invoiced</option>
        </select>
        <button type="button" className="btn-secondary" onClick={load}>Filter</button>
      </div>

      {loading ? <LoadingState /> : rfqs.length === 0 ? (
        <EmptyState title="No RFQs yet" description="Create an RFQ to start the procurement workflow." action={hasRole("admin", "procurement_officer") && <Link to="/rfqs/new" className="btn-primary">Create RFQ</Link>} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Deadline</th><th>Quotes</th><th>Created by</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rfqs.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.title}</td>
                  <td>{formatDate(r.deadline)}</td>
                  <td>{r.quote_count ?? 0}</td>
                  <td>{r.created_by_name || "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><Link to={`/rfqs/${r.id}`} className="text-sm text-brand hover:underline">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
