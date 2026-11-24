// DEMO 1 – "Same ticket, ten times"
// Ask an LLM (in Foundry) to route one ambiguous ticket ten times, and to say how sure it is.
// Shows: latency, varying answers, text that needs parsing, and self-reported confidence.

import { llm, parseLabel, parseStatedConfidence } from "./lib/llm.js";
import { AMBIGUOUS_TICKET, TEAMS, TEAM_NAMES } from "./data/tickets.js";
import { c, maybeRecord, median, ms, section, table, title } from "./lib/ui.js";

maybeRecord("demo1");
const RUNS = Number(process.argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 10);
const model = llm();

const system = [
  "You route customer support tickets for an online bookshop.",
  "Teams:",
  ...Object.entries(TEAMS).map(([k, v]) => `- ${k}: ${v}`),
  "Answer with the team that should handle the ticket, and how confident you are as a percentage.",
].join("\n");

title("Demo 1 · Same ticket, ten times", `${model.name} · ${RUNS} calls`);
console.log(c.bold("Ticket: ") + `"${AMBIGUOUS_TICKET}"\n`);

const rows: string[][] = [];
const results: { label?: string; status: string; conf?: number; ms: number; out?: number }[] = [];

for (let i = 1; i <= RUNS; i++) {
  const r = await model.ask(system, AMBIGUOUS_TICKET);
  const parsed = parseLabel(r.text, TEAM_NAMES);
  const conf = parseStatedConfidence(r.text);
  results.push({ label: parsed.label, status: parsed.status, conf, ms: r.ms, out: r.outputTokens });

  const statusColour = parsed.status === "exact" ? c.green : parsed.status === "cleaned up" ? c.yellow : c.red;
  const raw = r.text.replace(/\s+/g, " ");
  rows.push([
    String(i),
    ms(r.ms),
    parsed.label ? c.bold(parsed.label) : c.red("?"),
    statusColour(parsed.status),
    conf !== undefined ? `${Math.round(conf * 100)}%` : c.dim("–"),
    c.dim(raw.length > 70 ? raw.slice(0, 67) + "…" : raw),
  ]);
  // Print as we go so the audience feels the latency.
  console.log(`  call ${i}: ${ms(r.ms)}  →  ${parsed.label ?? c.red("could not parse")}`);
}

section(`All ${RUNS} answers`);
table(["#", "latency", "team", "parse", "says", "raw reply"], rows);

section("Summary");
const counts = new Map<string, number>();
results.forEach((r) => counts.set(r.label ?? "(unparseable)", (counts.get(r.label ?? "(unparseable)") ?? 0) + 1));
const confs = results.map((r) => r.conf).filter((x): x is number => x !== undefined);
const needsWork = results.filter((r) => r.status !== "exact").length;
const outTokens = results.reduce((s, r) => s + (r.out ?? 0), 0);

console.log(`  Different answers:     ${c.bold(counts.size)}  ${c.dim([...counts].map(([k, v]) => `${k}×${v}`).join(", "))}`);
console.log(`  Needed parsing work:   ${c.bold(needsWork)} of ${RUNS}`);
console.log(`  Median latency:        ${c.bold(ms(median(results.map((r) => r.ms))))}`);
console.log(`  Output tokens:         ${c.bold(outTokens || "n/a")} ${c.dim("(words we paid for and threw away)")}`);
if (confs.length) {
  console.log(
    `  Stated confidence:     ${c.bold(`${Math.round(Math.min(...confs) * 100)}–${Math.round(Math.max(...confs) * 100)}%`)} ${c.dim("– generated text, not a measurement")}`,
  );
}
console.log();
