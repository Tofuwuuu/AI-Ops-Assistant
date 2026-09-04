import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { StatCard } from "../components/StatCard";

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  classified: "#38bdf8",
  drafted: "#818cf8",
  needs_review: "#f59e0b",
  approved: "#10b981",
  rejected: "#f43f5e",
  failed: "#ef4444",
};

const CATEGORY_COLORS = ["#2563eb", "#0ea5e9", "#8b5cf6", "#f59e0b", "#64748b"];
const DECISION_COLORS: Record<string, string> = {
  answer_directly: "#10b981",
  ask_clarifying: "#f59e0b",
  escalate: "#f43f5e",
};

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Analytics() {
  const ticketsQuery = useQuery({
    queryKey: ["tickets", ""],
    queryFn: () => api.listTickets(""),
    refetchInterval: 10000,
  });

  const {
    kpis,
    statusData,
    categoryData,
    confidenceTrend,
    decisionTrend,
    topRequesters,
  } = useMemo(() => {
    const all = ticketsQuery.data || [];
    const total = all.length;
    const approved = all.filter((t) => t.status === "approved").length;
    const assisted = all.filter((t) =>
      ["drafted", "needs_review", "approved"].includes(t.status)
    ).length;
    const withConf = all.filter((t) => t.confidence != null);
    const avgConf =
      withConf.length > 0
        ? Math.round(
            (withConf.reduce((s, t) => s + (t.confidence || 0), 0) / withConf.length) * 100
          )
        : 0;

    const statusCounts: Record<string, number> = {};
    for (const t of all) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    const catCounts: Record<string, number> = {};
    for (const t of all) {
      const key = t.category || "unknown";
      catCounts[key] = (catCounts[key] || 0) + 1;
    }
    const categoryData = Object.entries(catCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Real confidence trend, grouped by day of ticket creation.
    const byDayConf: Record<string, number[]> = {};
    const byDayDecision: Record<string, Record<string, number>> = {};
    for (const t of all) {
      const key = dayKey(t.created_at);
      if (t.confidence != null) {
        byDayConf[key] = byDayConf[key] || [];
        byDayConf[key].push(t.confidence);
      }
      const decision = t.reason_decision || "pending";
      byDayDecision[key] = byDayDecision[key] || {};
      byDayDecision[key][decision] = (byDayDecision[key][decision] || 0) + 1;
    }
    const orderedDays = Array.from(
      new Set(all.map((t) => t.created_at).sort()).values()
    ).map(dayKey);
    const uniqueDays = Array.from(new Set(orderedDays));
    const confidenceTrend = uniqueDays.map((d) => ({
      day: d,
      "Avg Confidence": byDayConf[d]
        ? Math.round((byDayConf[d].reduce((a, b) => a + b, 0) / byDayConf[d].length) * 100)
        : 0,
    }));
    const decisionTrend = uniqueDays.map((d) => ({
      day: d,
      "Answer Directly": byDayDecision[d]?.answer_directly || 0,
      "Ask Clarifying": byDayDecision[d]?.ask_clarifying || 0,
      Escalate: byDayDecision[d]?.escalate || 0,
    }));

    const requesterCounts: Record<string, number> = {};
    for (const t of all) {
      requesterCounts[t.requester_email] = (requesterCounts[t.requester_email] || 0) + 1;
    }
    const topRequesters = Object.entries(requesterCounts)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      kpis: {
        total,
        assistedPct: total ? Math.round((assisted / total) * 100) : 0,
        approvedPct: total ? Math.round((approved / total) * 100) : 0,
        avgConf,
      },
      statusData,
      categoryData,
      confidenceTrend,
      decisionTrend,
      topRequesters,
    };
  }, [ticketsQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics Insights</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every chart below is computed live from real ticket, classification, and agent
          decision data — no mock data.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tickets Handled" value={kpis.total} accent="blue" />
        <StatCard label="AI-Assisted Resp." value={`${kpis.assistedPct}%`} accent="emerald" />
        <StatCard label="Approved Rate" value={`${kpis.approvedPct}%`} accent="emerald" />
        <StatCard label="Avg Confidence" value={`${kpis.avgConf}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Status Breakdown</h2>
          <p className="text-xs text-slate-400">{kpis.total} total tickets</p>
          <div className="mt-2 h-64">
            {statusData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Top Ticket Categories</h2>
          <p className="text-xs text-slate-400">From live classify results</p>
          <div className="mt-2 h-64">
            {categoryData.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Confidence Trend</h2>
          <p className="text-xs text-slate-400">Avg classify/generate confidence per day</p>
          <div className="mt-2 h-56">
            {confidenceTrend.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={confidenceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="Avg Confidence"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Agent Decisions</h2>
          <p className="text-xs text-slate-400">Reason-step outcomes per day</p>
          <div className="mt-2 h-56">
            {decisionTrend.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decisionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Answer Directly" stackId="a" fill={DECISION_COLORS.answer_directly} />
                  <Bar dataKey="Ask Clarifying" stackId="a" fill={DECISION_COLORS.ask_clarifying} />
                  <Bar dataKey="Escalate" stackId="a" fill={DECISION_COLORS.escalate} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Top Requesters</h2>
          <p className="mb-4 text-xs text-slate-400">By ticket volume, live data</p>
          {topRequesters.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <ul className="space-y-3">
              {topRequesters.map((r) => (
                <li key={r.email} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {r.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{r.email}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-card">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">AI Efficiency Tip</p>
              <p className="mt-1 text-sm text-amber-800">
                {kpis.total === 0
                  ? "No tickets yet — submit one from the Dashboard to see live stats."
                  : `${kpis.assistedPct}% of tickets received an AI draft, and ${kpis.approvedPct}% were approved as-is.`}
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 shadow-card">
            <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-violet-900">Automation Insight</p>
              <p className="mt-1 text-sm text-violet-800">
                Average agent confidence is {kpis.avgConf}% — adjust thresholds on the Workflow
                page to tune how often the agent asks clarifying questions vs. escalates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
