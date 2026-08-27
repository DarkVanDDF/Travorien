import test from "node:test";
import assert from "node:assert/strict";
import { GeminiServiceError, requestGeminiStructuredOutputWithKey, requireGeminiApiKey } from "../app/ai/gemini-core.ts";

test("missing Gemini configuration fails honestly without a fallback key", () => {
  assert.throws(
    () => requireGeminiApiKey("   "),
    (error) => error instanceof GeminiServiceError && error.code === "AI_NOT_CONFIGURED" && error.retryable === false,
  );
});

test("Gemini retries a capacity failure once on the supported fallback model", async () => {
  const originalFetch = globalThis.fetch;
  const models = [];
  globalThis.fetch = async (_url, init) => {
    models.push(JSON.parse(init.body).model);
    return models.length === 1
      ? new Response("{}", { status: 503 })
      : Response.json({ output_text: JSON.stringify({ ok: true }) });
  };
  try {
    const result = await requestGeminiStructuredOutputWithKey("test-only-not-a-real-key", "test", { type: "object" });
    assert.deepEqual(models, ["gemini-3.7-flash", "gemini-3.6-flash"]);
    assert.deepEqual(result, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Gemini does not hide authentication failures behind model fallback", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("{}", { status: 401 }); };
  try {
    await assert.rejects(
      requestGeminiStructuredOutputWithKey("test-only-not-a-real-key", "test", { type: "object" }),
      (error) => error instanceof GeminiServiceError && error.code === "AI_UPSTREAM_ERROR" && error.retryable === false,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
