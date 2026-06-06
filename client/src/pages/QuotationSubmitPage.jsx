import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { ErrorBanner, LoadingState, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function QuotationSubmitPage() {
  const { rfqId } = useParams();
  const navigate = useNavigate();
  const [rfq, setRfq] = useState(null);
  const [existing, setExisting] = useState(null);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api(`/api/rfqs/${rfqId}`), api(`/api/quotations?rfqId=${rfqId}`)])
      .then(([rfqData, qData]) => {
        setRfq(rfqData.rfq);
        const mine = qData.quotations?.[0];
        if (mine) {
          setExisting(mine);
          setDeliveryDays(mine.delivery_days);
          setNotes(mine.notes || "");
        }
        return api(`/api/quotations/${mine?.id || 0}`).catch(() => null);
      })
      .then((detail) => {
        if (detail?.quotation?.items) {
          const p = {};
          detail.quotation.items.forEach((it) => { p[it.rfq_item_id] = it.unit_price; });
          setPrices(p);
        }
      })
      .finally(() => setLoading(false));
  }, [rfqId]);

  async function save(submit) {
    setErr("");
    setMsg("");
    const items = rfq.items.map((it) => ({
      rfqItemId: it.id,
      unitPrice: Number(prices[it.id] || 0),
    }));
    try {
      await api("/api/quotations", {
        method: "POST",
        body: JSON.stringify({ rfqId: Number(rfqId), deliveryDays: Number(deliveryDays), notes, items, submit }),
      });
      setMsg(submit ? "Quotation submitted successfully" : "Draft saved");
      if (submit) setTimeout(() => navigate("/quotations"), 1200);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  if (loading) return <LoadingState />;
  if (!rfq) return <ErrorBanner message="RFQ not found" />;

  const total = rfq.items.reduce((s, it) => s + Number(prices[it.id] || 0) * Number(it.quantity), 0);

  return (
    <div>
      <PageHeader title="Submit Quotation" subtitle={rfq.title} />
      <ErrorBanner message={err} />
      <SuccessBanner message={msg} />
      {existing && <p className="mb-4 text-sm text-slate-400">Editing existing quotation · Status: {existing.status}</p>}

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold text-white">Pricing</h2>
        <div className="space-y-3">
          {rfq.items.map((it) => (
            <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-700 p-3">
              <div>
                <p className="font-medium">{it.product_name}</p>
                <p className="text-xs text-slate-500">Qty: {it.quantity} {it.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Unit price ₹</span>
                <input
                  className="input-field w-32"
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices[it.id] ?? ""}
                  onChange={(e) => setPrices({ ...prices, [it.id]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-right text-lg font-bold text-white">Total: ₹{total.toLocaleString("en-IN")}</p>
      </div>

      <div className="card mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Delivery timeline (days)</label>
          <input className="input-field" type="number" min="0" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-400">Notes / Comments</label>
          <textarea className="input-field min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" className="btn-secondary" onClick={() => save(false)}>Save Draft</button>
        <button type="button" className="btn-primary" onClick={() => save(true)}>Submit Quotation</button>
      </div>
    </div>
  );
}
