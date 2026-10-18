/**
 * Fixed sample data for the public demo (VITE_DEMO_MODE=true).
 *
 * Everything here is made up: example.com addresses, invented names, no real
 * customers. Each value is typed against the same response types the live API
 * client returns, so changing a type in ../types breaks the build here too.
 */
import type {
  Account,
  AgencyStats,
  Appointment,
  AppSettings,
  AuthUser,
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
  TicketCategory,
  TicketStatus,
} from "../types";

const NOW = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

function ahead(ms: number): string {
  return new Date(NOW + ms).toISOString();
}

function id(prefix: string, n: number): string {
  return `00000000-0000-4000-8000-${prefix}${String(n).padStart(12 - prefix.length, "0")}`;
}

export const SAMPLE_USER: AuthUser = {
  id: id("u", 1),
  email: "admin@demo.example.com",
  display_name: "Demo Admin",
};

export const SAMPLE_ACCOUNT: Account = {
  id: id("a", 1),
  name: "Demo Agency",
  slug: "demo-agency",
  type: "agency",
  parent_account_id: null,
  branding_json: { name: "Archivist", primaryColor: "#2563eb" },
  custom_domain: null,
  created_at: ago(30 * DAY),
};

export const SAMPLE_SUB_ACCOUNTS: Account[] = [
  {
    id: id("a", 2),
    name: "Northwind Sample Studio",
    slug: "northwind-sample",
    type: "sub_account",
    parent_account_id: SAMPLE_ACCOUNT.id,
    branding_json: { name: "Northwind Sample Studio", primaryColor: "#0d9488" },
    custom_domain: null,
    created_at: ago(20 * DAY),
  },
  {
    id: id("a", 3),
    name: "Placeholder Bakery Co",
    slug: "placeholder-bakery",
    type: "sub_account",
    parent_account_id: SAMPLE_ACCOUNT.id,
    branding_json: { name: "Placeholder Bakery Co", primaryColor: "#d97706" },
    custom_domain: null,
    created_at: ago(12 * DAY),
  },
];

export const SAMPLE_ACCOUNTS: Account[] = [SAMPLE_ACCOUNT, ...SAMPLE_SUB_ACCOUNTS];

export const SAMPLE_ME = {
  user: SAMPLE_USER,
  account: SAMPLE_ACCOUNT,
  role: "owner",
  accounts: SAMPLE_ACCOUNTS,
};

export const SAMPLE_SETTINGS: AppSettings = {
  notify_email: true,
  notify_slack: false,
  require_human_review: true,
  ask_clarifying_threshold: 0.45,
  bug_escalate_threshold: 0.7,
  sentiment_priority_threshold: 0.5,
  tier_ticket_share_threshold: 0.2,
  updated_at: ago(2 * DAY),
};

export const SAMPLE_COMPANIES: Company[] = [
  { id: id("co", 1), name: "Northwind Sample Studio", domain: "northwind.example.com", created_at: ago(25 * DAY) },
  { id: id("co", 2), name: "Placeholder Bakery Co", domain: "bakery.example.com", created_at: ago(18 * DAY) },
  { id: id("co", 3), name: "Fictional Freight Ltd", domain: "freight.example.com", created_at: ago(9 * DAY) },
];

const CONTACT_ROWS: [string, string, string | null, number | null, string][] = [
  ["Pat Example", "pat@example.com", "+1 555 0101", 0, "vip,newsletter"],
  ["Sam Placeholder", "sam@example.com", "+1 555 0102", 1, "trial"],
  ["Riley Sample", "riley@northwind.example.com", null, 0, "customer"],
  ["Jordan Testcase", "jordan@bakery.example.com", "+1 555 0104", 1, "customer,billing"],
  ["Casey Mockwell", "casey@freight.example.com", "+1 555 0105", 2, "lead"],
  ["Morgan Dummy", "morgan@example.com", null, null, "newsletter"],
  ["Avery Fakename", "avery@example.com", "+1 555 0107", 2, "lead,webinar"],
  ["Quinn Notreal", "quinn@example.com", null, null, "trial"],
];

