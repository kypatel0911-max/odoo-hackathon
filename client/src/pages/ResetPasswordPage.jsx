import { useState } from "react";
import { Link, useSearchParams, Navigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBanner, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  if (!token) return <Navigate to="/forgot-password" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-8">
        <h1 className="text-xl font-semibold text-white">Reset password</h1>
        <ErrorBanner message={err} />
        {done ? (
          <>
            <SuccessBanner message="Password updated successfully." />
            <Link to="/login" className="btn-primary mt-4 inline-block w-full text-center">Sign in</Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <input
              className="input-field"
              type="password"
              placeholder="New password (min 8 chars)"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full">Update password</button>
          </form>
        )}
      </div>
    </div>
  );
}
