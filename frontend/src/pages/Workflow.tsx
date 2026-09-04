import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  FileSearch,
  Inbox as InboxIcon,
  Minus,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Split,
  Target,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { AppSettingsUpdate, TicketListItem } from "../types";

type NodeTone = "emerald" | "sky" | "indigo" | "amber" | "brand" | "rose" | "teal" | "pink";

const TONE_STYLES: Record<NodeTone, { icon: string; card: string }> = {
  emerald: { icon: "bg-emerald-500", card: "border-emerald-100" },
  sky: { icon: "bg-sky-500", card: "border-sky-100" },
  indigo: { icon: "bg-indigo-500", card: "border-indigo-100" },
  amber: { icon: "bg-amber-500", card: "border-amber-100" },
  brand: { icon: "bg-brand-600", card: "border-brand-100" },
  rose: { icon: "bg-rose-500", card: "border-rose-100" },
  teal: { icon: "bg-teal-500", card: "border-teal-100" },
  pink: { icon: "bg-pink-500", card: "border-pink-100" },
};

function FlowNode({
  icon: Icon,
  title,
  detail,
  tone,
  compact,
  stat,
  expanded,
  onToggle,
}: {
  icon: typeof InboxIcon;
  title: string;
  detail: string;
  tone: NodeTone;
  compact?: boolean;
  stat?: string;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full flex-col rounded-2xl border bg-white text-left shadow-card transition hover:border-brand-200 ${styles.card}`}
    >
      <div className={`flex items-center gap-3 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${styles.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {detail}
          </p>
        </div>
        {onToggle && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </div>
      {expanded && stat && (
        <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
          {stat}
        </div>
      )}
    </button>
  );
}

function VLine({ height = "h-6" }: { height?: string }) {
  return (
    <div className="flex justify-center">
      <span className={`w-0.5 ${height} bg-slate-300`} />
    </div>
  );
}

type RuleKey =
  | "ask_clarifying_threshold"
  | "bug_escalate_threshold"
  | "sentiment_priority_threshold"
  | "tier_ticket_share_threshold";

const RULE_CARDS: {
  key: RuleKey;
  title: string;
  ruleText: (pct: number) => string;
  tone: string;
  accent: string;
}[] = [
  {
    key: "ask_clarifying_threshold",
    title: "Conditional Logic",
    ruleText: (pct) => `If confidence > ${pct}%, auto-suggest reply`,
    tone: "border-violet-200 bg-violet-50",
    accent: "text-violet-700 accent-violet-600",
  },
  {
    key: "bug_escalate_threshold",
    title: "Routing Rule",
    ruleText: (pct) => `If bug confidence < ${pct}%, escalate to specialist`,
    tone: "border-amber-200 bg-amber-50",
    accent: "text-amber-700 accent-amber-600",
  },
  {
    key: "sentiment_priority_threshold",
    title: "Sentiment Override",
    ruleText: (pct) => `If negative-sentiment score ≥ ${pct}%, priority = high`,
    tone: "border-teal-200 bg-teal-50",
    accent: "text-teal-700 accent-teal-600",
  },
  {
    key: "tier_ticket_share_threshold",
    title: "Tier Assignment",
    ruleText: (pct) => `If requester's ticket share ≥ ${pct}%, assign senior agent`,
    tone: "border-orange-200 bg-orange-50",
    accent: "text-orange-700 accent-orange-600",
  },
];

function categoryBreakdownStat(tickets: TicketListItem[]): string {
  if (tickets.length === 0) return "No tickets classified yet.";
  const counts: Record<string, number> = {};
  for (const t of tickets) counts[t.category || "unknown"] = (counts[t.category || "unknown"] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return `${tickets.length} classified · top category "${top[0]}" (${Math.round((top[1] / tickets.length) * 100)}%)`;
}

function decisionBreakdownStat(tickets: TicketListItem[]): string {
  const withDecision = tickets.filter((t) => t.reason_decision);
  if (withDecision.length === 0) return "No decisions logged yet.";
  const counts: Record<string, number> = {};
  for (const t of withDecision) counts[t.reason_decision!] = (counts[t.reason_decision!] || 0) + 1;
  return Object.entries(counts)
    .map(([k, v]) => `${k.replace("_", " ")}: ${Math.round((v / withDecision.length) * 100)}%`)
    .join(" · ");
}

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

  const [values, setValues] = useState<Record<RuleKey, number>>({
    ask_clarifying_threshold: 0.45,
    bug_escalate_threshold: 0.7,
    sentiment_priority_threshold: 0.5,
    tier_ticket_share_threshold: 0.2,
  });
  const [expandedRule, setExpandedRule] = useState<RuleKey | null>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setValues({
        ask_clarifying_threshold: settingsQuery.data.ask_clarifying_threshold,
        bug_escalate_threshold: settingsQuery.data.bug_escalate_threshold,
        sentiment_priority_threshold: settingsQuery.data.sentiment_priority_threshold,
        tier_ticket_share_threshold: settingsQuery.data.tier_ticket_share_threshold,
      });
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: AppSettingsUpdate) => api.updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function adjust(key: RuleKey, deltaPct: number) {
    setValues((prev) => {
      const next = Math.min(1, Math.max(0, Math.round((prev[key] * 100 + deltaPct)) / 100));
      const updated = { ...prev, [key]: next };
      saveMutation.mutate({ [key]: next });
      return updated;
    });
  }

  const perf = useMemo(() => {
    const all = ticketsQuery.data || [];
    const total = all.length || 1;
    const approved = all.filter((t) => t.status === "approved").length;
    const escalated = all.filter((t) => t.reason_decision === "escalate").length;
    const withConf = all.filter((t) => t.confidence != null);
    const avgConf =
      withConf.length > 0
        ? Math.round((withConf.reduce((s, t) => s + (t.confidence || 0), 0) / withConf.length) * 100)
        : 0;

    // "Time saved" vs a disclosed 15-minute manual-handling baseline, using real
    // created_at -> updated_at deltas for tickets that reached a terminal state.
    const BASELINE_SECONDS = 15 * 60;
    const terminal = all.filter((t) => ["approved", "rejected", "failed"].includes(t.status));
    let timeSavedPct = 0;
    if (terminal.length > 0) {
      const avgSeconds =
        terminal.reduce((s, t) => s + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / 1000, 0) /
        terminal.length;
      timeSavedPct = Math.max(0, Math.min(99, Math.round(((BASELINE_SECONDS - avgSeconds) / BASELINE_SECONDS) * 100)));
    }

    return {
      approvedPct: Math.round((approved / total) * 100),
      escalationPct: Math.round((escalated / total) * 100),
      avgConf,
      timeSavedPct,
      total: all.length,
      terminalCount: terminal.length,
    };
  }, [ticketsQuery.data]);

  const tickets = ticketsQuery.data || [];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <h1 className="text-2xl font-bold text-slate-900">Workflow Builder</h1>
        <p className="mt-1 text-sm text-slate-500">
          The real agent loop that runs for every ticket. Click any node for live stats from that
          step.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-100 bg-surface-muted/40 p-6">
          <div className="mx-auto flex max-w-md flex-col">
            <FlowNode
              icon={InboxIcon}
              title="Ticket Received"
              detail="New ticket created"
              tone="emerald"
              expanded={expandedNode === "ingest"}
              onToggle={() => setExpandedNode(expandedNode === "ingest" ? null : "ingest")}
              stat={`${perf.total} ticket${perf.total === 1 ? "" : "s"} ingested so far.`}
            />
            <VLine />
            <FlowNode
              icon={Target}
              title="Intent Detected"
              detail="Classify → category + confidence"
              tone="sky"
              expanded={expandedNode === "classify"}
              onToggle={() => setExpandedNode(expandedNode === "classify" ? null : "classify")}
              stat={categoryBreakdownStat(tickets)}
            />
            <VLine />
            <FlowNode
              icon={FileSearch}
              title="Knowledge Retrieved"
              detail="Full-text search over KB docs"
              tone="indigo"
              expanded={expandedNode === "retrieve"}
              onToggle={() => setExpandedNode(expandedNode === "retrieve" ? null : "retrieve")}
              stat="Open a ticket's detail page to see exact KB hits for that run."
            />
            <VLine />
            <FlowNode
              icon={Split}
              title="Decision Made"
              detail="Answer · Clarify · or Escalate"
              tone="amber"
              expanded={expandedNode === "reason"}
              onToggle={() => setExpandedNode(expandedNode === "reason" ? null : "reason")}
              stat={decisionBreakdownStat(tickets)}
            />
            <VLine />
            <FlowNode
              icon={Sparkles}
              title="AI Draft Generated"
              detail="Draft reply + confidence score"
              tone="brand"
              expanded={expandedNode === "generate"}
              onToggle={() => setExpandedNode(expandedNode === "generate" ? null : "generate")}
              stat={`Avg generation confidence: ${perf.avgConf}%`}
            />
            <VLine />
            <FlowNode
              icon={ShieldCheck}
              title="Approval Required?"
              detail="Draft passed safety validation?"
              tone="amber"
              expanded={expandedNode === "validate"}
              onToggle={() => setExpandedNode(expandedNode === "validate" ? null : "validate")}
              stat="Checks for leaked secrets, toxicity, and empty drafts before handoff."
            />

            <div className="relative mt-2 grid grid-cols-2 items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                  <span className="h-6 w-0.5 bg-slate-300" /> No
                </div>
                <FlowNode
                  icon={XCircle}
                  title="Escalate"
                  detail="Validation failed — notify n8n"
                  tone="rose"
                  compact
                  expanded={expandedNode === "escalate"}
                  onToggle={() => setExpandedNode(expandedNode === "escalate" ? null : "escalate")}
                  stat={`${perf.escalationPct}% of tickets escalated.`}
                />
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  <span className="h-6 w-0.5 bg-slate-300" /> Yes
                </div>
                <FlowNode
                  icon={UserCheck}
                  title="Human Approval"
                  detail="Needs review — awaiting agent"
                  tone="teal"
                  compact
                  expanded={expandedNode === "approval"}
                  onToggle={() => setExpandedNode(expandedNode === "approval" ? null : "approval")}
                  stat={`${perf.approvedPct}% of tickets approved by a human reviewer.`}
                />
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <VLine height="h-6" />
              <VLine height="h-6" />
            </div>
            <FlowNode
              icon={Send}
              title="Send Response / Escalate"
              detail="Approved reply sent · or handed to specialist"
              tone="pink"
              expanded={expandedNode === "handoff"}
              onToggle={() => setExpandedNode(expandedNode === "handoff" ? null : "handoff")}
              stat={`${perf.terminalCount} ticket${perf.terminalCount === 1 ? "" : "s"} fully resolved.`}
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Every node above logs an <code>AgentLog</code> row in Postgres — open a ticket's detail
          page to see the real trace for that run.
        </p>
      </section>

      <aside className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Workflow Settings
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Click a rule to adjust it — changes save instantly and are persisted to Postgres.
          </p>

          {settingsQuery.isLoading ? (
            <p className="mt-4 text-xs text-slate-400">Loading…</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {RULE_CARDS.map((rule) => {
                const pct = Math.round(values[rule.key] * 100);
                const isOpen = expandedRule === rule.key;
                return (
                  <li key={rule.key} className={`rounded-xl border p-3 ${rule.tone}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 text-left"
                      onClick={() => setExpandedRule(isOpen ? null : rule.key)}
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{rule.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{rule.ruleText(pct)}</p>
                      </div>
                      <span className={`shrink-0 text-sm font-extrabold ${rule.accent.split(" ")[0]}`}>
                        {pct}%
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-2 flex items-center justify-center gap-3 border-t border-white/60 pt-2">
                        <button
                          type="button"
                          onClick={() => adjust(rule.key, -5)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-slate-800">{pct}%</span>
                        <button
                          type="button"
                          onClick={() => adjust(rule.key, 5)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
              {(saveMutation.isPending || saved) && (
                <li className="text-center text-[11px] font-semibold text-slate-400">
                  {saveMutation.isPending ? "Saving…" : "Saved ✓"}
                </li>
              )}
              {saveMutation.isError && (
                <li className="text-center text-xs text-rose-600">
                  {(saveMutation.error as Error).message}
                </li>
              )}
            </ul>
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
              <span className="text-slate-600">Avg handling time saved</span>
              <span className="font-bold text-emerald-600">{perf.timeSavedPct}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Auto-routing accuracy</span>
              <span className="font-bold text-brand-600">{perf.avgConf}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-600">Escalation rate</span>
              <span className="font-bold text-orange-600">{perf.escalationPct}%</span>
            </li>
          </ul>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            Time saved is measured against a disclosed 15-minute manual-handling baseline;
            routing accuracy uses classify confidence as a proxy.
          </p>
        </div>

        <div className="rounded-2xl bg-brand-600 p-5 text-white shadow-soft">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0" />
            <div className="w-full">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-100">
                Efficiency Index
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-lg font-bold">
                  {perf.total === 0 ? "Awaiting data" : perf.approvedPct >= 50 ? "Excellent" : "Building"}
                </p>
                <span className="text-sm font-semibold text-brand-100">{perf.approvedPct}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.max(perf.approvedPct, 4)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-brand-100">
                Human approval gate active — no auto-send in v1.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