export const SAMPLE_CONTACTS: Contact[] = CONTACT_ROWS.map(([name, email, phone, company, tags], i) => ({
  id: id("c", i + 1),
  name,
  email,
  phone,
  company_id: company == null ? null : SAMPLE_COMPANIES[company].id,
  tags,
  custom_fields: { source: i % 2 === 0 ? "funnel" : "manual" },
  created_at: ago((i + 1) * 2 * DAY),
}));

interface TicketSeed {
  subject: string;
  body: string;
  contact: number;
  category: TicketCategory | null;
  status: TicketStatus;
  confidence: number | null;
  decision: string | null;
  draft: string | null;
  kb: string[];
  ageMinutes: number;
  handledMinutes: number;
}

const TICKET_SEEDS: TicketSeed[] = [
  {
    subject: "Charged twice for the October invoice",
    body: "Hi, my card shows two charges of $49 for the same October invoice. Can you refund the duplicate? This is sample text.",
    contact: 3,
    category: "billing",
    status: "needs_review",
    confidence: 0.82,
    decision: "answer_directly",
    draft:
      "Thanks for flagging this, Jordan. I can see two charges for invoice INV-SAMPLE-1042. I've requested a refund for the duplicate, and it should reach your card in 5 to 10 business days.",
    kb: ["Billing and invoices"],
    ageMinutes: 25,
    handledMinutes: 2,
  },
  {
    subject: "Export to CSV button does nothing",
    body: "When I click Export on the reports page nothing downloads. Chrome, latest version. Sample ticket for the demo.",
    contact: 2,
    category: "bug",
    status: "needs_review",
    confidence: 0.58,
    decision: "escalate",
    draft:
      "Thanks for the report, Riley. I've passed this to our engineering team with your browser details, and a specialist will follow up within one business day.",
    kb: ["Reporting bugs"],
    ageMinutes: 50,
    handledMinutes: 3,
  },
  {
    subject: "How do I reset my password?",
    body: "I forgot my password and the reset email never came. What should I do? (Sample ticket.)",
    contact: 0,
    category: "how-to",
    status: "approved",
    confidence: 0.93,
    decision: "answer_directly",
    draft:
      "Hi Pat, you can reset it from the sign-in page with Forgot password. If the email doesn't arrive in 5 minutes, check your spam folder or reply here and we'll send a manual link.",
    kb: ["Password reset"],
    ageMinutes: 3 * 60,
    handledMinutes: 4,
  },
  {
    subject: "Feature request: dark mode",
    body: "Would love a dark mode for late-night shifts. Sample request.",
    contact: 5,
    category: "feature",
    status: "approved",
    confidence: 0.88,
    decision: "answer_directly",
    draft:
      "Thanks, Morgan! Dark mode is on our roadmap. I've added your vote, and we'll let you know when it ships.",
    kb: ["Feature requests"],
    ageMinutes: 5 * 60,
    handledMinutes: 6,
  },
  {
    subject: "Need a copy of last month's receipt",
    body: "Can you send me a PDF receipt for September? Our accountant needs it. Sample ticket.",
    contact: 1,
    category: "billing",
    status: "approved",
    confidence: 0.9,
    decision: "answer_directly",
    draft:
      "Hi Sam, you can download every receipt from Settings, then Billing. I've also attached the September receipt to this reply.",
    kb: ["Billing and invoices"],
    ageMinutes: 8 * 60,
    handledMinutes: 5,
  },
  {
    subject: "Something is wrong",
    body: "It is not working. Sample ticket with no detail.",
    contact: 7,
    category: "unknown",
    status: "needs_review",
    confidence: 0.32,
    decision: "ask_clarifying",
    draft:
      "Hi Quinn, sorry for the trouble. Could you tell us which page you were on, what you expected to happen, and what happened instead?",
    kb: [],
    ageMinutes: 70,
    handledMinutes: 2,
  },
  {
    subject: "Dashboard loads slowly in the morning",
    body: "Every morning around 9am the dashboard takes 20 seconds to load. Sample bug report.",
    contact: 4,
    category: "bug",
    status: "rejected",
    confidence: 0.61,
    decision: "escalate",
    draft:
      "Thanks, Casey. I've escalated this to engineering with the time window you mentioned.",
    kb: ["Reporting bugs"],
    ageMinutes: 26 * 60,
    handledMinutes: 9,
  },
  {
    subject: "Can I add a teammate to my plan?",
    body: "How do I invite a coworker so they can see our tickets? Sample question.",
    contact: 6,
    category: "how-to",
    status: "approved",
    confidence: 0.86,
    decision: "answer_directly",
    draft:
      "Hi Avery, go to Settings, then Team, and choose Invite. Your teammate gets an email link to join.",
    kb: [],
    ageMinutes: 30 * 60,
    handledMinutes: 7,
  },
  {
    subject: "Upgrade to the annual plan",
    body: "We'd like to switch to annual billing. Is there a discount? Sample ticket.",
    contact: 3,
    category: "billing",
    status: "drafted",
    confidence: 0.77,
    decision: "answer_directly",
    draft: null,
    kb: ["Billing and invoices"],
    ageMinutes: 4,
    handledMinutes: 1,
  },
  {
    subject: "Webhook retries keep failing",
    body: "Our webhook endpoint returns 200 but you keep retrying. Sample bug report.",
    contact: 2,
    category: "bug",
    status: "failed",
    confidence: 0.4,
    decision: "escalate",
    draft: null,
    kb: [],
    ageMinutes: 2 * DAY / MIN,
    handledMinutes: 12,
  },
  {
    subject: "Integrate with a calendar app?",
    body: "Do you support syncing appointments with a calendar app? Sample feature request.",
    contact: 0,
    category: "feature",
    status: "approved",
    confidence: 0.84,
    decision: "answer_directly",
    draft:
      "Hi Pat, calendar sync is available on the Calendar page. Connect your calendar and new bookings appear there automatically.",
    kb: ["Feature requests"],
    ageMinutes: 3 * DAY / MIN,
    handledMinutes: 8,
  },
  {
    subject: "New ticket from the help widget",
    body: "Hello, testing the widget. Sample ticket still in the queue.",
    contact: 5,
    category: null,
    status: "pending",
    confidence: null,
    decision: null,
    draft: null,
    kb: [],
    ageMinutes: 1,
    handledMinutes: 0,
  },
];

