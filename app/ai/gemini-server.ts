import "server-only";
import { requireGeminiApiKey, requestGeminiStructuredOutputWithKey } from "./gemini-core";

export { GeminiServiceError } from "./gemini-core";

export async function requestGeminiStructuredOutput(prompt: string, schema: Record<string, unknown>, timeoutMs?: number): Promise<unknown> {
  const apiKey = requireGeminiApiKey(process.env.GEMINI_API_KEY);
  return requestGeminiStructuredOutputWithKey(apiKey, prompt, schema, timeoutMs);
}
