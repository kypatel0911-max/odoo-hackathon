import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { ErrorBanner, SuccessBanner } from "../components/ui/Feedback.jsx";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      const data = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMsg(data.message);
    } catch (ex) {
      setErr(ex.message);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-surface-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 p-8">
        <h1 className="text-xl font-semibold text-white">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-400">We&apos;ll send reset instructions if the email exists</p>
        <ErrorBanner message={err} />
        <SuccessBanner message={msg} />
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <input
            className="input-field"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary w-full">Send reset link</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          <Link to="/login" className="text-brand hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
