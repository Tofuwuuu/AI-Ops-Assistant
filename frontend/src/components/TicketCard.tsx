import { Link } from "react-router-dom";
import type { TicketListItem } from "../types";
import { StatusBadge } from "./StatusBadge";

function categoryLabel(category: string | null) {
  if (!category) return "Uncategorized";
  return category;
}

export function TicketCard({ ticket }: { ticket: TicketListItem }) {
  const created = new Date(ticket.created_at).toLocaleString();

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="group block rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-brand-700">
            {ticket.subject}
          </h3>
          <p className="mt-1 truncate text-sm text-slate-500">{ticket.requester_email}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">
          {categoryLabel(ticket.category)}
        </span>
        {ticket.confidence != null && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1">
            Confidence {(ticket.confidence * 100).toFixed(0)}%
          </span>
        )}
        <span className="ml-auto">{created}</span>
      </div>
    </Link>
  );
}
