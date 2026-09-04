import type {
  AppSettings,
  AppSettingsUpdate,
  AssistantAnswer,
  Ticket,
  TicketCreatePayload,
  TicketListItem,
  TicketStatus,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
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
  return res.json() as Promise<T>;
}

export const api = {
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
};
