import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { AgentTimeline } from "../components/AgentTimeline";
import { DraftPanel } from "../components/DraftPanel";
import { derivePriority, PriorityBadge } from "../components/PriorityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { ACTIVE_PROCESSING } from "../types";

export function TicketDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => api.getTicket(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3000;
      return ACTIVE_PROCESSING.includes(status) || status === "needs_review" ? 3000 : false;
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  if (ticketQuery.isLoading) {
    return <p className="p-10 text-center text-sm text-slate-500">Loading ticket…</p>;
  }
  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 shadow-card">
          {(ticketQuery.error as Error)?.message || "Ticket not found"}
        </p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const latestDraft = ticket.drafts.length ? ticket.drafts[ticket.drafts.length - 1] : null;
  const retrieveLog = ticket.logs.find((l) => l.step === "retrieve");
  const titles = (retrieveLog?.output_json?.titles as string[] | undefined) || [];

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{ticket.subject}</h1>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={derivePriority(ticket)} />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {ticket.requester_email} · {new Date(ticket.created_at).toLocaleString()}
              {ticket.category && (
                <>
                  {" "}
                  · <span className="font-medium text-brand-700">{ticket.category}</span>
                </>
              )}
              {ticket.reason_decision && (
                <>
                  {" "}
                  · decision: <span className="font-medium">{ticket.reason_decision}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Original request
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {ticket.body}
            </p>
          </section>

          <details className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              Retrieved context ({titles.length})
            </summary>
            {titles.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No knowledge base hits for this ticket.</p>
            ) : (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {titles.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </details>

          <DraftPanel
            draft={latestDraft}
            canReview={ticket.status === "needs_review"}
            busy={approveMutation.isPending || rejectMutation.isPending}
            onApprove={() => approveMutation.mutate()}
            onReject={() => rejectMutation.mutate()}
          />
          {(approveMutation.error || rejectMutation.error) && (
            <p className="text-sm text-rose-600">
              {((approveMutation.error || rejectMutation.error) as Error).message}
            </p>
          )}
        </div>

        <div className="lg:col-span-2">
          <AgentTimeline logs={ticket.logs} />
        </div>
      </div>
    </div>
  );
}
