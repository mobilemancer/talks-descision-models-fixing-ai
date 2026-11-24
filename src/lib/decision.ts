// One small client for System One decision APIs.
// TypeSafe Jev and Microsoft-Decision-1.1 share the same request shape:
//   { model, state, questions, assets? }  ->  { model, answers, usage }
// Differences handled here: URL, auth header, how images are referenced, and Box support.

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { env } from "./env.js";
import { postJson } from "./http.js";

// ---------- Questions ----------

export type NoulQ = { type: "noul"; instructions: string; criteria?: { true?: string; false?: string } };
export type ChoiceQ<O extends string = string> = { type: "choice"; instructions: string; criteria: Record<O, string> };
export type ScoreQ = { type: "score"; instructions: string; criteria: string[] };
export type BoxQ = { type: "box"; instructions: string };
export type Question = NoulQ | ChoiceQ | ScoreQ | BoxQ;

export const noul = (instructions: string, criteria?: NoulQ["criteria"]): NoulQ => ({ type: "noul", instructions, ...(criteria ? { criteria } : {}) });
export const choice = <O extends string>(instructions: string, criteria: Record<O, string>): ChoiceQ<O> => ({ type: "choice", instructions, criteria });
export const score = (instructions: string, levels: string[]): ScoreQ => ({ type: "score", instructions, criteria: levels });
export const box = (instructions: string): BoxQ => ({ type: "box", instructions });

// ---------- Answers ----------

export type NoulA = { type: "noul"; noul: number };
export type ChoiceA = { type: "choice"; choice: string; confidence?: number; probabilities?: Record<string, number> | number[] };
export type ScoreA = { type: "score"; score: number; confidence?: number; probabilities?: Record<string, number>; legend?: Record<string, string> };
export type BoxA = { type: "box"; box: { top: number; bottom: number; left: number; right: number }; confidence?: number };
export type Answer = NoulA | ChoiceA | ScoreA | BoxA;

export interface DecisionResponse {
  model: string;
  answers: Record<string, Answer>;
  usage?: Record<string, number>;
}

export interface DecisionResult extends DecisionResponse {
  provider: string;
  ms: number;
}

/** Probability of the picked option, falling back to the confidence field. */
export function choiceProbability(a: ChoiceA): number | undefined {
  const p = a.probabilities;
  if (p && !Array.isArray(p) && typeof p[a.choice] === "number") return p[a.choice];
  return a.confidence;
}

// ---------- Images ----------

/** An image placed in the state. Each provider serializes it its own way. */
export class ImageRef {
  constructor(public name: string, public data: Buffer, public format: "png" | "jpg" | "jpeg") {}
}

export async function image(path: string): Promise<ImageRef> {
  const ext = extname(path).slice(1).toLowerCase();
  if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") throw new Error(`Only PNG/JPEG supported: ${path}`);
  return new ImageRef(basename(path), await readFile(path), ext);
}

type Asset = { type: "image"; format: string; data_base64: string };

/** Walk the state, swapping ImageRef objects for reference strings and collecting assets. */
function serializeState(state: unknown, refFor: (img: ImageRef) => { ref: string; key: string }) {
  const assets: Record<string, Asset> = {};
  const walk = (v: unknown): unknown => {
    if (v instanceof ImageRef) {
      const { ref, key } = refFor(v);
      assets[key] = { type: "image", format: v.format, data_base64: v.data.toString("base64") };
      return ref;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const serialized = walk(state);
  return { state: serialized, assets: Object.keys(assets).length ? assets : undefined };
}

// ---------- Providers ----------

export interface DecisionProvider {
  name: string;
  supportsBox: boolean;
  decide(state: unknown, questions: Record<string, Question>): Promise<DecisionResult>;
}

export function jev(): DecisionProvider {
  const cfg = env.jev();
  return {
    name: "Jev",
    supportsBox: true,
    async decide(state, questions) {
      // Jev: the reference is any unique string; the asset is keyed by that same string.
      const s = serializeState(state, () => {
        const ref = `img-${randomUUID()}`;
        return { ref, key: ref };
      });
      const needsImages = !!s.assets || Object.values(questions).some((q) => q.type === "box");
      const headers: Record<string, string> = { Authorization: `Bearer ${cfg.apiKey}` };
      if (needsImages) headers["TypeSafe-Danger-Zone-Images"] = "true";

      const { data, ms } = await postJson<DecisionResponse>(
        cfg.url,
        { model: cfg.model, state: s.state, ...(s.assets ? { assets: s.assets } : {}), questions },
        headers,
      );
      return { ...data, provider: "Jev", ms };
    },
  };
}

export function msDecision(): DecisionProvider {
  const cfg = env.foundryDecision();
  return {
    name: "MS-Decision",
    supportsBox: false,
    async decide(state, questions) {
      // Microsoft: the asset is keyed by name and referenced in text as image:<name>.
      const s = serializeState(state, (img) => ({ ref: `image:${img.name}`, key: img.name }));
      const supported = Object.fromEntries(Object.entries(questions).filter(([, q]) => q.type !== "box"));

      const { data, ms } = await postJson<DecisionResponse>(
        cfg.url,
        { model: cfg.deployment, state: s.state, ...(s.assets ? { assets: s.assets } : {}), questions: supported },
        { "api-key": cfg.apiKey },
      );
      return { ...data, provider: "MS-Decision", ms };
    },
  };
}

/** Providers that are configured in .env – lets a demo run with only one key. */
export function availableProviders(): DecisionProvider[] {
  const out: DecisionProvider[] = [];
  for (const make of [jev, msDecision]) {
    try {
      out.push(make());
    } catch {
      /* not configured */
    }
  }
  if (!out.length) throw new Error("No decision provider configured – set TYPESAFE_API_KEY and/or FOUNDRY_* in .env");
  return out;
}
