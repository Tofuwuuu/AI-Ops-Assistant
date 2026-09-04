import { useState, type FormEvent } from "react";

interface Props {
  onSubmit: (data: { subject: string; body: string; requester_email: string }) => Promise<void>;
  busy?: boolean;
}

export function TicketForm({ onSubmit, busy }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("user@example.com");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({ subject, body, requester_email: email });
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">New support request</h2>
          <p className="mt-1 text-sm text-slate-500">
            Submit a ticket — the AI agent will draft a reply for human review.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Human approval required
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Requester email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Subject</span>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. How do I reset my password?"
            className="w-full rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block font-medium text-slate-700">Request details</span>
        <textarea
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe the issue or question..."
          className="w-full resize-y rounded-xl border border-slate-200 bg-surface-muted px-3 py-2.5 outline-none ring-brand-400 focus:ring-2"
        />
      </label>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit ticket"}
        </button>
      </div>
    </form>
  );
}
