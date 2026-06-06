import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatCurrency, formatDate } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { LoadingState, EmptyState } from "../components/ui/Feedback.jsx";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/quotations").then((d) => setQuotations(d.quotations)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="My Quotations" subtitle="Track and manage your submitted quotations" />
      {loading ? <LoadingState /> : quotations.length === 0 ? (
        <EmptyState title="No quotations yet" description="Browse invited RFQs and submit your pricing." action={<Link to="/rfqs" className="btn-primary">View RFQs</Link>} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>RFQ</th><th>Total</th><th>Delivery</th><th>Updated</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="font-medium">{q.rfq_title}</td>
                  <td>{formatCurrency(q.total_price)}</td>
                  <td>{q.delivery_days} days</td>
                  <td>{formatDate(q.updated_at)}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td><Link to={`/quotations/submit/${q.rfq_id}`} className="text-sm text-brand hover:underline">Edit →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
