import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, KeyRound, Palette, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Settings() {
  const { user, account, role, refresh } = useAuth();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [saved, setSaved] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [customDomain, setCustomDomain] = useState("");
  const [brandSaved, setBrandSaved] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setEmailNotifs(settingsQuery.data.notify_email);
      setSlackNotifs(settingsQuery.data.notify_slack);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (account) {
      setBrandName(account.branding_json?.name || account.name);
      setPrimaryColor(account.branding_json?.primaryColor || "#2563eb");
      setCustomDomain(account.custom_domain || "");
    }
  }, [account]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({ notify_email: emailNotifs, notify_slack: slackNotifs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const brandMutation = useMutation({
    mutationFn: () =>
      api.updateAccount({
        name: brandName,
        branding_json: { name: brandName, primaryColor },
        custom_domain: customDomain || null,
      }),
    onSuccess: async () => {
      await refresh();
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 2000);
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Account-scoped preferences + white-label branding.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Profile</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Display name</span>
            <input
              readOnly
              value={user?.display_name || ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Email</span>
            <input
              readOnly
              value={user?.email || ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Role</span>
            <input
              readOnly
              value={role || ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Branding / White-label</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Brand name</span>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Primary color</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-surface-muted px-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Custom domain</span>
            <input
              placeholder="app.youragency.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Stored on the account. Point DNS / reverse-proxy CNAME manually to this app host —
              automated provisioning needs a hosting platform domain API.
            </p>
          </label>
        </div>
        <button
          type="button"
          onClick={() => brandMutation.mutate()}
          className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {brandMutation.isPending ? "Saving…" : brandSaved ? "Saved ✓" : "Save branding"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        </div>
        {settingsQuery.isLoading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : (
          <ul className="space-y-3">
            <ToggleRow
              label="Email when draft needs review (via n8n)"
              checked={emailNotifs}
              onChange={setEmailNotifs}
            />
            <ToggleRow
              label="Slack channel alerts (via n8n)"
              checked={slackNotifs}
              onChange={setSlackNotifs}
            />
            <ToggleRow
              label="Require human approval before send"
              checked={settingsQuery.data?.require_human_review ?? true}
              onChange={() => {}}
              locked
            />
          </ul>
        )}
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? "Saving…" : saved ? "Saved ✓" : "Save preferences"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Safety Gate</h2>
        </div>
        <p className="text-sm text-slate-600">
          Confidence thresholds live on the{" "}
          <Link to="/workflow" className="font-semibold text-brand-700 underline">
            Workflow
          </Link>{" "}
          page.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">API keys</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Masked placeholders — real secrets live in server environment variables.
        </p>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Groq / LLM key</span>
            <input
              readOnly
              value="••••••••••••••••••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-500"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Stripe / Twilio / SendGrid</span>
            <input
              readOnly
              value="Configured via .env (mock fallbacks when unset)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  locked,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3">
      <span className="text-sm text-slate-700">
        {label}
        {locked && (
          <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">enforced</span>
        )}
      </span>
      <button
        type="button"
        disabled={locked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-brand-600" : "bg-slate-300"
        } ${locked ? "opacity-70" : ""}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </li>
  );
}
