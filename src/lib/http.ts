// fetch with timing, timeout and a small retry on 429 / 5xx.

import tls from "node:tls";

// Node 26 (OpenSSL 3.5) offers a large post-quantum key share in the TLS ClientHello by default.
// Some networks reset that handshake (ECONNRESET to *.services.ai.azure.com), so stick to classic curves.
tls.DEFAULT_ECDH_CURVE = "X25519:prime256v1";

export interface Timed<T> {
  data: T;
  ms: number;
}

export class HttpError extends Error {
  constructor(public status: number, public body: string, url: string) {
    super(`HTTP ${status} from ${url}: ${body.slice(0, 400)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function postJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  { timeoutMs = 60_000, retries = 3 } = {},
): Promise<Timed<T>> {
  for (let attempt = 0; ; attempt++) {
    const started = performance.now();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    const ms = performance.now() - started;

    if (res.ok) {
      return { data: JSON.parse(text) as T, ms };
    }
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) {
      throw new HttpError(res.status, text, url);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt);
  }
}
