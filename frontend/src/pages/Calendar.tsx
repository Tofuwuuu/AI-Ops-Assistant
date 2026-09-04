import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarPage() {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({ queryKey: ["slot-rules"], queryFn: () => api.listSlotRules() });
  const apptsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.listAppointments(),
    refetchInterval: 10000,
  });

  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [duration, setDuration] = useState(30);

  const createRule = useMutation({
    mutationFn: () =>
      api.createSlotRule({
        weekday,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
        duration_minutes: duration,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["slot-rules"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appointments"] }),
  });

  function onRule(e: FormEvent) {
    e.preventDefault();
    createRule.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Availability rules + real bookings. Public page:{" "}
          <Link className="font-semibold text-brand-700" to={`/book/${account?.slug}`}>
            /book/{account?.slug}
          </Link>
        </p>
      </div>

      <form
        onSubmit={onRule}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card"
      >
        <label className="text-xs">
          Weekday
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {WEEKDAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Start
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          End
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          Minutes
          <input
            type="number"
            min={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Add rule
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Availability rules</h2>
          <ul className="mt-3 space-y-2">
            {(rulesQuery.data || []).map((r) => (
              <li key={r.id} className="flex justify-between rounded-xl bg-surface-muted px-3 py-2 text-sm">
                <span>
                  {WEEKDAYS[r.weekday]} {String(r.start_time).slice(0, 5)}–{String(r.end_time).slice(0, 5)} ·{" "}
                  {r.duration_minutes}m
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600"
                  onClick={() => api.deleteSlotRule(r.id).then(() => queryClient.invalidateQueries({ queryKey: ["slot-rules"] }))}
                >
                  Delete
                </button>
              </li>
            ))}
            {(rulesQuery.data || []).length === 0 && (
              <li className="text-sm text-slate-400">No rules — add Mon–Fri hours to open booking.</li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Appointments</h2>
          <ul className="mt-3 space-y-2">
            {(apptsQuery.data || []).map((a) => (
              <li key={a.id} className="rounded-xl bg-surface-muted px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {a.guest_name || "Guest"} · {a.status}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(a.starts_at).toLocaleString()} → {new Date(a.ends_at).toLocaleTimeString()}
                    </p>
                  </div>
                  {a.status === "booked" && (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(a.id)}
                      className="text-xs font-semibold text-rose-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
            {(apptsQuery.data || []).length === 0 && (
              <li className="text-sm text-slate-400">No appointments yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
