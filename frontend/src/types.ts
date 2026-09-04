export type TicketStatus =
  | "pending"
  | "classified"
  | "drafted"
  | "needs_review"
  | "approved"
  | "rejected"
  | "failed";

export type TicketCategory = "bug" | "billing" | "how-to" | "feature" | "unknown";

export type AgentStep =
  | "ingest"
  | "classify"
  | "retrieve"
  | "reason"
  | "generate"
  | "validate"
  | "persist"
  | "handoff";

export interface Draft {
  id: string;
  content: string;
  confidence: number;
  version: number;
  created_at: string;
}

export interface AgentLog {
  id: string;
  step: AgentStep;
  input_json: Record<string, unknown> | null;
  output_json: Record<string, unknown> | null;
  created_at: string;
}

export interface TicketListItem {
  id: string;
  subject: string;
  requester_email: string;
  category: TicketCategory | null;
  status: TicketStatus;
  confidence: number | null;
  reason_decision: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket extends TicketListItem {
  body: string;
  reason_decision: string | null;
  drafts: Draft[];
  logs: AgentLog[];
}

export interface TicketCreatePayload {
  subject: string;
  body: string;
  requester_email: string;
}

export const TERMINAL_STATUSES: TicketStatus[] = ["approved", "rejected", "failed"];

export const ACTIVE_PROCESSING: TicketStatus[] = ["pending", "classified", "drafted"];

export interface AppSettings {
  notify_email: boolean;
  notify_slack: boolean;
  require_human_review: boolean;
  ask_clarifying_threshold: number;
  bug_escalate_threshold: number;
  updated_at: string;
}

export interface AppSettingsUpdate {
  notify_email?: boolean;
  notify_slack?: boolean;
  ask_clarifying_threshold?: number;
  bug_escalate_threshold?: number;
}

export interface KbSource {
  title: string;
  snippet: string;
  tags: string | null;
  relevance: number;
}

export interface AssistantAnswer {
  answer: string;
  confidence: number;
  sources: KbSource[];
}
