/**
 * The API client used by the public demo build. Reads return fixed sample data;
 * writes reject with the same note the disabled buttons show. It satisfies the
 * live client's type, so any change to an endpoint's types must be mirrored here.
 */
import { DEMO_WRITE_TOOLTIP } from "../lib/demo";
import type { TicketListItem } from "../types";
import type { Api } from "./client";
import {
  SAMPLE_ACCOUNT,
  SAMPLE_AGENCY_STATS,
  SAMPLE_APPOINTMENTS,
  SAMPLE_AVAILABILITY,
  SAMPLE_CAMPAIGNS,
  SAMPLE_COMPANIES,
  SAMPLE_CONTACTS,
  SAMPLE_DEALS,
  SAMPLE_FUNNELS,
  SAMPLE_INVOICES,
  SAMPLE_ME,
  SAMPLE_PIPELINES,
  SAMPLE_SETTINGS,
  SAMPLE_SLOT_RULES,
  SAMPLE_SUB_ACCOUNTS,
  SAMPLE_TICKETS,
} from "./sampleData";

function read<T>(value: T): Promise<T> {
  return Promise.resolve(structuredClone(value));
}

function notFound(what: string): Promise<never> {
  return Promise.reject(new Error(`${what} not found in the sample data`));
}

function locked(): Promise<never> {
  return Promise.reject(new Error(DEMO_WRITE_TOOLTIP));
}

function toListItem({ body: _b, drafts: _d, logs: _l, contact_id: _c, ...item }: (typeof SAMPLE_TICKETS)[number]): TicketListItem {
  return item;
}

const byNewest = <T extends { created_at: string }>(rows: T[]) =>
  [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));

export const demoApi: Api = {
  signup: locked,
  login: locked,
  demoSignIn: locked,
  me: () => read(SAMPLE_ME),
  updateAccount: locked,
  listSubAccounts: () => read(SAMPLE_SUB_ACCOUNTS),
  createSubAccount: locked,
  switchAccount: locked,

  listTickets: (status) =>
    read(byNewest(SAMPLE_TICKETS.filter((t) => !status || t.status === status)).map(toListItem)),
  getTicket: (ticketId) => {
    const ticket = SAMPLE_TICKETS.find((t) => t.id === ticketId);
    return ticket ? read(ticket) : notFound("Ticket");
  },
  createTicket: locked,
  approveTicket: locked,
  rejectTicket: locked,
  getSettings: () => read(SAMPLE_SETTINGS),
  updateSettings: locked,
  askAssistant: locked,

  listContacts: (q) => {
    const needle = (q || "").trim().toLowerCase();
    return read(
      SAMPLE_CONTACTS.filter(
        (c) => !needle || c.name.toLowerCase().includes(needle) || (c.email || "").includes(needle)
      )
    );
  },
  createContact: locked,
  getContact: (contactId) => {
    const contact = SAMPLE_CONTACTS.find((c) => c.id === contactId);
    return contact ? read(contact) : notFound("Contact");
  },
  updateContact: locked,
  contactTickets: (contactId) =>
    read(byNewest(SAMPLE_TICKETS.filter((t) => t.contact_id === contactId)).map(toListItem)),
  listCompanies: () => read(SAMPLE_COMPANIES),
  createCompany: locked,
  listPipelines: () => read(SAMPLE_PIPELINES),
  listDeals: (pipelineId) =>
    read(SAMPLE_DEALS.filter((d) => !pipelineId || d.pipeline_id === pipelineId)),
  createDeal: locked,
  updateDeal: locked,

  listSlotRules: () => read(SAMPLE_SLOT_RULES),
  createSlotRule: locked,
  deleteSlotRule: locked,
  listAppointments: () => read(SAMPLE_APPOINTMENTS),
  createAppointment: locked,
  cancelAppointment: locked,
  publicAvailability: () => read(SAMPLE_AVAILABILITY),
  publicBook: locked,

  listCampaigns: () => read(SAMPLE_CAMPAIGNS),
  createCampaign: locked,
  sendCampaign: locked,

  listInvoices: () => read(SAMPLE_INVOICES),
  createInvoice: locked,
  invoiceCheckout: locked,
  markInvoicePaid: locked,

  listFunnels: () => read(SAMPLE_FUNNELS),
  createFunnel: locked,
  updateFunnel: locked,
  publicFunnel: (accountSlug, pageSlug) => {
    const page = SAMPLE_FUNNELS.find((f) => f.slug === pageSlug && f.published);
    return accountSlug === SAMPLE_ACCOUNT.slug && page ? read(page) : notFound("Page");
  },
  submitFunnel: locked,

  agencyStats: () => read(SAMPLE_AGENCY_STATS),
};