function buildTicket(seed: TicketSeed, i: number): Ticket {
  const ticketId = id("t", i + 1);
  const created = NOW - seed.ageMinutes * MIN;
  const at = (offsetSec: number) => new Date(created + offsetSec * 1000).toISOString();
  const logs: Ticket["logs"] = [
    { id: `${ticketId}-l1`, step: "ingest", input_json: null, output_json: { received: true }, created_at: at(1) },
  ];
  if (seed.category) {
    logs.push(
      {
        id: `${ticketId}-l2`,
        step: "classify",
        input_json: null,
        output_json: { category: seed.category, confidence: seed.confidence },
        created_at: at(3),
      },
      { id: `${ticketId}-l3`, step: "retrieve", input_json: null, output_json: { titles: seed.kb }, created_at: at(5) },
      { id: `${ticketId}-l4`, step: "reason", input_json: null, output_json: { decision: seed.decision }, created_at: at(6) }
    );
  }
  if (seed.draft) {
    logs.push(
      {
        id: `${ticketId}-l5`,
        step: "generate",
        input_json: null,
        output_json: { confidence: seed.confidence },
        created_at: at(9),
      },
      { id: `${ticketId}-l6`, step: "validate", input_json: null, output_json: { ok: true }, created_at: at(10) },
      { id: `${ticketId}-l7`, step: "persist", input_json: null, output_json: { status: "needs_review" }, created_at: at(11) },
      { id: `${ticketId}-l8`, step: "handoff", input_json: null, output_json: { notified: true }, created_at: at(12) }
    );
  }
  if (seed.status === "failed") {
    logs.push({
      id: `${ticketId}-l9`,
      step: "validate",
      input_json: null,
      output_json: { ok: false, reasons: ["low confidence"] },
      created_at: at(10),
    });
  }
  const contact = SAMPLE_CONTACTS[seed.contact];
  return {
    id: ticketId,
    subject: seed.subject,
    body: seed.body,
    requester_email: contact.email ?? "someone@example.com",
    contact_id: contact.id,
    category: seed.category,
    status: seed.status,
    confidence: seed.confidence,
    reason_decision: seed.decision,
    created_at: new Date(created).toISOString(),
    updated_at: new Date(created + seed.handledMinutes * MIN).toISOString(),
    drafts: seed.draft
      ? [
          {
            id: `${ticketId}-d1`,
            content: seed.draft,
            confidence: seed.confidence ?? 0,
            version: 1,
            created_at: at(9),
          },
        ]
      : [],
    logs,
  };
}

