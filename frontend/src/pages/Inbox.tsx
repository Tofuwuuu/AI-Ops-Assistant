import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Crown,
  Paperclip,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import { isNegativeSentiment, isSeniorTier, sentimentScore } from "../lib/signals";
import type { TicketListItem } from "../types";

function initialsFor(email: string): string {
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const DECISION_STEPS: Record<string, string[]> = {
  answer_directly: [
    "Draft is ready — review for accuracy before sending.",
    "Insert the reply and send once approved.",
  ],
  ask_clarifying: [
    "Confidence was too low to answer directly.",
    "Ask the customer for more detail before drafting a final reply.",
  ],
  escalate: [
    "Flagged for escalation — likely a bug or low-confidence billing issue.",
    "Loop in a specialist before responding.",
  ],
};

export function Inbox() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["tickets", ""],
    queryFn: () => api.listTickets(""),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!selectedId && listQuery.data && listQuery.data.length > 0) {
      setSelectedId(listQuery.data[0].id);
    }
  }, [listQuery.data, selectedId]);

  const detailQuery = useQuery({
    queryKey: ["ticket", selectedId],
    queryFn: () => api.getTicket(selectedId!),
    enabled: Boolean(selectedId),
    refetchInterval: 4000,
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.rejectTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const tickets = listQuery.data || [];
  const ticket = detailQuery.data;
  const latestDraft = ticket?.drafts?.length ? ticket.drafts[ticket.drafts.length - 1] : null;
  const retrieveLog = ticket?.logs.find((l) => l.step === "retrieve");
  const kbTitles = (retrieveLog?.output_json?.titles as string[] | undefined) || [];
  const nextSteps = ticket?.reason_decision ? DECISION_STEPS[ticket.reason_decision] || [] : [];

  const sentimentThreshold = settingsQuery.data
    ? Math.round(settingsQuery.data.sentiment_priority_threshold * 100)
    : 50;
  const tierThreshold = settingsQuery.data
    ? Math.round(settingsQuery.data.tier_ticket_share_threshold * 100)
    : 20;
  const negativeSentiment = ticket ? isNegativeSentiment(ticket.body, sentimentThreshold) : false;
  const seniorTier = ticket ? isSeniorTier(ticket.requester_email, tickets, tierThreshold) : false;

  return (
    <div className="grid h-[calc(100vh-7rem)] gap-4 lg:grid-cols-6">
      <aside className="overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-card lg:col-span-1">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Conversations
          </h2>
        </div>
        {listQuery.isLoading && (
          <p className="p-4 text-xs text-slate-400">Loading…</p>
        )}
        <ul>
          {tickets.map((t: TicketListItem) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`flex w-full items-center gap-2 border-b border-slate-50 px-3 py-3 text-left transition ${
                  t.id === selectedId ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  {initialsFor(t.requester_email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {t.requester_email.split("@")[0]}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">{t.subject}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
          {tickets.length === 0 && !listQuery.isLoading && (
            <li className="p-4 text-xs text-slate-400">No tickets yet.</li>
          )}
        </ul>
      </aside>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card lg:col-span-3">
        {!ticket && (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Select a conversation
          </div>
        )}
        {ticket && (
          <>
            <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {initialsFor(ticket.requester_email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {ticket.requester_email.split("@")[0]}
                </p>
                <p className="truncate text-xs text-slate-500">{ticket.requester_email}</p>
              </div>
              <StatusBadge status={ticket.status} />
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  {initialsFor(ticket.requester_email)}
                </div>
                <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800">
                  <p className="font-semibold">{ticket.subject}</p>
                  <p className="mt-1">{ticket.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {latestDraft && (
                <div className="flex flex-row-reverse gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    AJ
                  </div>
                  <div className="max-w-[80%] rounded-2xl bg-brand-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
                    <p>{latestDraft.content}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      AI draft · {Math.round(latestDraft.confidence * 100)}% confidence
                      {ticket.status === "needs_review" && " · awaiting review"}
                      {ticket.status === "approved" && " · approved & sent"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-surface-muted px-3 py-2">
                <textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 hover:bg-white"
                    aria-label="Attach"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={ticket.status !== "needs_review" || approveMutation.isPending}
                    onClick={() => approveMutation.mutate(ticket.id)}
                    className="rounded-xl bg-brand-600 p-2 text-white hover:bg-brand-700 disabled:opacity-40"
                    aria-label="Send"
                    title="Approve draft (send)"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {approveMutation.error && (
                <p className="mt-1 text-xs text-rose-600">
                  {(approveMutation.error as Error).message}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <aside className="flex flex-col overflow-y-auto rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50/80 to-white p-5 shadow-card lg:col-span-2">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-semibold text-slate-900">AI Copilot</h2>
        </div>

        {!ticket && <p className="text-sm text-slate-500">Select a conversation to see agent insight.</p>}

        {ticket && (
          <div className="space-y-5">
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Target className="h-4 w-4 text-amber-500" /> Detected Intent
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 ring-inset">
                  {ticket.category || "unknown"}
                </span>
                {ticket.confidence != null && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 ring-inset">
                    {Math.round(ticket.confidence * 100)}% confidence
                  </span>
                )}
                {kbTitles.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 ring-inset"
                  >
                    {t}
                  </span>
                ))}
                {negativeSentiment && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 ring-inset">
                    <AlertTriangle className="h-3 w-3" /> Negative sentiment ({sentimentScore(ticket!.body)}%)
                  </span>
                )}
                {seniorTier && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 ring-inset">
                    <Crown className="h-3 w-3" /> Senior tier (repeat requester)
                  </span>
                )}
              </div>
            </section>

            {nextSteps.length > 0 && (
              <section>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Recommended Next Steps
                </div>
                <ul className="space-y-2">
                  {nextSteps.map((step) => (
                    <li key={step} className="flex gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {step}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Sparkles className="h-4 w-4 text-violet-500" /> Suggested Response Draft
              </div>
              {latestDraft ? (
                <blockquote className="rounded-xl border-l-4 border-violet-300 bg-white/80 p-3 text-sm italic leading-relaxed text-slate-700">
                  {latestDraft.content}
                </blockquote>
              ) : (
                <p className="rounded-xl bg-white/80 p-3 text-sm text-slate-500">
                  Agent is still processing — draft will appear here.
                </p>
              )}
              <button
                type="button"
                disabled={!latestDraft}
                onClick={() => latestDraft && setReply(latestDraft.content)}
                className="mt-3 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                Insert Reply
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={ticket.status !== "needs_review" || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(ticket.id)}
                  className="rounded-xl border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-800 disabled:opacity-40"
                >
                  Escalate / Reject
                </button>
                <button
                  type="button"
                  disabled={ticket.status !== "needs_review" || approveMutation.isPending}
                  onClick={() => approveMutation.mutate(ticket.id)}
                  className="rounded-xl border border-teal-200 bg-teal-50 py-2 text-xs font-semibold text-teal-800 disabled:opacity-40"
                >
                  Approve & Send
                </button>
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
