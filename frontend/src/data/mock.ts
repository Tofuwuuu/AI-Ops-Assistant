/**
 * Demo / placeholder content for pages that do not yet have backend endpoints.
 * Replace with real API calls when Inbox, Workflow config, and Analytics aggregates ship.
 */

export const mockInboxConversation = {
  customer: {
    name: "Sarah Mitchell",
    email: "sarah.mitchell@example.com",
    initials: "SM",
  },
  messages: [
    {
      id: "1",
      from: "customer" as const,
      text: "Hi, I was charged twice for my subscription and the checkout page showed an error the first time. Can someone help?",
      at: "10:14 AM",
    },
    {
      id: "2",
      from: "agent" as const,
      text: "Thanks, Sarah. I'm reviewing your request now.",
      at: "10:15 AM",
    },
    {
      id: "3",
      from: "customer" as const,
      text: "I also didn't get any invoice in email.",
      at: "10:16 AM",
    },
  ],
  copilot: {
    summary:
      "Customer reports duplicate billing attempt during checkout and missing invoice email.",
    intents: [
      { label: "Billing Issue", tone: "blue" as const },
      { label: "Possible Duplicate Charge", tone: "rose" as const },
      { label: "Invoice Request", tone: "slate" as const },
    ],
    nextSteps: [
      "Verify payment logs for duplicate transaction.",
      "Check invoice email delivery status.",
      "Refund duplicate charge if confirmed.",
      "Send invoice manually.",
    ],
    draft:
      "Hi Sarah, thanks for flagging this. I've checked your account and we're reviewing the duplicate charge attempt. I'll also send your invoice separately and update you shortly.",
  },
};

export const mockAiAssistant = {
  issue:
    "Customer asks whether plan upgrades are prorated and how team seats are billed.",
  answer:
    "Upgrades are prorated automatically based on remaining billing cycle days. Additional team seats are billed at the new plan rate from the day they're added.",
  knowledgeSources: [
    {
      title: "Billing & Invoices",
      description: "Invoices, payment methods, and refund policy.",
      relevance: 86,
      updated: "2 days ago",
    },
    {
      title: "Password Reset",
      description: "Account security and password recovery steps.",
      relevance: 72,
      updated: "5 days ago",
    },
    {
      title: "Reporting Bugs",
      description: "How to file bugs and severity guidelines.",
      relevance: 51,
      updated: "1 week ago",
    },
    {
      title: "Feature Requests",
      description: "Submitting and tracking product ideas.",
      relevance: 47,
      updated: "2 weeks ago",
    },
  ],
};

export const mockWorkflowRules = [
  {
    title: "Conditional Logic",
    rule: "If confidence > 90%, Auto-suggest reply",
    tone: "violet" as const,
  },
  {
    title: "Routing Rule",
    rule: "If refund intent detected, Escalate to billing",
    tone: "amber" as const,
  },
  {
    title: "Sentiment Override",
    rule: "If sentiment = frustrated, Priority = high",
    tone: "teal" as const,
  },
  {
    title: "Tier Assignment",
    rule: "If enterprise customer, Assign to senior agent",
    tone: "orange" as const,
  },
];

export const mockSentimentTrend = [
  { week: "W1", Positive: 62, Neutral: 28, Negative: 10 },
  { week: "W2", Positive: 58, Neutral: 30, Negative: 12 },
  { week: "W3", Positive: 65, Neutral: 25, Negative: 10 },
  { week: "W4", Positive: 70, Neutral: 22, Negative: 8 },
];

export const mockAiImpact = [
  { day: "Mon", Draft: 24, Macros: 12, Routing: 18, Knowledge: 30 },
  { day: "Tue", Draft: 28, Macros: 14, Routing: 20, Knowledge: 26 },
  { day: "Wed", Draft: 32, Macros: 10, Routing: 22, Knowledge: 34 },
  { day: "Thu", Draft: 26, Macros: 16, Routing: 19, Knowledge: 28 },
  { day: "Fri", Draft: 35, Macros: 18, Routing: 24, Knowledge: 36 },
];

export const mockTopPerformers = [
  { name: "Ava Turner", role: "Senior Agent", tickets: 142, initials: "AT" },
  { name: "James Cole", role: "Support Lead", tickets: 128, initials: "JC" },
  { name: "Mia Watson", role: "Agent", tickets: 116, initials: "MW" },
  { name: "Lucas Hall", role: "Agent", tickets: 98, initials: "LH" },
];

export const pipelineSteps = [
  {
    id: "ingest",
    title: "Ticket Received",
    detail: "NEW TICKET CREATED IN ARCHIVIST",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    id: "classify",
    title: "Intent Detected",
    detail: "CLASSIFY → bug / billing / how-to / feature",
    color: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    id: "retrieve",
    title: "Knowledge Retrieve",
    detail: "KEYWORD SEARCH OVER KB DOCS",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    id: "reason",
    title: "Reason & Decide",
    detail: "ANSWER · CLARIFY · OR ESCALATE",
    color: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    id: "generate",
    title: "AI Draft Generated",
    detail: "DRAFT REPLY + CONFIDENCE SCORE",
    color: "bg-brand-100 text-brand-700 border-brand-200",
  },
  {
    id: "validate",
    title: "Validate Safety",
    detail: "SECRETS · TOXICITY · EMPTY CHECKS",
    color: "bg-rose-100 text-rose-700 border-rose-200",
  },
  {
    id: "persist",
    title: "Persist Draft",
    detail: "SAVE TO POSTGRES + AGENT LOGS",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    id: "handoff",
    title: "Human Approval",
    detail: "NEEDS REVIEW BEFORE SEND",
    color: "bg-teal-100 text-teal-700 border-teal-200",
  },
];
