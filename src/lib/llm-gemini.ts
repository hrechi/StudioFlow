import "server-only";

/**
 * Minimal Gemini client (REST, no SDK). The API key stays on the server.
 * To switch provider later, only this file and `chatbot.service.ts` need to change.
 */

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export type GeminiToolDeclaration = {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
};

export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

const DEFAULT_MODEL = "gemini-3.5-flash";
/** Tried after the configured model when it is rate-limited or unavailable (free tier: own quota). */
const FALLBACK_MODELS = ["gemini-3.5-flash-lite"];
/** Statuses that mean "try another key / model": quota or rate limit, overload, model gone. */
const RETRYABLE = new Set([404, 429, 500, 503]);
/** A key+model that hit its quota is skipped for this long (free quotas reset daily or per minute). */
const COOLDOWN_MS = 10 * 60_000;
const cooldownUntil = new Map<string, number>();

/** GEMINI_API_KEY first, then the spare keys of GEMINI_API_KEYS (comma-separated). */
function apiKeys(): string[] {
  const keys = [process.env.GEMINI_API_KEY, ...(process.env.GEMINI_API_KEYS ?? "").split(",")]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);
  return [...new Set(keys)];
}

function models(preferred?: string): string[] {
  return [...new Set([preferred, process.env.GEMINI_MODEL, DEFAULT_MODEL, ...FALLBACK_MODELS])]
    .map((m) => m?.trim())
    .filter((m): m is string => !!m);
}

/**
 * Exported so other modules (e.g. the portfolio AI) share the same key / model fallback.
 * POSTs to generateContent, falling back to the next model and then the next key on
 * quota / overload errors, so one exhausted free key does not take the AI features down.
 */
export async function callGemini(
  body: unknown,
  timeoutMs: number,
  preferredModel?: string,
): Promise<Response> {
  const keys = apiKeys();
  if (!keys.length) throw new LlmUnavailableError("GEMINI_API_KEY is not configured.");
  const attempts = keys.flatMap((key, k) =>
    models(preferredModel).map((model) => ({ key, k, model })),
  );
  const now = Date.now();
  const fresh = attempts.filter((a) => (cooldownUntil.get(`${a.k}:${a.model}`) ?? 0) <= now);
  let lastStatus: number | undefined;
  for (const { key, k, model } of fresh.length ? fresh : attempts) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
    } catch {
      throw new LlmUnavailableError("The AI service did not answer in time.");
    }
    if (res.ok) return res;
    lastStatus = res.status;
    // Dev only: log the provider's message (never sent to the visitor).
    if (process.env.NODE_ENV === "development") {
      const text = await res.text().catch(() => "");
      console.warn(`[llm-gemini] key #${k + 1} · ${model} → ${res.status}`, text.slice(0, 200));
    }
    if (!RETRYABLE.has(res.status)) break;
    if (res.status === 429 || res.status === 404)
      cooldownUntil.set(`${k}:${model}`, Date.now() + COOLDOWN_MS);
  }
  throw new LlmUnavailableError(`Gemini error ${lastStatus ?? "unknown"}`, lastStatus);
}

export async function generate(input: {
  system: string;
  contents: GeminiContent[];
  tools: GeminiToolDeclaration[];
}): Promise<GeminiContent> {
  const res = await callGemini(
    {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.contents,
      tools: [{ functionDeclarations: input.tools }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
    },
    20_000,
  );
  const data = (await res.json()) as { candidates?: { content?: GeminiContent }[] };
  const content = data.candidates?.[0]?.content;
  if (!content?.parts?.length) throw new LlmUnavailableError("Empty answer from the model.");
  return { role: "model", parts: content.parts };
}

/**
 * One-shot structured extraction: text + files (images / PDF as base64) in, JSON matching
 * `schema` out (Gemini responseSchema). Used to read documents such as payment receipts.
 */
export async function generateJson<T>(input: {
  system: string;
  prompt: string;
  files?: { mimeType: string; data: Buffer }[];
  schema: Record<string, unknown>;
  timeoutMs?: number;
  /** Optional model tried first for this call; then GEMINI_MODEL, the default and the fallbacks. */
  model?: string;
}): Promise<T> {
  const res = await callGemini(
    {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [
        {
          role: "user",
          parts: [
            ...(input.files ?? []).map((f) => ({
              inlineData: { mimeType: f.mimeType, data: f.data.toString("base64") },
            })),
            { text: input.prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
        responseSchema: input.schema,
      },
    },
    input.timeoutMs ?? 45_000,
    input.model,
  );
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new LlmUnavailableError("The model did not return valid JSON.");
  }
}
