import type { TicketStatus } from "../types";

const STYLES: Record<TicketStatus, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  classified: "bg-sky-50 text-sky-700 ring-sky-200",
  drafted: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
};

const LABELS: Record<TicketStatus, string> = {
  pending: "Pending",
  classified: "Classified",
  drafted: "Drafted",
  needs_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
