interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "amber" | "emerald" | "blue";
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "border-slate-100 bg-white",
  amber: "border-amber-100 bg-amber-50/60",
  emerald: "border-emerald-100 bg-emerald-50/50",
  blue: "border-brand-100 bg-brand-50/50",
};

export function StatCard({ label, value, hint, accent = "default" }: StatCardProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3.5 shadow-card ${ACCENT[accent]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
