import type { AgentLog, AgentStep } from "../types";

const STEP_ORDER: AgentStep[] = [
  "ingest",
  "classify",
  "retrieve",
  "reason",
  "generate",
  "validate",
  "persist",
  "handoff",
];

const STEP_LABELS: Record<AgentStep, string> = {
  ingest: "Ingest",
  classify: "Classify",
  retrieve: "Retrieve",
  reason: "Reason",
  generate: "Generate",
  validate: "Validate",
  persist: "Persist",
  handoff: "Handoff",
};

function summarize(log: AgentLog): string {
  const out = log.output_json || {};
  if (log.step === "classify") {
    return `${out.category ?? "?"} · confidence ${Math.round(Number(out.confidence ?? 0) * 100)}%`;
  }
  if (log.step === "retrieve") {
    const titles = (out.titles as string[] | undefined) || [];
    return titles.length ? `Found: ${titles.join(", ")}` : "No KB matches";
  }
  if (log.step === "reason") return String(out.decision ?? "");
  if (log.step === "generate") return `confidence ${Math.round(Number(out.confidence ?? 0) * 100)}%`;
  if (log.step === "validate") return out.ok ? "Passed checks" : `Failed: ${(out.reasons as string[])?.join(", ")}`;
  if (log.step === "persist") return `status → ${out.status ?? ""}`;
  if (log.step === "handoff") return out.notified ? "n8n notified" : String(out.error ?? "done");
  return "Received";
}

export function AgentTimeline({ logs }: { logs: AgentLog[] }) {
  const byStep = new Map(logs.map((l) => [l.step, l]));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Agent pipeline</h3>
      <ol className="space-y-0">
        {STEP_ORDER.map((step, idx) => {
          const log = byStep.get(step);
          const done = Boolean(log);
          return (
            <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
              {idx < STEP_ORDER.length - 1 && (
                <span
                  className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 ${
                    done ? "bg-brand-300" : "bg-slate-200"
                  }`}
                />
              )}
              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium ${done ? "text-slate-900" : "text-slate-400"}`}>
                    {STEP_LABELS[step]}
                  </p>
                  {log && (
                    <time className="text-[11px] text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </time>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {log ? summarize(log) : "Waiting…"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
