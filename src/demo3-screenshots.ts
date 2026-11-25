// DEMO 3 (part 2 of the live demo) – "Decisions over pictures"
// Triage bug-report screenshots with Jev and Microsoft-Decision-1.1:
//   yes/no  – does it show an error?
//   choice  – which part of the app?
//   score   – how severe?
//   box     – where is the error message? (Jev 1.14 only) → drawn onto the image in out/

import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { availableProviders, box, choice, image, noul, score, type BoxA, type ChoiceA, type NoulA, type ScoreA, choiceProbability } from "./lib/decision.js";
import { SEVERITY_LEVELS } from "./data/tickets.js";
import { bar, c, maybeRecord, ms, openFile, pause, section, table, title } from "./lib/ui.js";

maybeRecord("demo3");
const SHOTS = ["checkout-error", "dashboard-ok", "settings-broken", "login-crash"];
const providers = availableProviders();
const open = !process.argv.includes("--no-open");

const questions = {
  has_error: noul("Does `screenshot` show an error message, a crash or a visibly broken layout?"),
  area: choice("Which part of the app is shown in `screenshot`?", {
    checkout: "Checkout or payment",
    dashboard: "Dashboard or order overview",
    settings: "Settings or preferences",
    login: "Login, session or authentication",
  }),
  severity: score("How severe is the problem shown in `screenshot` for the user?", SEVERITY_LEVELS),
  where: box("the error message in `screenshot`"),
};

const REPORT = "Screenshot attached to a customer bug report.";

title("Demo 3 · Decisions over pictures", `${providers.map((p) => p.name).join(" and ")} · ${SHOTS.length} bug-report screenshots`);
await mkdir("out", { recursive: true });

// ---------- What we ask ----------
section("The request – one call per model, per screenshot");
console.log(`  ${c.bold("state")}      report: "${REPORT}"`);
console.log(`             screenshot: <the image>\n`);
console.log(`  ${c.bold("questions")}`);
console.log(`  ${c.gold("has_error")}  ${c.dim("yes/no")}   ${questions.has_error.instructions}`);
console.log(`  ${" ".repeat(9)}  ${c.dim("→ a probability 0–1")}`);
console.log(`  ${c.gold("area")}       ${c.dim("choice")}   ${questions.area.instructions}`);
for (const [k, v] of Object.entries(questions.area.criteria)) console.log(`  ${" ".repeat(20)}${c.bold(k.padEnd(10))} ${c.dim(v)}`);
console.log(`  ${c.gold("severity")}   ${c.dim("score")}    ${questions.severity.instructions}`);
SEVERITY_LEVELS.forEach((l, i) => console.log(`  ${" ".repeat(20)}${c.bold(String(i).padEnd(10))} ${c.dim(l)}`));
console.log(`  ${c.gold("where")}      ${c.dim("box")}      Find ${questions.where.instructions}`);
console.log(`  ${" ".repeat(9)}  ${c.dim(`→ coordinates, drawn onto a copy of the image (${providers.filter((p) => p.supportsBox).map((p) => p.name).join(", ") || "no provider"} only)`)}`);

await pause("first screenshot");

// ---------- One screenshot at a time ----------
for (const [n, name] of SHOTS.entries()) {
  const path = `assets/screenshots/${name}.png`;
  section(`${n + 1}/${SHOTS.length}  ${name}  ${c.dim(path)}`);
  if (open) openFile(path);
  const img = await image(path);
  const state = { report: REPORT, screenshot: img };

  const cols: string[][] = [];
  const boxes: string[] = [];
  for (const p of providers) {
    const r = await p.decide(state, questions);
    const hasError = r.answers.has_error as NoulA;
    const area = r.answers.area as ChoiceA;
    const sev = r.answers.severity as ScoreA;
    const where = r.answers.where as BoxA | undefined;

    let whereCell: string;
    if (!p.supportsBox) whereCell = c.dim("not supported");
    else if (!where) whereCell = c.dim("–");
    else if (hasError.noul < 0.5) whereCell = c.dim("ignored – no error");
    else {
      const out = await drawBox(path, where, `out/${name}-boxed.png`);
      whereCell = `${bar(where.confidence, 6)}  → ${out}`;
      boxes.push(out);
    }

    cols.push([
      ms(r.ms),
      bar(hasError.noul, 8),
      `${c.bold(area.choice)} ${bar(choiceProbability(area), 6)}`,
      `${c.bold(sev.score.toFixed(1))}${c.dim(" / 3")}  ${c.dim(SEVERITY_LEVELS[Math.round(sev.score)] ?? "")}`,
      whereCell,
    ]);
  }

  const labels = ["latency", "has_error", "area", "severity", "where"];
  table(["", ...providers.map((p) => p.name)], labels.map((l, i) => [c.gold(l), ...cols.map((col) => col[i])]));
  if (boxes.length) console.log(c.dim("\n  A box always comes back, so we only draw it when has_error says yes."));
  if (open) boxes.forEach(openFile);

  if (n < SHOTS.length - 1) await pause("next screenshot");
}
console.log();

/** Draw the returned box (fractions of width/height) onto a copy of the image. */
async function drawBox(src: string, a: BoxA, dest: string) {
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 0, h = meta.height ?? 0;
  const x = Math.round(a.box.left * w), y = Math.round(a.box.top * h);
  const bw = Math.round((a.box.right - a.box.left) * w), bh = Math.round((a.box.bottom - a.box.top) * h);
  const label = `error · ${(a.confidence ?? 0).toFixed(2)}`;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke="#F2B84B" stroke-width="5" rx="6"/>
    <rect x="${x}" y="${Math.max(0, y - 34)}" width="${label.length * 11 + 20}" height="30" fill="#F2B84B" rx="4"/>
    <text x="${x + 10}" y="${Math.max(0, y - 34) + 21}" font-family="Arial" font-size="18" font-weight="bold" fill="#14213d">${label}</text>
  </svg>`;
  await sharp(src).composite([{ input: Buffer.from(svg) }]).toFile(dest);
  return dest;
}
