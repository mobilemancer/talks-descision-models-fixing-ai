// Fictional support tickets for a fictional bookshop ("Northwind Books").

export const TEAMS = {
  billing: "Charges, invoices, refunds and payment problems",
  technical: "Bugs, errors, crashes and outages in the app or website",
  account: "Logging in, passwords, profile and account settings",
} as const;
export type Team = keyof typeof TEAMS;
export const TEAM_NAMES = Object.keys(TEAMS) as Team[];

/** Deliberately ambiguous – touches billing, technical and account at once. */
export const AMBIGUOUS_TICKET =
  "The app crashed while I was paying, and now I've been charged twice – and I can't log in to check my order.";

export interface Ticket {
  id: string;
  text: string;
  expected: Team; // what a human agent would pick
}

export const TICKETS: Ticket[] = [
  { id: "T1", expected: "billing", text: "I was charged twice for order #10482. Please refund one of the payments." },
  { id: "T2", expected: "technical", text: "The export button crashes the settings page in Safari. It works in Chrome." },
  { id: "T3", expected: "account", text: "I changed my email address and now the password reset link never arrives." },
  { id: "T4", expected: "billing", text: "Where can I download the invoice for last month? Our accountant needs it." },
  { id: "T5", expected: "technical", text: "Checkout shows '500 Internal Server Error' every time I click Pay." },
  { id: "T6", expected: "account", text: "Please delete my account and all my personal data." },
  { id: "T7", expected: "technical", text: "Search returns nothing since this morning, even for books I know you have." },
  { id: "T8", expected: "billing", text: AMBIGUOUS_TICKET },
];

export const SEVERITY_LEVELS = [
  "Cosmetic only – nothing is blocked",
  "Annoying, but there is a workaround",
  "Blocks some users or one important flow",
  "Blocks everyone – the product is unusable",
];