export const SAMPLE_TICKETS: Ticket[] = TICKET_SEEDS.map(buildTicket);

export const SAMPLE_PIPELINES: Pipeline[] = [
  {
    id: id("p", 1),
    name: "Sales",
    stages: ["Lead", "Qualified", "Proposal", "Won"],
    created_at: ago(30 * DAY),
  },
];

const DEAL_ROWS: [string, string, number, number, Deal["status"]][] = [
  ["Website refresh for Northwind", "Proposal", 2, 4800, "open"],
  ["Bakery loyalty program", "Qualified", 3, 2200, "open"],
  ["Freight tracking portal", "Lead", 4, 9500, "open"],
  ["Support retainer, Q4", "Won", 0, 3600, "won"],
  ["Newsletter setup", "Lead", 5, 900, "open"],
  ["Webinar funnel", "Proposal", 6, 1500, "open"],
  ["Chatbot pilot", "Qualified", 1, 2750, "open"],
  ["Annual SEO package", "Won", 3, 6000, "won"],
];

export const SAMPLE_DEALS: Deal[] = DEAL_ROWS.map(([title, stage, contact, value, status], i) => ({
  id: id("d", i + 1),
  title,
  pipeline_id: SAMPLE_PIPELINES[0].id,
  stage,
  contact_id: SAMPLE_CONTACTS[contact].id,
  value,
  status,
  created_at: ago((i + 2) * DAY),
  updated_at: ago(i * HOUR),
}));

export const SAMPLE_SLOT_RULES: SlotRule[] = [1, 2, 3, 4, 5].map((weekday) => ({
  id: id("r", weekday),
  weekday,
  start_time: "09:00",
  end_time: weekday === 5 ? "13:00" : "17:00",
  duration_minutes: 30,
}));

function atHour(dayOffset: number, hour: number): number {
  const d = new Date(NOW + dayOffset * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

const APPOINTMENT_ROWS: [number, number, number, Appointment["status"], string][] = [
  [1, 10, 0, "booked", "Kickoff call (sample)"],
  [1, 14, 2, "booked", "Proposal walkthrough (sample)"],
  [2, 11, 4, "booked", "Discovery call (sample)"],
  [3, 15, 6, "booked", "Webinar prep (sample)"],
  [-1, 9, 3, "completed", "Billing review (sample)"],
  [-2, 16, 1, "cancelled", "Onboarding (sample)"],
];

export const SAMPLE_APPOINTMENTS: Appointment[] = APPOINTMENT_ROWS.map(
  ([dayOffset, hour, contact, status, notes], i) => {
    const start = atHour(dayOffset, hour);
    const c = SAMPLE_CONTACTS[contact];
    return {
      id: id("ap", i + 1),
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(start + 30 * MIN).toISOString(),
      status,
      contact_id: c.id,
      guest_name: c.name,
      guest_email: c.email,
      notes,
      meeting_link: "https://meet.example.com/sample-room",
      created_at: ago((i + 1) * DAY),
    };
  }
);

export const SAMPLE_AVAILABILITY: AvailabilitySlot[] = [1, 2, 3].flatMap((dayOffset) =>
  [9, 10, 13].map((hour) => {
    const start = atHour(dayOffset, hour);
    return { starts_at: new Date(start).toISOString(), ends_at: new Date(start + 30 * MIN).toISOString() };
  })
);

export const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: id("cp", 1),
    name: "October newsletter",
    channel: "email",
    subject: "What's new this month (sample)",
    body_template: "Hi {{name}}, here is a sample newsletter.",
    status: "sent",
    audience_filter: { tags: "newsletter" },
    created_at: ago(6 * DAY),
    recipient_count: 3,
  },
  {
    id: id("cp", 2),
    name: "Trial ending reminder",
    channel: "email",
    subject: "Your trial ends soon (sample)",
    body_template: "Hi {{name}}, your sample trial ends in 3 days.",
    status: "draft",
    audience_filter: { tags: "trial" },
    created_at: ago(2 * DAY),
    recipient_count: 2,
  },
  {
    id: id("cp", 3),
    name: "Appointment reminder",
    channel: "sms",
    subject: null,
    body_template: "Hi {{name}}, reminder about your sample call tomorrow.",
    status: "sent",
    audience_filter: null,
    created_at: ago(DAY),
    recipient_count: 4,
  },
];

