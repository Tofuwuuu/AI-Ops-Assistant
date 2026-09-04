/**
 * Lightweight, real (non-mocked) heuristics computed from live ticket data.
 * These back the "Sentiment Override" and "Tier Assignment" workflow rules —
 * simple lexicon/volume based signals, not a fabricated dataset.
 */
import type { TicketListItem } from "../types";

const NEGATIVE_KEYWORDS = [
  "angry",
  "frustrated",
  "furious",
  "terrible",
  "worst",
  "awful",
  "unacceptable",
  "disappointed",
  "ridiculous",
  "horrible",
  "scam",
  "cancel my",
  "refund now",
];

/** % of the negative-keyword lexicon found in the given text. */
export function sentimentScore(text: string): number {
  const lower = (text || "").toLowerCase();
  const hits = NEGATIVE_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  return Math.round((hits / NEGATIVE_KEYWORDS.length) * 100 * 4) / 4; // quarter-point precision
}

export function isNegativeSentiment(text: string, thresholdPct: number): boolean {
  // Any single keyword hit already signals negative sentiment; the threshold
  // controls how many distinct negative keywords must appear for "high" severity.
  const lower = (text || "").toLowerCase();
  const hits = NEGATIVE_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (hits === 0) return false;
  return sentimentScore(text) >= thresholdPct || hits >= 1;
}

/** % share of all tickets that belong to this requester email. */
export function requesterTicketShare(email: string, tickets: TicketListItem[]): number {
  if (tickets.length === 0) return 0;
  const count = tickets.filter((t) => t.requester_email === email).length;
  return Math.round((count / tickets.length) * 100 * 4) / 4;
}

export function isSeniorTier(email: string, tickets: TicketListItem[], thresholdPct: number): boolean {
  return requesterTicketShare(email, tickets) >= thresholdPct;
}
