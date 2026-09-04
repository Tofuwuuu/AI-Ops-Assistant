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
  contact_id?: string | null;
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
  sentiment_priority_threshold: number;
  tier_ticket_share_threshold: number;
  updated_at: string;
}

export interface AppSettingsUpdate {
  notify_email?: boolean;
  notify_slack?: boolean;
  ask_clarifying_threshold?: number;
  bug_escalate_threshold?: number;
  sentiment_priority_threshold?: number;
  tier_ticket_share_threshold?: number;
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

export interface Account {
  id: string;
  name: string;
  slug: string;
  type: string;
  parent_account_id: string | null;
  branding_json: { name?: string; primaryColor?: string; logoUrl?: string } | null;
  custom_domain: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
  account: Account;
  role: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  tags: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  created_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: string[];
  created_at: string;
}

export interface Deal {
  id: string;
  title: string;
  pipeline_id: string;
  stage: string;
  contact_id: string | null;
  value: number;
  status: "open" | "won" | "lost";
  created_at: string;
  updated_at: string;
}

export interface SlotRule {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface Appointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "cancelled" | "completed";
  contact_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  notes: string | null;
  meeting_link: string | null;
  created_at: string;
}

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject: string | null;
  body_template: string;
  status: "draft" | "sending" | "sent" | "failed";
  audience_filter: Record<string, unknown> | null;
  created_at: string;
  recipient_count: number;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
}

export interface Invoice {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "void";
  stripe_checkout_session_id: string | null;
  due_date: string | null;
  description: string | null;
  created_at: string;
  line_items: InvoiceLine[];
  checkout_url?: string | null;
}

export interface FunnelPage {
  id: string;
  title: string;
  slug: string;
  blocks_json: Array<Record<string, unknown>>;
  published: boolean;
  created_at: string;
  updated_at: string;
  submission_count: number;
}

export interface AgencyStats {
  account_id: string;
  account_name: string;
  tickets: number;
  contacts: number;
  deals: number;
  appointments: number;
  campaigns: number;
  invoices: number;
  funnel_submissions: number;
}
