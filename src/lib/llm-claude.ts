import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * Minimal Claude client for the AI features that read images (Photos & Galleries).
 * Official SDK, server only: the key (ANTHROPIC_API_KEY) never reaches the browser.
 * Default model: Claude Haiku 5.5 — the fastest and cheapest Claude model, with vision.
 */

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL?.trim() || "claude-haiku-5-5";

export class ClaudeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeUnavailableError";
  }
}

export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!isClaudeConfigured())
    throw new ClaudeUnavailableError("ANTHROPIC_API_KEY is not configured.");
  // The SDK retries 408 / 409 / 429 / 5xx and connection errors twice on its own.
  client ??= new Anthropic({ timeout: 60_000 });
  return client;
}

export type ClaudeImage = {
  data: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  /** Optional caption placed just before the image (e.g. "Photo 3"). */
  label?: string;
};

/**
 * One request → JSON validated against `schema` (structured outputs). Images first, then the
 * prompt. `effort: "low"` keeps Haiku fast and cheap; raise it for harder judgements.
 */
export async function claudeJson<S extends z.ZodType>(input: {
  system: string;
  prompt: string;
  schema: S;
  images?: ClaudeImage[];
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const content: Anthropic.ContentBlockParam[] = [];
  for (const image of input.images ?? []) {
    if (image.label) content.push({ type: "text", text: image.label });
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data.toString("base64") },
    });
  }
  content.push({ type: "text", text: input.prompt });

  try {
    const response = await getClient().messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: input.maxTokens ?? 4000,
      system: input.system,
      messages: [{ role: "user", content }],
      output_config: { effort: input.effort ?? "low", format: zodOutputFormat(input.schema) },
    });
    if (response.stop_reason === "refusal") {
      throw new ClaudeUnavailableError("The AI declined to analyse this content.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new ClaudeUnavailableError("The AI answer was cut off. Try with fewer photos.");
    }
    if (response.parsed_output == null) {
      throw new ClaudeUnavailableError("The AI did not return a usable answer.");
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof ClaudeUnavailableError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ClaudeUnavailableError("Claude rejected the API key: check ANTHROPIC_API_KEY.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ClaudeUnavailableError("Claude is rate-limited right now. Try again in a minute.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[llm-claude] API error ${error.status ?? "?"}: ${error.message}`);
      throw new ClaudeUnavailableError(
        `Claude could not complete the request (${error.status ?? "network"}).`,
      );
    }
    throw error;
  }
}
