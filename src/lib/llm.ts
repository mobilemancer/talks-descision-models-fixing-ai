// Minimal chat-completions client for an LLM deployment in Microsoft Foundry
// (OpenAI-compatible v1 endpoint, api-key auth).

import { env } from "./env.js";
import { postJson } from "./http.js";

interface ChatResponse {
  model: string;
  choices: { message: { content: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export interface LlmResult {
  text: string;
  ms: number;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export function llm() {
  const cfg = env.foundryChat();
  return {
    name: `LLM (${cfg.deployment})`,
    async ask(system: string, user: string): Promise<LlmResult> {
      // No temperature set on purpose: we use the deployment's defaults, as most apps do.
      const { data, ms } = await postJson<ChatResponse>(
        cfg.url,
        {
          model: cfg.deployment,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        },
        { "api-key": cfg.apiKey },
        { timeoutMs: 120_000 },
      );
      return {
        text: (data.choices[0]?.message.content ?? "").trim(),
        ms,
        model: data.model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      };
    },
  };
}

/**
 * Try to turn LLM prose into one of the allowed labels – the "parse and validate" step
 * every LLM-based decision needs.
 */
export function parseLabel<O extends string>(text: string, options: readonly O[]) {
  const exact = options.find((o) => text.trim().toLowerCase() === o);
  const clean = text.toLowerCase().replace(/[^a-z\s]/g, " ").trim();
  if (exact) return { label: exact, status: "exact" as const };
  const found = options.filter((o) => new RegExp(`\\b${o}\\b`).test(clean));
  if (found.length === 1) return { label: found[0], status: "cleaned up" as const };
  if (found.length > 1) return { label: undefined, status: "ambiguous" as const };
  return { label: undefined, status: "unparseable" as const };
}

/** Pull a self-reported confidence such as "90%" or "0.9" out of the text. */
export function parseStatedConfidence(text: string): number | undefined {
  const pct = text.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (pct) return Number(pct[1]) / 100;
  const frac = text.match(/\b(0?\.\d+|1\.0+)\b/);
  return frac ? Number(frac[1]) : undefined;
}
