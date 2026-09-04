import { Link } from "react-router-dom";
import type { TicketListItem } from "../types";
import { derivePriority, PriorityBadge } from "./PriorityBadge";
import { StatusBadge } from "./StatusBadge";

interface Props {
  tickets: TicketListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TicketTable({ tickets, selectedId, onSelect }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        No tickets match this filter. Submit a request to start the agent pipeline.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Intent</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const selected = ticket.id === selectedId;
              const priority = derivePriority(ticket);
              return (
                <tr
                  key={ticket.id}
                  onClick={() => onSelect(ticket.id)}
                  className={`cursor-pointer border-b border-slate-50 transition last:border-0 ${
                    selected ? "bg-brand-50/70" : "hover:bg-slate-50/80"
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-900">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      #{ticket.id.slice(0, 8)} · Updated {relativeTime(ticket.updated_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{ticket.requester_email}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <PriorityBadge priority={priority} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-slate-600">{ticket.category || "—"}</span>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2 text-xs font-medium text-brand-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
