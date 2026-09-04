import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Deal } from "../types";

export function PipelinePage() {
  const queryClient = useQueryClient();
  const pipelinesQuery = useQuery({ queryKey: ["pipelines"], queryFn: () => api.listPipelines() });
  const pipeline = pipelinesQuery.data?.[0];
  const dealsQuery = useQuery({
    queryKey: ["deals", pipeline?.id],
    queryFn: () => api.listDeals(pipeline!.id),
    enabled: Boolean(pipeline?.id),
  });
  const contactsQuery = useQuery({ queryKey: ["contacts", ""], queryFn: () => api.listContacts() });

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("0");
  const [contactId, setContactId] = useState("");

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const stage of pipeline?.stages || []) map[stage] = [];
    for (const deal of dealsQuery.data || []) {
      if (!map[deal.stage]) map[deal.stage] = [];
      map[deal.stage].push(deal);
    }
    return map;
  }, [pipeline, dealsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createDeal({
        title,
        pipeline_id: pipeline!.id,
        stage: (pipeline?.stages || ["Lead"])[0],
        value: Number(value) || 0,
        contact_id: contactId || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setValue("0");
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => api.updateDeal(id, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deals"] }),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!pipeline || !title.trim()) return;
    createMutation.mutate();
  }

  if (!pipeline) return <p className="text-sm text-slate-400">Loading pipeline…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{pipeline.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Drag-free Kanban — click a stage chip to move deals.</p>
      </div>

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <input
          required
          placeholder="Deal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
          Add deal
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(pipeline.stages || []).map((stage) => (
          <div key={stage} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              {stage} · {(byStage[stage] || []).length}
            </h2>
            <ul className="space-y-2">
              {(byStage[stage] || []).map((deal) => (
                <li key={deal.id} className="rounded-xl border border-slate-100 bg-surface-muted p-3">
                  <p className="text-sm font-semibold text-slate-900">{deal.title}</p>
                  <p className="text-xs text-slate-500">${deal.value.toFixed(2)}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(pipeline.stages || [])
                      .filter((s) => s !== deal.stage)
                      .map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => moveMutation.mutate({ id: deal.id, stage: s })}
                          className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:text-brand-700"
                        >
                          → {s}
                        </button>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
