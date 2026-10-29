import "server-only";

/**
 * Client Groq (API compatible OpenAI). La clé reste côté serveur.
 * Pour changer de provider, seul ce fichier et chatbot.service.ts ont besoin de changer.
 *
 * Exports:
 *  - generate()     : tool-calling loop (chatbot)
 *  - generateJson() : one-shot JSON generation with schema enforcement (pack suggestions, etc.)
 */

export type GroqMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string | GroqToolResult[] }
  | { role: "assistant"; content: string | null; tool_calls?: GroqToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type GroqToolResult = { type: "tool_result"; tool_use_id: string; content: string };

export type GroqToolDeclaration = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  };
};

export type GroqResponse = {
  choices: {
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: GroqToolCall[];
    };
    finish_reason: string;
  }[];
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

const DEFAULT_MODEL = "qwen/qwen3.8-27b";

export async function generate(input: {
  system: string;
  messages: GroqMessage[];
  tools: GroqToolDeclaration[];
}): Promise<GroqResponse["choices"][0]["message"]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new LlmUnavailableError("GROQ_API_KEY is not configured.");
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: input.system }, ...input.messages],
        tools: input.tools,
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new LlmUnavailableError("Le service IA n'a pas répondu à temps.");
  }

  if (!res.ok) {
    const body =
      process.env.NODE_ENV === "development" ? await res.text().catch(() => "") : "";
    if (body) console.warn("[llm-groq] error body:", body.slice(0, 300));
    throw new LlmUnavailableError(`Groq error ${res.status}`, res.status);
  }

  const data = (await res.json()) as GroqResponse;
  const message = data.choices?.[0]?.message;
  if (!message) throw new LlmUnavailableError("Réponse vide du modèle.");
  return message;
}

// ── One-shot JSON generation ─────────────────────────────────────────────────

/**
 * Calls Groq with `response_format: { type: "json_object" }` and returns the parsed result.
 * Use for structured generation (no tool calls needed).
 *
 * @param input.system  — system prompt
 * @param input.prompt  — user message (the data to process)
 * @param input.timeoutMs — per-request timeout in milliseconds (default 15 000)
 * @param input.model   — overrides GROQ_MODEL / DEFAULT_MODEL for this call
 */
export async function generateJson<T = unknown>(input: {
  system: string;
  prompt: string;
  timeoutMs?: number;
  model?: string;
}): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new LlmUnavailableError("GROQ_API_KEY is not configured.");
  const model = input.model ?? process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  const timeout = input.timeoutMs ?? 15_000;

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new LlmUnavailableError("Le service IA n'a pas répondu à temps.");
  }

  if (!res.ok) {
    const body =
      process.env.NODE_ENV === "development" ? await res.text().catch(() => "") : "";
    if (body) console.warn("[llm-groq/json] error body:", body.slice(0, 300));
    throw new LlmUnavailableError(`Groq error ${res.status}`, res.status);
  }

  const data = (await res.json()) as GroqResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new LlmUnavailableError("Réponse vide du modèle.");

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new LlmUnavailableError("Le modèle n'a pas retourné un JSON valide.");
  }
}
