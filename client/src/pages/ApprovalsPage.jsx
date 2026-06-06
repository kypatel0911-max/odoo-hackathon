import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { LoadingState, EmptyState } from "../components/ui/Feedback.jsx";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const q = status ? `?status=${status}` : "";
    const data = await api(`/api/approvals${q}`);
    setApprovals(data.approvals);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]);

  return (
    <div>
      <PageHeader title="Approval Workflow" subtitle="Review and decide on procurement requests" />
      <div className="mb-4">
        <select className="input-field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {loading ? <LoadingState /> : approvals.length === 0 ? (
        <EmptyState title="No approvals" description="Approvals appear when procurement officers submit selected quotations." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>RFQ</th><th>Vendor</th><th>Amount</th><th>Delivery</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium">{a.rfq_title}</td>
                  <td>{a.vendor_name}</td>
                  <td>{formatCurrency(a.total_price)}</td>
                  <td>{a.delivery_days} days</td>
                  <td>{formatDate(a.created_at)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td><Link to={`/approvals/${a.id}`} className="text-sm text-brand hover:underline">Review →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
