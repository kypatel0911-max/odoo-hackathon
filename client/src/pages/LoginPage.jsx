import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface-950 p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white shadow-lg shadow-brand/20">
          V
        </div>
        <h1 className="text-3xl font-bold text-white">VendorBridge</h1>
        <p className="mt-1 text-sm text-slate-400">Procurement & Vendor Management ERP</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-8 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Sign in</h2>
        <p className="mt-1 text-sm text-slate-400">Access your procurement workspace</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
            <input
              className="input-field"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Password</label>
              <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              className="input-field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button type="submit" className="btn-primary w-full py-2.5">
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New organization?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create account
          </Link>
        </p>

        <div className="mt-6 rounded-lg border border-surface-700 bg-surface-800/50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-400">Demo accounts (Password123!)</p>
          <p className="mt-1">admin@vendorbridge.com · officer@vendorbridge.com</p>
          <p>manager@vendorbridge.com · vendor@techsupply.in · vendor@officemart.com</p>
        </div>
      </div>
    </div>
  );
}
