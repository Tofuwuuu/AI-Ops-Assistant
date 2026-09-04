import { Bell, KeyRound, User } from "lucide-react";
import { useState } from "react";

export function Settings() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(true);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Local preferences only — not persisted to the backend in v1.
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
              defaultValue="Alex Johnson"
              className="w-full rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">Email</span>
            <input
              type="email"
              defaultValue="alex.johnson@example.com"
              className="w-full rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-slate-700">Role</span>
            <input
              defaultValue="Support Dashboard Operator"
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
        </div>
        <ul className="space-y-3">
          <ToggleRow
            label="Email when draft needs review"
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
            checked={reviewRequired}
            onChange={setReviewRequired}
            locked
          />
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">API keys</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          Masked placeholders only — real secrets live in server environment variables and are
          never shown here.
        </p>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">OpenAI API key</span>
            <input
              readOnly
              value="sk-••••••••••••••••••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-500"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">n8n webhook secret</span>
            <input
              readOnly
              value="••••••••••••••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-500"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Save preferences
        </button>
      </div>
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
          <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">
            enforced
          </span>
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
