import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export function PublicFunnel() {
  const { accountSlug, pageSlug } = useParams<{ accountSlug: string; pageSlug: string }>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  const pageQuery = useQuery({
    queryKey: ["public-funnel", accountSlug, pageSlug],
    queryFn: () => api.publicFunnel(accountSlug!, pageSlug!),
    enabled: Boolean(accountSlug && pageSlug),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      api.submitFunnel(accountSlug!, pageSlug!, { name, email, phone: phone || undefined }),
    onSuccess: () => setDone(true),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitMutation.mutate();
  }

  const page = pageQuery.data;
  if (pageQuery.isLoading) return <p className="p-8 text-sm text-slate-400">Loading…</p>;
  if (!page) return <p className="p-8 text-sm text-rose-600">Page not found</p>;

  if (done) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Thanks!</h1>
        <p className="mt-2 text-sm text-slate-500">Your details were saved as a CRM contact.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      {(page.blocks_json || []).map((block, idx) => {
        const type = String(block.type || "");
        if (type === "hero") {
          return (
            <div key={idx} className="rounded-2xl bg-brand-600 p-8 text-white shadow-soft">
              <h1 className="text-3xl font-bold">{String(block.title || page.title)}</h1>
              {block.subtitle ? <p className="mt-2 text-brand-100">{String(block.subtitle)}</p> : null}
            </div>
          );
        }
        if (type === "text") {
          return (
            <p key={idx} className="text-sm leading-relaxed text-slate-700">
              {String(block.content || "")}
            </p>
          );
        }
        if (type === "form") {
          return (
            <form
              key={idx}
              onSubmit={onSubmit}
              className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
            >
              <input
                required
                placeholder="Name"
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
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white"
              >
                Submit
              </button>
              {submitMutation.isError && (
                <p className="text-sm text-rose-600">{(submitMutation.error as Error).message}</p>
              )}
            </form>
          );
        }
        return null;
      })}
    </div>
  );
}
