import { useMutation } from "@tanstack/react-query";
import { Lightbulb, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";

function relevanceColor(pct: number): string {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 50) return "bg-brand-500";
  return "bg-amber-400";
}

function relevanceBadge(pct: number): string {
  if (pct >= 70) return "bg-emerald-50 text-emerald-700";
  if (pct >= 50) return "bg-brand-50 text-brand-700";
  return "bg-amber-50 text-amber-800";
}

const EXAMPLES = [
  "Can plan upgrades be prorated mid-cycle?",
  "How do I reset a customer's password?",
  "What's the process for filing a bug report?",
];

export function AiAssistant() {
  const [question, setQuestion] = useState("");

  const askMutation = useMutation({
    mutationFn: (q: string) => api.askAssistant(q),
  });

  function handleAsk(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    askMutation.mutate(q);
  }

  const result = askMutation.data;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="space-y-5 lg:col-span-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI-Powered Answer Generation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ask any support question — this calls the real retrieve + generate agent steps
            against the live knowledge base.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Your question
          </p>
          <textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type a support question..."
            className="mt-3 w-full resize-none rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-slate-700 outline-none ring-brand-400 focus:ring-2"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleAsk(ex)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!question.trim() || askMutation.isPending}
            onClick={() => handleAsk(question)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            {askMutation.isPending ? "Generating…" : "Ask AI Assistant"}
          </button>
          {askMutation.isError && (
            <p className="mt-2 text-xs text-rose-600">{(askMutation.error as Error).message}</p>
          )}
        </div>

        {result && (
          <div className="rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                  AI-generated answer
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-base leading-relaxed text-slate-800">{result.answer}</p>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
          Need new docs? Add markdown files to <code>knowledge_base/</code> and restart the
          backend to reseed.
        </div>
      </section>

      <aside className="lg:col-span-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Knowledge Sources
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {result ? `${result.sources.length} relevant sources found` : "Ask a question to see matches"}
          </p>

          <ul className="mt-4 space-y-3">
            {(result?.sources || []).map((src) => (
              <li
                key={src.title}
                className="rounded-xl border border-slate-100 bg-surface-muted/50 p-4"
              >
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${relevanceColor(src.relevance)}`}
                    style={{ width: `${src.relevance}%` }}
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{src.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{src.snippet}</p>
                    {src.tags && (
                      <p className="mt-1 text-[10px] text-slate-400">Tags: {src.tags}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${relevanceBadge(src.relevance)}`}
                  >
                    {src.relevance}%
                  </span>
                </div>
              </li>
            ))}
            {result && result.sources.length === 0 && (
              <li className="text-sm text-slate-400">No knowledge base matches found.</li>
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}
