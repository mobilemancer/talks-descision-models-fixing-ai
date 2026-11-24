// Reads configuration from .env (loaded by `tsx --env-file=.env`).

function opt(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

function req(name: string, hint: string): string {
  const v = opt(name);
  if (!v) {
    throw new Error(`Missing ${name} in .env – ${hint}`);
  }
  return v;
}

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export const env = {
  jev() {
    return {
      apiKey: req("TYPESAFE_API_KEY", "create one in the TypeSafe console"),
      model: opt("JEV_MODEL") ?? "jev-latest",
      url: opt("TYPESAFE_URL") ?? "https://api.typesafe.ai/v1/systemone",
    };
  },
  foundryDecision() {
    const endpoint = opt("FOUNDRY_DECISION_URL")
      ? undefined
      : trimSlash(req("FOUNDRY_ENDPOINT", "copy the resource endpoint from the Foundry deployment page"));
    return {
      apiKey: req("FOUNDRY_API_KEY", "copy a key from the Foundry resource"),
      deployment: opt("FOUNDRY_DECISION_DEPLOYMENT") ?? "Microsoft-Decision-1.1",
      url: opt("FOUNDRY_DECISION_URL") ?? `${endpoint}/providers/microsoft/v1/systemone`,
    };
  },
  foundryChat() {
    const endpoint = opt("FOUNDRY_CHAT_URL")
      ? undefined
      : trimSlash(req("FOUNDRY_ENDPOINT", "copy the resource endpoint from the Foundry deployment page"));
    return {
      apiKey: req("FOUNDRY_API_KEY", "copy a key from the Foundry resource"),
      deployment: req("FOUNDRY_CHAT_DEPLOYMENT", "the deployment name of a chat model in Foundry"),
      url: opt("FOUNDRY_CHAT_URL") ?? `${endpoint}/openai/v1/chat/completions`,
    };
  },
  thresholds() {
    return {
      act: Number(opt("ACT_THRESHOLD") ?? 0.9),
      log: Number(opt("LOG_THRESHOLD") ?? 0.7),
    };
  },
};
