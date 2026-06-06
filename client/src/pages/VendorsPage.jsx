import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { StatusBadge } from "../components/ui/StatusBadge.jsx";
import { ErrorBanner, LoadingState, EmptyState } from "../components/ui/Feedback.jsx";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", category: "General", gstNumber: "", phone: "", contactPerson: "", address: "", status: "active", rating: 0,
  });

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (category) q.set("category", category);
      if (status) q.set("status", status);
      const [v, c] = await Promise.all([
        api(`/api/vendors?${q}`),
        api("/api/vendors/categories"),
      ]);
      setVendors(v.vendors);
      setCategories(c.categories);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/vendors", { method: "POST", body: JSON.stringify({ ...form, rating: Number(form.rating) }) });
      setShowForm(false);
      setForm({ name: "", email: "", category: "General", gstNumber: "", phone: "", contactPerson: "", address: "", status: "active", rating: 0 });
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Vendor Management"
        subtitle="Register and maintain vendor records with GST and contact details"
        actions={<button type="button" className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "+ Register Vendor"}</button>}
      />
      <ErrorBanner message={err} />

      {showForm && (
        <form onSubmit={onCreate} className="card mb-6 grid gap-4 sm:grid-cols-2">
          <input className="input-field" placeholder="Vendor name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input-field" type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input-field" placeholder="GST Number" value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          <input className="input-field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input-field" placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <input className="input-field sm:col-span-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          <input className="input-field" type="number" step="0.1" min="0" max="5" placeholder="Rating (0-5)" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
          <div className="sm:col-span-2"><button type="submit" className="btn-primary">Save Vendor</button></div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input-field max-w-xs" placeholder="Search name, email, GST..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field max-w-[160px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input-field max-w-[140px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <button type="button" className="btn-secondary" onClick={load}>Filter</button>
      </div>

      {loading ? <LoadingState /> : vendors.length === 0 ? (
        <EmptyState title="No vendors found" description="Register your first vendor to start procurement." />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Category</th><th>GST</th><th>Contact</th><th>Rating</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-xs text-slate-500">{v.email}</p>
                  </td>
                  <td>{v.category}</td>
                  <td className="font-mono text-xs">{v.gst_number || "—"}</td>
                  <td>
                    <p>{v.contact_person || "—"}</p>
                    <p className="text-xs text-slate-500">{v.phone}</p>
                  </td>
                  <td>{Number(v.rating).toFixed(1)} ★</td>
                  <td><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
