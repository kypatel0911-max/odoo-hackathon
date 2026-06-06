import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "procurement_officer" });
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await register(form);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">Join VendorBridge procurement platform</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Full name</label>
            <input className="input-field" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Password (min 8 chars)</label>
            <input
              className="input-field"
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Role</label>
            <select className="input-field" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="procurement_officer">Procurement Officer</option>
              <option value="manager">Manager / Approver</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button type="submit" className="btn-primary w-full py-2.5">
            Register
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
