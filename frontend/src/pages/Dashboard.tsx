import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Filter, Plus, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
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

  const widgets = useMemo(() => {
    const all = ticketsQuery.data || [];
    const total = all.length;

    const valueByStatus = [
      { name: "Approved", value: all.filter((t) => t.status === "approved").length, fill: "#10b981" },
      { name: "Needs review", value: all.filter((t) => t.status === "needs_review").length, fill: "#f59e0b" },
      { name: "Rejected", value: all.filter((t) => t.status === "rejected").length, fill: "#f43f5e" },
      {
        name: "In progress",
        value: all.filter((t) => ["pending", "classified", "drafted"].includes(t.status)).length,
        fill: "#60a5fa",
      },
    ];

    const approved = all.filter((t) => t.status === "approved").length;
    const resolutionPct = total ? Math.round((approved / total) * 100) : 0;
    const donutData = [
      { name: "Resolved", value: approved, fill: "#2563eb" },
      { name: "Remaining", value: Math.max(total - approved, 0), fill: "#e2e8f0" },
    ];

    const catCounts: Record<string, number> = {};
    for (const t of all) catCounts[t.category || "unclassified"] = (catCounts[t.category || "unclassified"] || 0) + 1;
    const stageColors = ["#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b", "#64748b"];
    let remaining = total;
    const funnel = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], i) => {
        const cumulativePct = total ? Math.round((remaining / total) * 100) : 0;
        remaining -= count;
        return { name, count, cumulativePct, fill: stageColors[i % stageColors.length] };
      });

    const stageDonut = Object.entries(catCounts).map(([name, value], i) => ({
      name,
      value,
      fill: stageColors[i % stageColors.length],
    }));

    return { valueByStatus, donutData, resolutionPct, funnel, stageDonut, total };
  }, [ticketsQuery.data]);

  const selected = detailQuery.data;
  const latestDraft = selected?.drafts?.length
    ? selected.drafts[selected.drafts.length - 1]
    : null;

  function focusForm() {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  function handleExport() {
    const rows = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      requester_email: t.requester_email,
      status: t.status,
      category: t.category || "",
      confidence: t.confidence != null ? Math.round(t.confidence * 100) : "",
      reason_decision: t.reason_decision || "",
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
    const headers = Object.keys(rows[0] || {
      id: "", subject: "", requester_email: "", status: "", category: "",
      confidence: "", reason_decision: "", created_at: "", updated_at: "",
    });
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => escapeCsv(String((row as Record<string, unknown>)[h] ?? ""))).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `tickets-export-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live overview of your support pipeline.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Open Tickets" value={stats.open} accent="blue" />
        <StatCard label="Needs Review" value={stats.review} accent="amber" />
        <StatCard label="AI Resolution Rate" value={`${stats.resolution}%`} accent="emerald" />
        <StatCard label="Avg Confidence" value={`${stats.avgConf}%`} hint="proxy for draft quality" />
        <StatCard label="Auto-Handled" value={stats.autoHandled} hint="drafted or approved" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Ticket Value</h2>
            <button type="button" className="text-slate-300 hover:text-slate-500">⋮</button>
          </div>
          <div className="mt-3 h-40">
            {widgets.total === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={widgets.valueByStatus} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                    {widgets.valueByStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Tooltip />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            {widgets.valueByStatus.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
                {s.name} · {s.value}
              </span>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm">
            Total tickets <span className="font-bold text-slate-900">{widgets.total}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Resolution Rate</h2>
            <button type="button" className="text-slate-300 hover:text-slate-500">⋮</button>
          </div>
          <div className="relative mt-1 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={widgets.donutData} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2}>
                  {widgets.donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{widgets.resolutionPct}%</span>
              <span className="text-[10px] text-slate-400">resolved</span>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">
            {widgets.donutData[0].value} of {widgets.total} tickets approved as-is
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Stage Distribution</h2>
            <button type="button" className="text-slate-300 hover:text-slate-500">⋮</button>
          </div>
          <div className="mt-1 h-40">
            {widgets.stageDonut.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={widgets.stageDonut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2}>
                    {widgets.stageDonut.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-slate-900">Funnel · By Category</h2>
        <p className="text-xs text-slate-400">Ticket categories ranked by volume, with cumulative share</p>
        {widgets.funnel.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No data yet</p>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <span>Category</span>
              <span className="w-16 text-right">Count</span>
              <span className="w-20 text-right">Cumulative</span>
            </div>
            {widgets.funnel.map((f) => (
              <div key={f.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg px-1 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full rounded"
                      style={{ width: `${f.cumulativePct}%`, backgroundColor: f.fill }}
                    />
                  </div>
                  <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-700">{f.name}</span>
                </div>
                <span className="w-16 text-right text-sm font-semibold text-slate-800">{f.count}</span>
                <span className="w-20 text-right text-sm text-slate-500">{f.cumulativePct}%</span>
              </div>
            ))}
          </div>
        )}
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
                onClick={handleExport}
                disabled={tickets.length === 0}
                title={tickets.length === 0 ? "No tickets to export" : "Export visible tickets as CSV"}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
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
