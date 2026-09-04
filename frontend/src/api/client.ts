import type {
  Account,
  AgencyStats,
  Appointment,
  AppSettings,
  AppSettingsUpdate,
  AssistantAnswer,
  AuthSession,
  AvailabilitySlot,
  Campaign,
  Company,
  Contact,
  Deal,
  FunnelPage,
  Invoice,
  Pipeline,
  SlotRule,
  Ticket,
  TicketCreatePayload,
  TicketListItem,
  TicketStatus,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TOKEN_KEY = "aiops_token";
const ACCOUNT_KEY = "aiops_account_id";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(ACCOUNT_KEY, session.account.id);
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ACCOUNT_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const accountId = localStorage.getItem(ACCOUNT_KEY);
  if (accountId) headers["X-Account-Id"] = accountId;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearStoredAuth();
    if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/signup") && !window.location.pathname.startsWith("/book") && !window.location.pathname.startsWith("/f/")) {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  signup: (payload: {
    email: string;
    password: string;
    display_name?: string;
    account_name: string;
  }) =>
    request<AuthSession>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () =>
    request<{ user: AuthSession["user"]; account: Account; role: string; accounts: Account[] }>(
      "/auth/me"
    ),
  updateAccount: (payload: Partial<Account>) =>
    request<Account>("/auth/account", { method: "PUT", body: JSON.stringify(payload) }),
  listSubAccounts: () => request<Account[]>("/auth/sub-accounts"),
  createSubAccount: (payload: { name: string; slug?: string }) =>
    request<Account>("/auth/sub-accounts", { method: "POST", body: JSON.stringify(payload) }),
  switchAccount: (accountId: string) =>
    request<AuthSession>(`/auth/switch/${accountId}`, { method: "POST" }),

  listTickets: (status?: TicketStatus | "") => {
    const qs = status ? `?status_filter=${encodeURIComponent(status)}` : "";
    return request<TicketListItem[]>(`/tickets${qs}`);
  },
  getTicket: (id: string) => request<Ticket>(`/tickets/${id}`),
  createTicket: (payload: TicketCreatePayload) =>
    request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(payload) }),
  approveTicket: (id: string) =>
    request<Ticket>(`/tickets/${id}/approve`, { method: "PATCH" }),
  rejectTicket: (id: string) =>
    request<Ticket>(`/tickets/${id}/reject`, { method: "PATCH" }),
  getSettings: () => request<AppSettings>("/settings"),
  updateSettings: (payload: AppSettingsUpdate) =>
    request<AppSettings>("/settings", { method: "PUT", body: JSON.stringify(payload) }),
  askAssistant: (question: string) =>
    request<AssistantAnswer>("/assistant/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  listContacts: (q?: string) =>
    request<Contact[]>(`/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createContact: (payload: Partial<Contact> & { name: string }) =>
    request<Contact>("/contacts", { method: "POST", body: JSON.stringify(payload) }),
  getContact: (id: string) => request<Contact>(`/contacts/${id}`),
  updateContact: (id: string, payload: Partial<Contact>) =>
    request<Contact>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  contactTickets: (id: string) => request<TicketListItem[]>(`/contacts/${id}/tickets`),
  listCompanies: () => request<Company[]>("/companies"),
  createCompany: (payload: { name: string; domain?: string }) =>
    request<Company>("/companies", { method: "POST", body: JSON.stringify(payload) }),
  listPipelines: () => request<Pipeline[]>("/pipelines"),
  listDeals: (pipelineId?: string) =>
    request<Deal[]>(`/deals${pipelineId ? `?pipeline_id=${pipelineId}` : ""}`),
  createDeal: (payload: {
    title: string;
    pipeline_id: string;
    stage: string;
    contact_id?: string;
    value?: number;
  }) => request<Deal>("/deals", { method: "POST", body: JSON.stringify(payload) }),
  updateDeal: (id: string, payload: Partial<Deal>) =>
    request<Deal>(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listSlotRules: () => request<SlotRule[]>("/calendar/rules"),
  createSlotRule: (payload: {
    weekday: number;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }) => request<SlotRule>("/calendar/rules", { method: "POST", body: JSON.stringify(payload) }),
  deleteSlotRule: (id: string) => request<void>(`/calendar/rules/${id}`, { method: "DELETE" }),
  listAppointments: () => request<Appointment[]>("/calendar/appointments"),
  createAppointment: (payload: {
    starts_at: string;
    ends_at: string;
    guest_name?: string;
    guest_email?: string;
    notes?: string;
  }) =>
    request<Appointment>("/calendar/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  cancelAppointment: (id: string) =>
    request<Appointment>(`/calendar/appointments/${id}/cancel`, { method: "PATCH" }),
  publicAvailability: (slug: string) =>
    request<AvailabilitySlot[]>(`/calendar/public/${slug}/availability`),
  publicBook: (
    slug: string,
    payload: { starts_at: string; guest_name: string; guest_email: string; notes?: string }
  ) =>
    request<Appointment>(`/calendar/public/${slug}/book`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listCampaigns: () => request<Campaign[]>("/campaigns"),
  createCampaign: (payload: {
    name: string;
    channel: "email" | "sms";
    subject?: string;
    body_template: string;
    contact_ids?: string[];
  }) => request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(payload) }),
  sendCampaign: (id: string) => request<Campaign>(`/campaigns/${id}/send`, { method: "POST" }),

  listInvoices: () => request<Invoice[]>("/payments/invoices"),
  createInvoice: (payload: {
    contact_id?: string;
    description?: string;
    line_items: { description: string; quantity: number; unit_amount: number }[];
  }) =>
    request<Invoice>("/payments/invoices", { method: "POST", body: JSON.stringify(payload) }),
  invoiceCheckout: (id: string) =>
    request<Invoice>(`/payments/invoices/${id}/checkout`, { method: "POST" }),
  markInvoicePaid: (id: string) =>
    request<Invoice>(`/payments/invoices/${id}/mark-paid`, { method: "POST" }),

  listFunnels: () => request<FunnelPage[]>("/funnels"),
  createFunnel: (payload: {
    title: string;
    slug: string;
    blocks_json?: Array<Record<string, unknown>>;
    published?: boolean;
  }) => request<FunnelPage>("/funnels", { method: "POST", body: JSON.stringify(payload) }),
  updateFunnel: (id: string, payload: Partial<FunnelPage>) =>
    request<FunnelPage>(`/funnels/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  publicFunnel: (accountSlug: string, pageSlug: string) =>
    request<FunnelPage>(`/public/funnels/${accountSlug}/${pageSlug}`),
  submitFunnel: (
    accountSlug: string,
    pageSlug: string,
    payload: { name: string; email: string; phone?: string; payload?: Record<string, unknown> }
  ) =>
    request<{ ok: boolean }>(`/public/funnels/${accountSlug}/${pageSlug}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  agencyStats: () => request<AgencyStats[]>("/agency/stats"),
};
