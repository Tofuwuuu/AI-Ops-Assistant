import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

export function Invoices() {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const invoicesQuery = useQuery({ queryKey: ["invoices"], queryFn: () => api.listInvoices() });
  const contactsQuery = useQuery({ queryKey: ["contacts", ""], queryFn: () => api.listContacts() });

  const [description, setDescription] = useState("Support retainer");
  const [amount, setAmount] = useState("49.00");
  const [contactId, setContactId] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.createInvoice({
        contact_id: contactId || undefined,
        description,
        line_items: [{ description, quantity: 1, unit_amount: Number(amount) || 0 }],
      }),
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (inv.checkout_url) window.open(inv.checkout_url, "_blank");
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => api.invoiceCheckout(id),
    onSuccess: (inv) => {
      if (inv.checkout_url) {
        if (inv.checkout_url.includes("mock=1")) {
          api.markInvoicePaid(inv.id).then(() => queryClient.invalidateQueries({ queryKey: ["invoices"] }));
        } else {
          window.open(inv.checkout_url, "_blank");
        }
      }
    },
  });

  useEffect(() => {
    const paid = params.get("paid");
    if (paid) {
      api.markInvoicePaid(paid).finally(() => queryClient.invalidateQueries({ queryKey: ["invoices"] }));
    }
  }, [params, queryClient]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Stripe Checkout when configured; otherwise a mock checkout marks invoices paid.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:grid-cols-4">
        <input
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0.5}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">No contact</option>
          {(contactsQuery.data || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Create + checkout
        </button>
      </form>

      <ul className="space-y-3">
        {(invoicesQuery.data || []).map((inv) => (
          <li key={inv.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div>
              <p className="font-semibold text-slate-900">
                ${inv.amount.toFixed(2)} {inv.currency.toUpperCase()} · {inv.status}
              </p>
              <p className="text-xs text-slate-500">{inv.description || inv.id}</p>
            </div>
            {inv.status !== "paid" && (
              <button
                type="button"
                onClick={() => payMutation.mutate(inv.id)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Pay now
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
