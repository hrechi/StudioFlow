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

export async function generate(input: {
  system: string;
  contents: GeminiContent[];
  tools: GeminiToolDeclaration[];
}): Promise<GeminiContent> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new LlmUnavailableError("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: input.contents,
          tools: [{ functionDeclarations: input.tools }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch {
    throw new LlmUnavailableError("The AI service did not answer in time.");
  }
  if (!res.ok) {
    // En dev, on log le corps pour faciliter le diagnostic
    const body = process.env.NODE_ENV === "development" ? await res.text().catch(() => "") : "";
    if (body) console.warn("[llm-gemini] error body:", body.slice(0, 300));
    // 429 = free quota exhausted; never leak the provider's body to the visitor.
    throw new LlmUnavailableError(`Gemini error ${res.status}`, res.status);
  }
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
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new LlmUnavailableError("GEMINI_API_KEY is not configured.");
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{
          role: "user",
          parts: [
            ...(input.files ?? []).map((f) => ({ inlineData: { mimeType: f.mimeType, data: f.data.toString("base64") } })),
            { text: input.prompt },
          ],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
          responseSchema: input.schema,
        },
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 45_000),
    });
  } catch {
    throw new LlmUnavailableError("The AI service did not answer in time.");
  }
  if (!res.ok) {
    const body = process.env.NODE_ENV === "development" ? await res.text().catch(() => "") : "";
    if (body) console.warn("[llm-gemini] error body:", body.slice(0, 300));
    throw new LlmUnavailableError(`Gemini error ${res.status}`, res.status);
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new LlmUnavailableError("The model did not return valid JSON.");
  }
}
