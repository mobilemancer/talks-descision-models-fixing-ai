// npm run check – verifies every configured endpoint with one tiny call before you go on stage.

import { jev, msDecision, noul } from "./lib/decision.js";
import { llm } from "./lib/llm.js";
import { c, ms } from "./lib/ui.js";

const q = { refund: noul("Does the customer ask for a refund?") };
const state = "I was charged twice. Please give me my money back.";

const checks: [string, () => Promise<string>][] = [
  ["Jev", async () => { const r = await jev().decide(state, q); return `${r.model} · noul ${(r.answers.refund as { noul: number }).noul.toFixed(2)} · ${ms(r.ms)}`; }],
  ["Microsoft-Decision", async () => { const r = await msDecision().decide(state, q); return `${r.model} · noul ${(r.answers.refund as { noul: number }).noul.toFixed(2)} · ${ms(r.ms)}`; }],
  ["Foundry LLM", async () => { const m = llm(); const r = await m.ask("Answer yes or no.", `Does this ask for a refund? "${state}"`); return `${r.model} · "${r.text.slice(0, 40)}" · ${ms(r.ms)}`; }],
];

let failed = 0;
for (const [name, run] of checks) {
  try {
    console.log(`${c.green("✔")} ${name.padEnd(20)} ${await run()}`);
  } catch (e) {
    failed++;
    console.log(`${c.red("✘")} ${name.padEnd(20)} ${(e as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
