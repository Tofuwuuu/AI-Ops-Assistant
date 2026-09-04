import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Filter, Plus, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { derivePriority, PriorityBadge } from "../components/PriorityBadge";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { TicketForm } from "../components/TicketForm";
import { TicketTable } from "../components/TicketTable";
import { useSearch } from "../layouts/AppLayout";
import type { TicketStatus } from "../types";

const FILTERS: { label: string; value: TicketStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Needs review", value: "needs_review" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Failed", value: "failed" },
];

export function Dashboard() {
  const [filter, setFilter] = useState<TicketStatus | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const { search } = useSearch();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["tickets", filter],
    queryFn: () => api.listTickets(filter),
    refetchInterval: 3000,
  });

  const detailQuery = useQuery({
    queryKey: ["ticket", selectedId],
    queryFn: () => api.getTicket(selectedId!),
    enabled: Boolean(selectedId),
    refetchInterval: 3000,
  });

  const createMutation = useMutation({
    mutationFn: api.createTicket,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setSelectedId(ticket.id);
      setShowForm(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.rejectTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const tickets = useMemo(() => {
    const all = ticketsQuery.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.requester_email.toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
  }, [ticketsQuery.data, search]);

  const stats = useMemo(() => {
    const all = ticketsQuery.data || [];
    const total = all.length || 1;
    const approved = all.filter((t) => t.status === "approved").length;
    const review = all.filter((t) => t.status === "needs_review").length;
    const open = all.filter((t) =>
      ["pending", "classified", "drafted", "needs_review"].includes(t.status)
    ).length;
    const withConf = all.filter((t) => t.confidence != null);
    const avgConf =
      withConf.length > 0
        ? withConf.reduce((s, t) => s + (t.confidence || 0), 0) / withConf.length
        : 0;
    return {
      open,
      review,
      resolution: Math.round((approved / total) * 100),
      avgConf: Math.round(avgConf * 100),
      autoHandled: all.filter((t) => t.status === "approved" || t.status === "needs_review")
        .length,
    };
  }, [ticketsQuery.data]);

  const selected = detailQuery.data;
  const latestDraft = selected?.drafts?.length
    ? selected.drafts[selected.drafts.length - 1]
    : null;

  function focusForm() {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  return (
    <div className="relative space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Open Tickets" value={stats.open} accent="blue" />
        <StatCard label="Needs Review" value={stats.review} accent="amber" />
        <StatCard label="AI Resolution Rate" value={`${stats.resolution}%`} accent="emerald" />
        <StatCard label="Avg Confidence" value={`${stats.avgConf}%`} hint="proxy for draft quality" />
        <StatCard label="Auto-Handled" value={stats.autoHandled} hint="drafted or approved" />
      </div>

      {showForm && (
        <div ref={formRef}>
          <TicketForm
            busy={createMutation.isPending}
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="xl:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Active Queue</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      filter === f.value
                        ? "bg-brand-600 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                <Filter className="h-3.5 w-3.5" /> Filters
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>
          </div>

          {ticketsQuery.isLoading && (
            <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-card">
              Loading tickets…
            </p>
          )}
          {ticketsQuery.isError && (
            <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
              {(ticketsQuery.error as Error).message}
            </p>
          )}
          {ticketsQuery.data && (
            <TicketTable
              tickets={tickets}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </section>

        <aside className="xl:col-span-2">
          {!selectedId && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500 shadow-card">
              Select a ticket from the queue to view AI summary and actions.
            </div>
          )}
          {selectedId && detailQuery.isLoading && (
            <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-card">
              Loading detail…
            </div>
          )}
          {selected && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {selected.requester_email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {selected.requester_email.split("@")[0]}
                    </p>
                    <p className="truncate text-xs text-slate-500">{selected.requester_email}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">{selected.subject}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{selected.body}</p>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-slate-400">Urgency</dt>
                    <dd className="mt-1">
                      <PriorityBadge priority={derivePriority(selected)} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Intent</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {selected.category || "unknown"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Decision</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {selected.reason_decision || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Account</dt>
                    <dd className="mt-1 font-semibold text-slate-800">Free Plan</dd>
                  </div>
                </dl>
              </div>

              <div className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white shadow-card">
                <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50/80 px-5 py-3">
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  <h4 className="text-sm font-semibold text-brand-800">AI Summary & Action</h4>
                </div>
                <div className="space-y-3 p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Summary
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">
                      {latestDraft?.content ||
                        "Agent is still processing — draft will appear here when ready."}
                    </p>
                  </div>
                  {selected.confidence != null && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Confidence
                      </p>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-100">
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${Math.round(selected.confidence * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selected.status === "needs_review" && (
                      <>
                        <button
                          type="button"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(selected.id)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                          <Sparkles className="h-4 w-4" /> Approve draft
                        </button>
                        <button
                          type="button"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(selected.id)}
                          className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <Link
                      to={`/tickets/${selected.id}`}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Open full detail
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <button
        type="button"
        onClick={focusForm}
        className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-soft hover:bg-brand-700"
        aria-label="New ticket"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
