import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Signup() {
  const { signup, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountName, setAccountName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signup({
        email,
        password,
        account_name: accountName,
        display_name: displayName || undefined,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-card"
      >
        <h1 className="text-2xl font-bold text-slate-900">Create agency account</h1>
        <p className="mt-1 text-sm text-slate-500">Starts a real multi-tenant agency workspace.</p>
        <label className="mt-6 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Agency name</span>
          <input
            required
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Your name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
          />
        </label>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
