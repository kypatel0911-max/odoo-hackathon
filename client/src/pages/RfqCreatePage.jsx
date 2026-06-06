import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { ErrorBanner } from "../components/ui/Feedback.jsx";

const emptyItem = () => ({ productName: "", description: "", quantity: 1, unit: "units" });

export default function RfqCreatePage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    items: [emptyItem()],
    vendorIds: [],
    publish: true,
  });

  useEffect(() => {
    api("/api/vendors?status=active").then((d) => setVendors(d.vendors)).catch(() => {});
  }, []);

  function setItem(i, k, v) {
    setForm((f) => {
      const items = [...f.items];
      items[i] = { ...items[i], [k]: v };
      return { ...f, items };
    });
  }

  function toggleVendor(id) {
    setForm((f) => ({
      ...f,
      vendorIds: f.vendorIds.includes(id) ? f.vendorIds.filter((x) => x !== id) : [...f.vendorIds, id],
    }));
  }

  async function onSubmit(e, publish) {
    e.preventDefault();
    setErr("");
    try {
      const payload = { ...form, publish, items: form.items.map((it) => ({ ...it, quantity: Number(it.quantity) })) };
      const data = await api("/api/rfqs", { method: "POST", body: JSON.stringify(payload) });
      navigate(`/rfqs/${data.rfq.id}`);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div>
      <PageHeader title="Create RFQ" subtitle="Define products, deadline, and assign vendors" />
      <ErrorBanner message={err} />

      <form className="space-y-6">
        <div className="card grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-400">RFQ Title *</label>
            <input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-slate-400">Description</label>
            <textarea className="input-field min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Deadline *</label>
            <input className="input-field" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required />
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Products / Services</h2>
            <button type="button" className="btn-secondary text-xs" onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>+ Add item</button>
          </div>
          <div className="space-y-3">
            {form.items.map((item, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-surface-700 p-3 sm:grid-cols-4">
                <input className="input-field sm:col-span-2" placeholder="Product name *" value={item.productName} onChange={(e) => setItem(i, "productName", e.target.value)} required />
                <input className="input-field" type="number" min="0.01" step="0.01" placeholder="Qty" value={item.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} />
                <input className="input-field" placeholder="Unit" value={item.unit} onChange={(e) => setItem(i, "unit", e.target.value)} />
                <input className="input-field sm:col-span-4" placeholder="Description" value={item.description} onChange={(e) => setItem(i, "description", e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold text-white">Assign Vendors *</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {vendors.map((v) => (
              <label key={v.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-surface-700 p-3 hover:border-brand/40">
                <input type="checkbox" checked={form.vendorIds.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                <div>
                  <p className="text-sm font-medium">{v.name}</p>
                  <p className="text-xs text-slate-500">{v.category} · {Number(v.rating).toFixed(1)} ★</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={(e) => onSubmit(e, false)}>Save as Draft</button>
          <button type="button" className="btn-primary" onClick={(e) => onSubmit(e, true)}>Publish RFQ</button>
        </div>
      </form>
    </div>
  );
}
