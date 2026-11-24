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
import { bar, c, maybeRecord, ms, openFile, pause, section, title } from "./lib/ui.js";

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

title("Demo 3 · Decisions over pictures", `${providers.map((p) => p.name).join(" and ")} · ${SHOTS.length} bug-report screenshots`);
await mkdir("out", { recursive: true });

for (const name of SHOTS) {
  const path = `assets/screenshots/${name}.png`;
  section(name);
  const img = await image(path);
  const state = { report: "Screenshot attached to a customer bug report.", screenshot: img };

  for (const p of providers) {
    const r = await p.decide(state, questions);
    const hasError = r.answers.has_error as NoulA;
    const area = r.answers.area as ChoiceA;
    const sev = r.answers.severity as ScoreA;
    console.log(
      `  ${c.bold(p.name.padEnd(12))} ${ms(r.ms).padStart(7)}   error? ${bar(hasError.noul, 8)}   area ${c.bold(area.choice.padEnd(9))} ${bar(choiceProbability(area), 6)}   severity ${c.bold(sev.score.toFixed(1))}${c.dim(" / 3")}`,
    );

    const where = r.answers.where as BoxA | undefined;
    if (where && hasError.noul >= 0.5) {
      const out = await drawBox(path, where, `out/${name}-boxed.png`);
      console.log(`  ${" ".repeat(12)} ${c.gold("box")} top ${where.box.top.toFixed(2)} left ${where.box.left.toFixed(2)} bottom ${where.box.bottom.toFixed(2)} right ${where.box.right.toFixed(2)}  ${bar(where.confidence, 6)}  → ${out}`);
      if (open) openFile(out);
    } else if (where) {
      console.log(c.dim(`  ${" ".repeat(12)} no error found – box ignored (a box always comes back, so we gate it on the yes/no answer)`));
    }
  }
  await pause("next screenshot");
}

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
