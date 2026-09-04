import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function Agency() {
  const { account, accounts, switchAccount, refresh } = useAuth();
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ["agency-stats"],
    queryFn: () => api.agencyStats(),
    enabled: account?.type === "agency",
  });
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api.createSubAccount({ name }),
    onSuccess: async () => {
      setName("");
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["agency-stats"] });
    },
    onError: (err) => setError((err as Error).message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  if (account?.type !== "agency") {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6 text-sm text-amber-900">
        Switch to an agency account to manage sub-accounts. Current: {account?.name} ({account?.type})
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agency</h1>
        <p className="mt-1 text-sm text-slate-500">
          White-label sub-accounts. Custom domain field is on Settings → Branding (manual DNS).
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <input
          required
          placeholder="Sub-account name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Create sub-account
        </button>
        {error && <p className="w-full text-sm text-rose-600">{error}</p>}
      </form>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Your accounts</h2>
        <ul className="mt-3 space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {a.name}{" "}
                  <span className="text-[10px] uppercase text-slate-400">{a.type}</span>
                </p>
                <p className="text-xs text-slate-500">
                  /{a.slug}
                  {a.custom_domain ? ` · ${a.custom_domain}` : ""}
                </p>
              </div>
              {a.id !== account.id && (
                <button
                  type="button"
                  onClick={() => switchAccount(a.id)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                >
                  Switch
                </button>
              )}
              {a.id === account.id && (
                <span className="text-xs font-semibold text-emerald-600">Active</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">Sub-account stats</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-2">Account</th>
                <th>Tickets</th>
                <th>Contacts</th>
                <th>Deals</th>
                <th>Appts</th>
                <th>Campaigns</th>
                <th>Invoices</th>
                <th>Leads</th>
              </tr>
            </thead>
            <tbody>
              {(statsQuery.data || []).map((s) => (
                <tr key={s.account_id} className="border-t border-slate-50">
                  <td className="py-2 font-semibold text-slate-800">{s.account_name}</td>
                  <td>{s.tickets}</td>
                  <td>{s.contacts}</td>
                  <td>{s.deals}</td>
                  <td>{s.appointments}</td>
                  <td>{s.campaigns}</td>
                  <td>{s.invoices}</td>
                  <td>{s.funnel_submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
