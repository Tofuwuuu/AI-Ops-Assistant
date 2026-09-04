import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { FunnelPage } from "../types";

const DEFAULT_BLOCKS = [
  { type: "hero", title: "Get started today", subtitle: "Book a demo or leave your details." },
  { type: "text", content: "We help teams automate support and sales ops." },
  { type: "form", fields: ["name", "email", "phone"] },
];

export function Funnels() {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const funnelsQuery = useQuery({ queryKey: ["funnels"], queryFn: () => api.listFunnels() });
  const [title, setTitle] = useState("Lead capture");
  const [slug, setSlug] = useState("lead-capture");
  const [editing, setEditing] = useState<FunnelPage | null>(null);
  const [blocksJson, setBlocksJson] = useState(JSON.stringify(DEFAULT_BLOCKS, null, 2));

  const createMutation = useMutation({
    mutationFn: () =>
      api.createFunnel({
        title,
        slug,
        blocks_json: DEFAULT_BLOCKS,
        published: true,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funnels"] }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateFunnel(editing!.id, {
        title: editing!.title,
        slug: editing!.slug,
        blocks_json: JSON.parse(blocksJson),
        published: editing!.published,
      }),
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
    },
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Funnels</h1>
        <p className="mt-1 text-sm text-slate-500">
          Block-based landing pages. Public URL pattern:{" "}
          <code>/f/{account?.slug}/&lt;slug&gt;</code>
        </p>
      </div>

      <form onSubmit={onCreate} className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Title"
        />
        <input
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="slug"
        />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">
          Create funnel
        </button>
      </form>

      <ul className="space-y-3">
        {(funnelsQuery.data || []).map((f) => (
          <li key={f.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{f.title}</p>
                <p className="text-xs text-slate-500">
                  /{f.slug} · {f.submission_count} submissions · {f.published ? "published" : "draft"}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/f/${account?.slug}/${f.slug}`}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                >
                  Open public
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(f);
                    setBlocksJson(JSON.stringify(f.blocks_json || DEFAULT_BLOCKS, null, 2));
                  }}
                  className="rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
                >
                  Edit blocks
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-slate-900">Edit blocks — {editing.title}</h2>
          <textarea
            rows={12}
            value={blocksJson}
            onChange={(e) => setBlocksJson(e.target.value)}
            className="mt-3 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
          {updateMutation.isError && (
            <p className="mt-2 text-sm text-rose-600">{(updateMutation.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  );
}
