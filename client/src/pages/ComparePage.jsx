import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatCurrency } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState } from "../components/ui/Feedback.jsx";

export default function ComparePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState("price");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api(`/api/quotations/compare/${id}`)
      .then(setData)
      .catch((ex) => setErr(ex.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (!data) return <ErrorBanner message={err || "Not found"} />;

  let quotes = [...data.quotations];
  if (sortBy === "price") quotes.sort((a, b) => Number(a.total_price) - Number(b.total_price));
  else if (sortBy === "delivery") quotes.sort((a, b) => a.delivery_days - b.delivery_days);
  else if (sortBy === "rating") quotes.sort((a, b) => Number(b.vendor_rating) - Number(a.vendor_rating));

  return (
    <div>
      <PageHeader
        title="Quotation Comparison"
        subtitle={data.rfq.title}
        actions={
          <>
            <select className="input-field w-auto" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="price">Sort by price</option>
              <option value="delivery">Sort by delivery</option>
              <option value="rating">Sort by rating</option>
            </select>
            <Link to={`/rfqs/${id}`} className="btn-secondary">Back to RFQ</Link>
          </>
        }
      />
      <ErrorBanner message={err} />

      {data.aiRecommendation?.recommended && (
        <section className="card mb-6 border-brand/30 bg-gradient-to-r from-brand/10 to-indigo-600/10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-2xl">🤖</div>
            <div className="flex-1">
              <h2 className="font-semibold text-white">AI Vendor Recommendation</h2>
              <p className="mt-1 text-xs text-slate-400">{data.aiRecommendation.algorithm}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold text-brand-light">{data.aiRecommendation.recommended.vendorName}</span>
                <span className="rounded-full bg-brand/20 px-3 py-1 text-sm font-medium text-brand-light">
                  Score: {data.aiRecommendation.recommended.aiScore}/100
                </span>
                {data.aiRecommendation.recommended.reasons.map((r) => (
                  <span key={r} className="rounded bg-surface-700 px-2 py-0.5 text-xs text-slate-300">{r}</span>
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {formatCurrency(data.aiRecommendation.recommended.totalPrice)} · {data.aiRecommendation.recommended.deliveryDays} days delivery · {data.aiRecommendation.recommended.rating} ★ rating
              </p>
            </div>
          </div>
        </section>
      )}

      {quotes.length === 0 ? (
        <p className="text-slate-400">No submitted quotations to compare yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full gap-4">
            {quotes.map((q) => (
              <div
                key={q.id}
                className={`card w-72 shrink-0 ${q.isAiRecommended ? "ring-2 ring-brand" : q.isLowestPrice ? "ring-2 ring-emerald-500" : ""}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">{q.vendor_name}</p>
                    <p className="text-xs text-slate-500">{q.vendor_category}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>

                <p className="text-2xl font-bold text-white">{formatCurrency(q.total_price)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {q.isAiRecommended && <span className="rounded bg-brand/20 px-2 py-0.5 text-xs text-brand-light">AI Recommended</span>}
                  {q.isLowestPrice && <span className="rounded bg-emerald-600/20 px-2 py-0.5 text-xs text-emerald-400">Lowest price</span>}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery</span>
                    <span className={q.isFastestDelivery ? "font-medium text-emerald-400" : ""}>{q.delivery_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rating</span>
                    <span>{Number(q.vendor_rating).toFixed(1)} ★</span>
                  </div>
                </div>

                {q.notes && <p className="mt-3 rounded bg-surface-900/50 p-2 text-xs text-slate-400">{q.notes}</p>}

                {q.items?.length > 0 && (
                  <div className="mt-4 border-t border-surface-700 pt-3">
                    <p className="mb-2 text-xs font-medium uppercase text-slate-500">Line items</p>
                    {q.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-xs text-slate-400">
                        <span>{it.product_name}</span>
                        <span>{formatCurrency(it.unit_price)}/u</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
