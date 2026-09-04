import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api } from "../api/client";

export function Campaigns() {
  const queryClient = useQueryClient();
  const campaignsQuery = useQuery({ queryKey: ["campaigns"], queryFn: () => api.listCampaigns() });
  const contactsQuery = useQuery({ queryKey: ["contacts", ""], queryFn: () => api.listContacts() });

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {{name}}, thanks for being a customer.");
  const [selected, setSelected] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createCampaign({
        name,
        channel,
        subject: channel === "email" ? subject : undefined,
        body_template: body,
        contact_ids: selected.length ? selected : undefined,
      }),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.sendCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
        <p className="mt-1 text-sm text-slate-500">
          Email via SendGrid / SMS via Twilio — mock adapters used when keys are missing.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as "email" | "sms")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          {channel === "email" && (
            <input
              required
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          )}
        </div>
        <textarea
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 p-2">
          <p className="mb-2 text-xs font-semibold text-slate-500">Audience (empty = all contacts)</p>
          {(contactsQuery.data || []).map((c) => (
            <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-sm">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
              {c.name} · {c.email || c.phone || "—"}
            </label>
          ))}
        </div>
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Create campaign
        </button>
        {createMutation.isError && (
          <p className="text-sm text-rose-600">{(createMutation.error as Error).message}</p>
        )}
      </form>

      <ul className="space-y-3">
        {(campaignsQuery.data || []).map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div>
              <p className="font-semibold text-slate-900">
                {c.name} · {c.channel}
              </p>
              <p className="text-xs text-slate-500">
                {c.status} · {c.recipient_count} recipients · {c.subject || "SMS"}
              </p>
            </div>
            {c.status === "draft" && (
              <button
                type="button"
                onClick={() => sendMutation.mutate(c.id)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Send now
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
