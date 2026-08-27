const GEMINI_MODELS = ["gemini-3.7-flash", "gemini-3.6-flash"] as const;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

export class GeminiServiceError extends Error {
  code: "AI_NOT_CONFIGURED" | "AI_UPSTREAM_ERROR" | "AI_INVALID_RESPONSE";
  retryable: boolean;

  constructor(code: "AI_NOT_CONFIGURED" | "AI_UPSTREAM_ERROR" | "AI_INVALID_RESPONSE", message: string, retryable: boolean) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export function requireGeminiApiKey(value: string | undefined): string {
  const apiKey = value?.trim();
  if (!apiKey) throw new GeminiServiceError("AI_NOT_CONFIGURED", "Travorien AI is not configured yet.", false);
  return apiKey;
}

function interactionText(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const response = value as { output_text?: unknown; steps?: unknown };
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.steps)) return null;
  for (const step of response.steps) {
    if (!step || typeof step !== "object") continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block && typeof block === "object" && typeof (block as { text?: unknown }).text === "string") return (block as { text: string }).text;
    }
  }
  return null;
}

export async function requestGeminiStructuredOutputWithKey(apiKey: string, prompt: string, schema: Record<string, unknown>, timeoutMs = 25_000): Promise<unknown> {
  for (const [index, model] of GEMINI_MODELS.entries()) {
    let response: Response;
    try {
      response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model,
          input: prompt,
          response_format: { type: "text", mime_type: "application/json", schema },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new GeminiServiceError("AI_UPSTREAM_ERROR", "Travorien AI could not be reached. Your trip details are still here.", true);
    }
    const canTryFallback = index < GEMINI_MODELS.length - 1 && (response.status === 429 || response.status >= 500);
    if (!response.ok && canTryFallback) continue;
    if (!response.ok) throw new GeminiServiceError("AI_UPSTREAM_ERROR", "Travorien AI is temporarily unavailable. Your trip details are still here.", response.status >= 500 || response.status === 429);
    const text = interactionText(await response.json());
    if (!text) throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI returned an incomplete response. Please retry.", true);
    try {
      return JSON.parse(text);
    } catch {
      throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI returned an invalid structured response. Please retry.", true);
    }
  }
  throw new GeminiServiceError("AI_UPSTREAM_ERROR", "Travorien AI is temporarily unavailable. Your trip details are still here.", true);
}
