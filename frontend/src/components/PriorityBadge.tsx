import type { TicketListItem } from "../types";

export type Priority = "High" | "Medium" | "Low";

/**
 * Client-side priority heuristic — not persisted server-side.
 * bug + low confidence -> High; needs_review -> Medium; else Low.
 */
export function derivePriority(ticket: TicketListItem): Priority {
  if (ticket.category === "bug" && (ticket.confidence == null || ticket.confidence < 0.7)) {
    return "High";
  }
  if (ticket.status === "needs_review" || ticket.status === "failed") {
    return "Medium";
  }
  if (ticket.category === "billing") {
    return "Medium";
  }
  return "Low";
}

const STYLES: Record<Priority, string> = {
  High: "bg-rose-50 text-rose-700 ring-rose-200",
  Medium: "bg-amber-50 text-amber-800 ring-amber-200",
  Low: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}
