import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export function Contacts() {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["contacts", q],
    queryFn: () => api.listContacts(q || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createContact({ name, email: email || undefined, phone: phone || undefined }),
    onSuccess: () => {
      setName("");
      setEmail("");
      setPhone("");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
        <p className="mt-1 text-sm text-slate-500">CRM contacts scoped to your account.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:grid-cols-4"
      >
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add contact
        </button>
      </form>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="border-b border-slate-100 p-4">
          <input
            placeholder="Search contacts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <ul className="divide-y divide-slate-50">
          {(contactsQuery.data || []).map((c) => (
            <li key={c.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link to={`/contacts/${c.id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                  {c.name}
                </Link>
                <p className="text-xs text-slate-500">
                  {c.email || "—"} · {c.phone || "—"}
                </p>
              </div>
              {c.tags && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {c.tags}
                </span>
              )}
            </li>
          ))}
          {(contactsQuery.data || []).length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-400">No contacts yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
