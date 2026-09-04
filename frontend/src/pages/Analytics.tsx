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
import {
  mockAiImpact,
  mockSentimentTrend,
  mockTopPerformers,
} from "../data/mock";

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

export function Analytics() {
  const ticketsQuery = useQuery({
    queryKey: ["tickets", ""],
    queryFn: () => api.listTickets(""),
    refetchInterval: 10000,
  });

  const { kpis, statusData, categoryData } = useMemo(() => {
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

    return {
      kpis: {
        total,
        assistedPct: total ? Math.round((assisted / total) * 100) : 0,
        approvedPct: total ? Math.round((approved / total) * 100) : 0,
        avgConf,
      },
      statusData,
      categoryData,
    };
  }, [ticketsQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics Insights</h1>
        <p className="mt-1 text-sm text-slate-500">
          Status and category charts use live ticket data. Sentiment, AI impact, and top
          performers are demo placeholders.
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
          <h2 className="text-sm font-semibold text-slate-900">Customer Sentiment Trend</h2>
          <p className="text-xs text-slate-400">Demo data — sentiment not tracked yet</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSentimentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Positive" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="Neutral" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-6 text-xs text-slate-500">
            <span>
              CSAT Score <strong className="text-slate-800">4.8/5.0</strong>
            </span>
            <span>
              Response Rate <strong className="text-slate-800">98.2%</strong>
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">AI Impact</h2>
          <p className="text-xs text-slate-400">Demo stacked usage by day</p>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockAiImpact}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Draft" stackId="a" fill="#2563eb" />
                <Bar dataKey="Macros" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Routing" stackId="a" fill="#10b981" />
                <Bar dataKey="Knowledge" stackId="a" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Top Performers</h2>
          <p className="mb-4 text-xs text-slate-400">Demo roster — no agent auth yet</p>
          <ul className="space-y-3">
            {mockTopPerformers.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {p.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.role}</p>
                </div>
                <span className="text-sm font-bold text-slate-700">{p.tickets}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-card">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">AI Efficiency Tip</p>
              <p className="mt-1 text-sm text-amber-800">
                Review macros for billing inquiries — the AI co-pilot reduced repetitive
                handling by 42% in similar queues.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 shadow-card">
            <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-violet-900">Automation Insight</p>
              <p className="mt-1 text-sm text-violet-800">
                Auto-routing accuracy reached 94% when intent confidence exceeded 0.8 —
                keep the human approval gate for lower-confidence drafts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
