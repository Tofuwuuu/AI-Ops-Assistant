import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const contactQuery = useQuery({
    queryKey: ["contact", id],
    queryFn: () => api.getContact(id!),
    enabled: Boolean(id),
  });
  const ticketsQuery = useQuery({
    queryKey: ["contact-tickets", id],
    queryFn: () => api.contactTickets(id!),
    enabled: Boolean(id),
  });

  const contact = contactQuery.data;
  if (contactQuery.isLoading) return <p className="text-sm text-slate-400">Loading…</p>;
  if (!contact) return <p className="text-sm text-rose-600">Contact not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/contacts" className="text-xs font-semibold text-brand-700">
          ← Contacts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{contact.name}</h1>
        <p className="text-sm text-slate-500">
          {contact.email || "No email"} · {contact.phone || "No phone"}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Activity — Tickets</h2>
        <ul className="mt-4 space-y-2">
          {(ticketsQuery.data || []).map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2">
              <Link to={`/tickets/${t.id}`} className="text-sm font-semibold text-slate-800 hover:text-brand-700">
                {t.subject}
              </Link>
              <StatusBadge status={t.status} />
            </li>
          ))}
          {(ticketsQuery.data || []).length === 0 && (
            <li className="text-sm text-slate-400">No tickets linked yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
