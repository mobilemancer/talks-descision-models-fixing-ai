// Terminal output helpers: colours, tables, probability bars, and --record.

import { mkdirSync, appendFileSync } from "node:fs";
import { exec } from "node:child_process";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string | number) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const c = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  cyan: wrap("36"),
  gold: wrap("38;5;214"),
};

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - strip(s).length));

export function table(head: string[], rows: string[][]) {
  const widths = head.map((h, i) => Math.max(strip(h).length, ...rows.map((r) => strip(r[i] ?? "").length)));
  const line = (r: string[]) => r.map((x, i) => pad(x ?? "", widths[i])).join("  ");
  console.log(c.bold(line(head)));
  console.log(c.dim(widths.map((w) => "─".repeat(w)).join("  ")));
  rows.forEach((r) => console.log(line(r)));
}

export function bar(p: number | undefined, width = 12) {
  if (p === undefined || Number.isNaN(p)) return c.dim("n/a");
  const filled = Math.round(p * width);
  const colour = p >= 0.9 ? c.green : p >= 0.7 ? c.yellow : c.red;
  return colour("█".repeat(filled)) + c.dim("░".repeat(width - filled)) + " " + p.toFixed(2);
}

export const ms = (n: number) => `${Math.round(n)} ms`;
export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

export function title(text: string, sub?: string) {
  console.log("\n" + c.gold(c.bold(text)));
  if (sub) console.log(c.dim(sub));
  console.log();
}

export function section(text: string) {
  console.log("\n" + c.bold(c.cyan(`▸ ${text}`)) + "\n");
}

/** Wait for Enter between steps when presenting (skip with --no-pause). */
export async function pause(label = "press Enter to continue") {
  if (process.argv.includes("--no-pause") || !process.stdin.isTTY) return;
  process.stdout.write(c.dim(`\n  … ${label}`));
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
  console.log();
}

/** --record: also write everything printed to recordings/<demo>-<time>.txt as a backup. */
export function maybeRecord(demo: string) {
  if (!process.argv.includes("--record")) return;
  mkdirSync("recordings", { recursive: true });
  const file = `recordings/${demo}-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  const orig = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    orig(...args);
    appendFileSync(file, strip(args.map(String).join(" ")) + "\n");
  };
  orig(c.dim(`(recording to ${file})`));
}

export function openFile(path: string) {
  const cmd = process.platform === "win32" ? `start "" "${path}"` : process.platform === "darwin" ? `open "${path}"` : `xdg-open "${path}"`;
  exec(cmd, () => {});
}
