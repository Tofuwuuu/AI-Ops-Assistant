import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export function PublicBooking() {
  const { accountSlug } = useParams<{ accountSlug: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ["public-slots", accountSlug],
    queryFn: () => api.publicAvailability(accountSlug!),
    enabled: Boolean(accountSlug),
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      api.publicBook(accountSlug!, {
        starts_at: selected!,
        guest_name: name,
        guest_email: email,
      }),
    onSuccess: () => setDone(true),
    onError: (err) => setError((err as Error).message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    bookMutation.mutate();
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Booked</h1>
        <p className="mt-2 text-sm text-slate-500">Your appointment is confirmed.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Book a time</h1>
        <p className="text-sm text-slate-500">/{accountSlug}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <input
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {(slotsQuery.data || []).map((s) => (
            <button
              key={s.starts_at}
              type="button"
              onClick={() => setSelected(s.starts_at)}
              className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
                selected === s.starts_at ? "bg-brand-600 text-white" : "bg-surface-muted text-slate-700"
              }`}
            >
              {new Date(s.starts_at).toLocaleString()}
            </button>
          ))}
          {(slotsQuery.data || []).length === 0 && (
            <p className="text-sm text-slate-400">No open slots — account needs availability rules.</p>
          )}
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={!selected || bookMutation.isPending}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Confirm booking
        </button>
      </form>
    </div>
  );
}
