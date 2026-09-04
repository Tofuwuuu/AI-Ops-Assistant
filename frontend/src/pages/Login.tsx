import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("admin@demo.example.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
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
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Demo: <code>admin@demo.example.com</code> / <code>demo1234</code>
        </p>
        <label className="mt-6 block text-sm">
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link to="/signup" className="font-semibold text-brand-700">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
