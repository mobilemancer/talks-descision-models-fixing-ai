// DEMO 2 – "LLM vs decision model"
// 1. Route eight tickets with the Foundry LLM, Jev and Microsoft-Decision-1.1 (each decision model 3×).
// 2. Ask three questions about one ticket in a single call.
// 3. Apply a confidence policy: act / act and log / hand to the LLM.

import { availableProviders, choice, choiceProbability, noul, score, type ChoiceA, type DecisionProvider, type NoulA, type ScoreA } from "./lib/decision.js";
import { llm, parseLabel } from "./lib/llm.js";
import { env } from "./lib/env.js";
import { SEVERITY_LEVELS, TEAMS, TEAM_NAMES, TICKETS } from "./data/tickets.js";
import { bar, c, maybeRecord, median, ms, pause, section, table, title } from "./lib/ui.js";

maybeRecord("demo2");
const REPEATS = 3;
const providers = availableProviders();
const model = llm();
const routeQ = { team: choice("Which team should handle this ticket?", TEAMS) };
const system = `You route support tickets. Reply with exactly one word: ${TEAM_NAMES.join(", ")}.\n` +
  Object.entries(TEAMS).map(([k, v]) => `${k}: ${v}`).join("\n");

title("Demo 2 · LLM vs decision model", `${model.name} vs ${providers.map((p) => p.name).join(" and ")}`);

// ---------- 1. Side by side ----------
section(`Routing ${TICKETS.length} tickets – every model asked ${REPEATS}× per ticket`);

type Cell = { team?: string; p?: number; ms: number[]; stable: boolean };
const results: Record<string, Cell>[] = [];

for (const t of TICKETS) {
  const row: Record<string, Cell> = {};
  const llmRuns = await Promise.all(Array.from({ length: REPEATS }, () => model.ask(system, t.text)));
  const llmTeams = llmRuns.map((r) => parseLabel(r.text, TEAM_NAMES).label);
  row.llm = { team: llmTeams[0], ms: llmRuns.map((r) => r.ms), stable: llmTeams.every((x) => x === llmTeams[0]) };

  await Promise.all(
    providers.map(async (p) => {
      const runs = await Promise.all(Array.from({ length: REPEATS }, () => p.decide(t.text, routeQ)));
      const answers = runs.map((r) => r.answers.team as ChoiceA);
      row[p.name] = {
        team: answers[0].choice,
        p: choiceProbability(answers[0]),
        ms: runs.map((r) => r.ms),
        stable: answers.every((a) => a.choice === answers[0].choice),
      };
    }),
  );
  results.push(row);
  process.stdout.write(c.dim(`  ${t.id} done\n`));
}

const mark = (team: string | undefined, expected: string) => (team === expected ? c.green(team) : team ? c.yellow(team) : c.red("?"));
table(
  ["ticket", "expected", "LLM", "same 3×", ...providers.flatMap((p) => [p.name, "p", "same 3×"])],
  TICKETS.map((t, i) => {
    const r = results[i];
    return [
      t.id,
      c.dim(t.expected),
      mark(r.llm.team, t.expected),
      r.llm.stable ? c.green("yes") : c.red("no"),
      ...providers.flatMap((p) => [mark(r[p.name].team, t.expected), bar(r[p.name].p, 8), r[p.name].stable ? c.green("yes") : c.red("no")]),
    ];
  }),
);

console.log();
console.log(`  Median latency  LLM: ${c.bold(ms(median(results.flatMap((r) => r.llm.ms))))}` +
  providers.map((p) => `   ${p.name}: ${c.bold(ms(median(results.flatMap((r) => r[p.name].ms))))}`).join(""));

await pause();

// ---------- 2. Many questions, one call ----------
section("Three questions about one ticket – one call");
const ticket = TICKETS[4];
console.log(c.bold("Ticket: ") + `"${ticket.text}"\n`);
const multiQ = {
  team: choice("Which team should handle this ticket?", TEAMS),
  urgent: noul("Does this block the customer from completing a purchase right now?"),
  severity: score("How severe is the problem for the customer?", SEVERITY_LEVELS),
};
for (const p of providers) {
  const r = await p.decide(ticket.text, multiQ);
  const team = r.answers.team as ChoiceA;
  const urgent = r.answers.urgent as NoulA;
  const sev = r.answers.severity as ScoreA;
  console.log(`  ${c.bold(p.name.padEnd(12))} ${ms(r.ms).padStart(7)}   team ${c.bold(team.choice)} ${bar(choiceProbability(team), 6)}   urgent ${bar(urgent.noul, 6)}   severity ${c.bold(sev.score.toFixed(1))}${c.dim(" / 3")}`);
}
console.log(c.dim("\n  Answers are values your code can use directly – no parsing, no retries for malformed output."));

await pause();

// ---------- 3. Confidence policy ----------
const { act, log } = env.thresholds();
const decider: DecisionProvider = providers[0];
section(`Confidence policy with ${decider.name}:  ≥ ${act} act  ·  ≥ ${log} act and log  ·  below: ask the LLM`);

let toLlm = 0;
const policyRows: string[][] = [];
for (const t of TICKETS) {
  const r = await decider.decide(t.text, routeQ);
  const a = r.answers.team as ChoiceA;
  const p = choiceProbability(a) ?? 0;
  let action: string;
  let final = a.choice;
  if (p >= act) action = c.green("act");
  else if (p >= log) action = c.yellow("act + log");
  else {
    toLlm++;
    const l = await model.ask(system, t.text);
    final = parseLabel(l.text, TEAM_NAMES).label ?? "?";
    action = c.red(`ask LLM (${ms(l.ms)})`);
  }
  policyRows.push([t.id, a.choice, bar(p, 10), action, c.bold(final)]);
}
table(["ticket", decider.name, "probability", "action", "final team"], policyRows);
console.log(`\n  ${c.bold(`${TICKETS.length - toLlm} of ${TICKETS.length}`)} handled without the LLM. ${c.dim("Tune the thresholds on your own data – the LLM should only see the hard cases.")}\n`);
