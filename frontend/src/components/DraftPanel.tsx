import type { Draft } from "../types";

interface Props {
  draft: Draft | null;
  canReview: boolean;
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}

export function DraftPanel({ draft, canReview, onApprove, onReject, busy }: Props) {
  if (!draft) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
        No draft yet — the agent is still working.
      </div>
    );
  }

  const pct = Math.round(draft.confidence * 100);

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">AI draft reply</h3>
          <p className="text-xs text-slate-500">Version {draft.version} · awaiting human review</p>
        </div>
        <div className="min-w-[140px]">
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>Confidence</span>
            <span className="font-semibold text-brand-700">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="whitespace-pre-wrap rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-slate-700">
        {draft.content}
      </div>

      {canReview && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Approve draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReject}
            className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
