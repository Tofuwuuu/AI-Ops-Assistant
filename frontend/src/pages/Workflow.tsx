import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { pipelineSteps } from "../data/mock";

export function Workflow() {
  const queryClient = useQueryClient();
  const ticketsQuery = useQuery({
    queryKey: ["tickets", ""],
    queryFn: () => api.listTickets(""),
    refetchInterval: 10000,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const [askThreshold, setAskThreshold] = useState(0.45);
  const [bugThreshold, setBugThreshold] = useState(0.7);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setAskThreshold(settingsQuery.data.ask_clarifying_threshold);
      setBugThreshold(settingsQuery.data.bug_escalate_threshold);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        ask_clarifying_threshold: askThreshold,
        bug_escalate_threshold: bugThreshold,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const perf = useMemo(() => {
    const all = ticketsQuery.data || [];
    const total = all.length || 1;
    const approved = all.filter((t) => t.status === "approved").length;
    const failed = all.filter((t) => t.status === "failed").length;
    const withConf = all.filter((t) => t.confidence != null);
    const avgConf =
      withConf.length > 0
        ? Math.round(
            (withConf.reduce((s, t) => s + (t.confidence || 0), 0) / withConf.length) * 100
          )
        : 0;
    return {
      approvedPct: Math.round((approved / total) * 100),
      failedPct: Math.round((failed / total) * 100),
      avgConf,
      total: all.length,
    };
  }, [ticketsQuery.data]);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <h1 className="text-2xl font-bold text-slate-900">Agent Workflow</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live pipeline steps from the worker agent loop.
        </p>

        <ol className="relative mt-8 space-y-0 pl-2">
          {pipelineSteps.map((step, idx) => (
            <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
              {idx < pipelineSteps.length - 1 && (
                <span className="absolute left-[19px] top-10 h-[calc(100%-20px)] w-0.5 bg-slate-200" />
              )}
              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold ${step.color}`}
              >
                {idx + 1}
              </div>
              <div className={`flex-1 rounded-2xl border px-4 py-3 shadow-card ${step.color.replace(/text-\S+/g, "text-slate-800").replace(/bg-(\w+)-100/, "bg-white")}`}>
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Workflow Settings
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Live thresholds used by the Reason step — persisted to Postgres.
          </p>

          {settingsQuery.isLoading ? (
            <p className="mt-4 text-xs text-slate-400">Loading…</p>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Ask-clarifying confidence floor</span>
                  <span>{Math.round(askThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={askThreshold}
                  onChange={(e) => setAskThreshold(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Below this classify confidence, the agent asks a clarifying question instead
                  of drafting a reply.
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Bug escalation confidence floor</span>
                  <span>{Math.round(bugThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={bugThreshold}
                  onChange={(e) => setBugThreshold(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Bug reports below this confidence are escalated to a human instead of
                  answered directly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving…" : saved ? "Saved ✓" : "Save thresholds"}
              </button>
              {saveMutation.isError && (
                <p className="text-xs text-rose-600">{(saveMutation.error as Error).message}</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Performance Stats
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Derived from {perf.total} live ticket{perf.total === 1 ? "" : "s"}
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between">
              <span className="text-slate-600">Approval rate</span>
              <span className="font-bold text-emerald-600">{perf.approvedPct}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Failure rate</span>
              <span className="font-bold text-orange-600">{perf.failedPct}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Avg confidence</span>
              <span className="font-bold text-brand-600">{perf.avgConf}%</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-brand-600 p-5 text-white shadow-soft">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">
                Efficiency Index
              </p>
              <p className="mt-1 text-lg font-bold">
                {perf.approvedPct >= 50 ? "Excellent" : perf.total === 0 ? "Awaiting data" : "Building"}
              </p>
              <p className="mt-1 text-xs text-brand-100">
                Human approval gate active — no auto-send in v1.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
