# Decision models – live demos

TypeScript demos for the talk **"Decision models – fixing everything wrong with AI!"** (SweNug 2026).

They call **TypeSafe Jev** and **Microsoft-Decision-1.1** in Microsoft Foundry, and use a **chat model in Foundry** as the "LLM" to compare against. Both decision models share the same System One request shape, so one small client (`src/lib/decision.ts`) serves both: only the URL, auth header and image reference differ.

| Command | Slide | What it shows |
|---|---|---|
| `npm run check` | – | One tiny call to each endpoint. Run it before you go on stage. |
| `npm run demo1` | 4 · Same ticket, ten times | One ambiguous ticket sent to the LLM ten times: latency, answers that change, replies that need parsing, made-up confidence |
| `npm run demo2` | 18 · LLM vs decision model (part 1) | 8 tickets through the LLM, Jev and MS-Decision, 3× each: answer, probability, latency, stable across runs. Then three questions in one call, then the confidence policy (act / act and log / ask the LLM) |
| `npm run demo3` | 18 · LLM vs decision model (part 2) | Four bug-report screenshots: yes/no (error?), choice (which area), score (severity), and a Jev **box** question drawn onto the image in `out/` |

## Setup

Requires Node.js 20.6 or newer.

```bash
npm install
cp .env.example .env     # then fill in your keys
npm run check
```

`.env` needs:

- `TYPESAFE_API_KEY`: from the TypeSafe console. `JEV_MODEL` defaults to `jev-latest`. Images and box questions need Jev 1.14.
- `FOUNDRY_ENDPOINT`: your Foundry resource endpoint from the deployment page, e.g. `https://my-resource.services.ai.azure.com`.
- `FOUNDRY_API_KEY`: a key for that resource.
- `FOUNDRY_DECISION_DEPLOYMENT`: the *deployment* name of Microsoft-Decision-1.1.
- `FOUNDRY_CHAT_DEPLOYMENT`: the deployment name of any chat model in the same resource.

The defaults call `…/providers/microsoft/v1/systemone` for the decision model and `…/openai/v1/chat/completions` for the chat model. If your resource uses different paths, set `FOUNDRY_DECISION_URL` / `FOUNDRY_CHAT_URL` to full URLs.

If only one decision model is configured, demos 2 and 3 run with that one.

## On stage

- Demos pause between steps. Press **Enter** to continue, or add `-- --no-pause`.
- `npm run demo1 -- --runs=5` gives a shorter run.
- `npm run demo3` opens each annotated screenshot. Use `-- --no-open` to skip that.
- **Backups:** add `-- --record` to save a plain-text copy of the run to `recordings/`. Record a run at home on good Wi-Fi.
- Tune the policy thresholds with `ACT_THRESHOLD` / `LOG_THRESHOLD` in `.env`.

## Files

```
src/lib/decision.ts   System One client: Jev + Microsoft-Decision, questions, images, box
src/lib/llm.ts        Foundry chat client + the parse/validate step an LLM decision needs
src/lib/http.ts       fetch with timing, timeout and retry on 429/5xx
src/lib/ui.ts         terminal tables, probability bars, pause, --record
src/data/tickets.ts   fictional tickets and teams
assets/screenshots/   fictional app screenshots (regenerate: scripts/make-screenshots.mjs, needs Playwright)
```

## Notes

- Jev images: PNG/JPEG, 280–1568 px per side, sent with the `TypeSafe-Danger-Zone-Images: true` header. TypeSafe still marks image support as early-stage, so the format can change. A box always comes back even when the target is missing, so demo 3 only draws it when the yes/no answer says there is an error.
- Microsoft-Decision-1.1 references images in text as `image:<name>` and has no box question. The client drops box questions for it.
- Response fields can differ slightly between providers. Choice probabilities fall back to `confidence` when a per-option map isn't returned.
- No temperature is set on the LLM calls, on purpose: demo 1 shows what an app gets with the deployment's defaults.
