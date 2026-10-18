import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { checkApiHealth } from "../api/client";
import { useAuth } from "../context/AuthContext";

const README_LOCAL_URL =
  "https://github.com/Tofuwuuu/AI-Ops-Assistant#run-the-full-app-locally";

export function Login() {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState("admin@demo.example.com");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Only true after the health check fails. While it runs, the page looks normal.
  const [apiOffline, setApiOffline] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLFormElement>(null);
  // Top padding only while the banner is showing and would cover the card.
  const [padTop, setPadTop] = useState(0);

  useEffect(() => {
    let active = true;
    checkApiHealth(3000).then((ok) => {
      if (active && !ok) setApiOffline(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!apiOffline) {
      setPadTop(0);
      return;
    }
    const banner = bannerRef.current;
    const main = mainRef.current;
    const card = cardRef.current;
    if (!banner || !main || !card) return;

    const update = () => {
      const h = banner.offsetHeight;
      // Measure the card's natural top with no offset and vertical centering,
      // so a prior mobile pad does not skew the decision after resize.
      const prevPad = main.style.paddingTop;
      const prevAlign = main.style.alignItems;
      main.style.paddingTop = "0px";
      main.style.alignItems = "center";
      const naturalTop = card.getBoundingClientRect().top;
      main.style.paddingTop = prevPad;
      main.style.alignItems = prevAlign;
      const next = naturalTop < h + 8 ? h : 0;
      setPadTop((cur) => (cur === next ? cur : next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(banner);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [apiOffline]);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (apiOffline) return;
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
    <div className="flex min-h-screen flex-col bg-surface">
      {apiOffline && (
        <div
          ref={bannerRef}
          role="status"
          className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-surface-muted px-4 py-2 text-center text-sm text-slate-600"
        >
          This demo shows the frontend only. The backend is offline, so sign-in is turned off.{" "}
          <a
            href={README_LOCAL_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Run it locally
          </a>{" "}
          to try the full app.
        </div>
      )}
      <div
        ref={mainRef}
        className={`flex flex-1 justify-center p-4 ${padTop > 0 ? "items-start" : "items-center"}`}
        style={padTop > 0 ? { paddingTop: padTop } : undefined}
      >
        <form
          ref={cardRef}
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
            disabled={pending || apiOffline}
            className="mt-6 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand-600"
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
    </div>
  );
}