const INVOICE_ROWS: [number, string, Invoice["status"], [string, number, number][], number][] = [
  [3, "Sample invoice for testing. Not a real charge.", "open", [["Sample service hours", 2, 60]], 5],
  [0, "Support retainer, October (sample)", "paid", [["Monthly retainer", 1, 1200]], 12],
  [2, "Website refresh deposit (sample)", "open", [["Design deposit", 1, 1600], ["Discovery workshop", 1, 400]], 3],
  [6, "Webinar funnel setup (sample)", "draft", [["Funnel build", 1, 750]], 1],
  [1, "Chatbot pilot, phase 1 (sample)", "paid", [["Pilot setup", 1, 950], ["Training session", 2, 150]], 20],
];

export const SAMPLE_INVOICES: Invoice[] = INVOICE_ROWS.map(([contact, description, status, lines, ageDays], i) => {
  const invId = id("i", i + 1);
  const line_items = lines.map(([desc, quantity, unit_amount], j) => ({
    id: `${invId}-${j + 1}`,
    description: desc,
    quantity,
    unit_amount,
  }));
  return {
    id: invId,
    contact_id: SAMPLE_CONTACTS[contact].id,
    deal_id: null,
    amount: line_items.reduce((s, l) => s + l.quantity * l.unit_amount, 0),
    currency: "usd",
    status,
    stripe_checkout_session_id: null,
    due_date: ahead((14 - ageDays) * DAY),
    description,
    created_at: ago(ageDays * DAY),
    line_items,
    checkout_url: null,
  };
});

export const SAMPLE_FUNNELS: FunnelPage[] = [
  {
    id: id("f", 1),
    title: "Free consultation",
    slug: "free-consultation",
    blocks_json: [
      { type: "hero", headline: "Book a free consultation", subhead: "Sample landing page." },
      { type: "form", fields: ["name", "email", "phone"] },
    ],
    published: true,
    created_at: ago(15 * DAY),
    updated_at: ago(3 * DAY),
    submission_count: 14,
  },
  {
    id: id("f", 2),
    title: "Webinar signup",
    slug: "webinar-signup",
    blocks_json: [
      { type: "hero", headline: "Join our sample webinar", subhead: "Made-up event for the demo." },
      { type: "form", fields: ["name", "email"] },
    ],
    published: true,
    created_at: ago(8 * DAY),
    updated_at: ago(DAY),
    submission_count: 6,
  },
  {
    id: id("f", 3),
    title: "Holiday promo (draft)",
    slug: "holiday-promo",
    blocks_json: [{ type: "hero", headline: "Holiday sample offer", subhead: "Not published yet." }],
    published: false,
    created_at: ago(2 * DAY),
    updated_at: ago(2 * DAY),
    submission_count: 0,
  },
];

export const SAMPLE_AGENCY_STATS: AgencyStats[] = [
  {
    account_id: SAMPLE_ACCOUNT.id,
    account_name: SAMPLE_ACCOUNT.name,
    tickets: SAMPLE_TICKETS.length,
    contacts: SAMPLE_CONTACTS.length,
    deals: SAMPLE_DEALS.length,
    appointments: SAMPLE_APPOINTMENTS.length,
    campaigns: SAMPLE_CAMPAIGNS.length,
    invoices: SAMPLE_INVOICES.length,
    funnel_submissions: 20,
  },
  {
    account_id: SAMPLE_SUB_ACCOUNTS[0].id,
    account_name: SAMPLE_SUB_ACCOUNTS[0].name,
    tickets: 7,
    contacts: 15,
    deals: 4,
    appointments: 3,
    campaigns: 1,
    invoices: 2,
    funnel_submissions: 9,
  },
  {
    account_id: SAMPLE_SUB_ACCOUNTS[1].id,
    account_name: SAMPLE_SUB_ACCOUNTS[1].name,
    tickets: 3,
    contacts: 22,
    deals: 2,
    appointments: 5,
    campaigns: 2,
    invoices: 4,
    funnel_submissions: 31,
  },
];
