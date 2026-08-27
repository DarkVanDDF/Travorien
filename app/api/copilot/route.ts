import { GeminiServiceError, requestGeminiStructuredOutput } from "../../ai/gemini-server";

const commandSchema = {
  type: "object", additionalProperties: false,
  properties: {
    commandType: { type: "string", enum: ["set-max-daily-driving-minutes", "unsupported"] },
    maxDailyDrivingMinutes: { type: ["integer", "null"], minimum: 30, maximum: 600 },
    assistantMessage: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["commandType", "maxDailyDrivingMinutes", "assistantMessage", "confidence"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown; tripRevision?: unknown };
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000) return Response.json({ error: { code: "INVALID_REQUEST", message: "Please send a short trip change." } }, { status: 400 });
    const prompt = `Interpret a traveler's requested change to an existing Travorien trip at revision ${Number(body.tripRevision) || 1}.
Return only the requested schema. The deterministic engine currently supports exactly one command: set-max-daily-driving-minutes with exactly 180 minutes.
Use that command only when the traveler clearly asks to keep daily driving at or below three hours. For every other request return unsupported and null minutes.
Do not propose or mutate itinerary objects. The application will validate and execute any command.

TRAVELER REQUEST:
${body.message.trim()}`;
    const raw = await requestGeminiStructuredOutput(prompt, commandSchema);
    if (!raw || typeof raw !== "object") throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI returned an invalid command.", true);
    const value = raw as Record<string, unknown>;
    const command = value.commandType === "set-max-daily-driving-minutes" && value.maxDailyDrivingMinutes === 180
      ? { type: "set-max-daily-driving-minutes" as const, maxMinutes: 180 }
      : null;
    return Response.json({ interpretation: { command, assistantMessage: typeof value.assistantMessage === "string" ? value.assistantMessage : command ? "I can shorten the long driving day." : "That change is not available in this demo yet.", confidence: typeof value.confidence === "number" ? value.confidence : 0 } });
  } catch (error) {
    if (error instanceof GeminiServiceError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.code === "AI_NOT_CONFIGURED" ? 503 : 502 });
    return Response.json({ error: { code: "AI_UPSTREAM_ERROR", message: "Travorien AI hit a temporary problem. Your trip is unchanged.", retryable: true } }, { status: 502 });
  }
}
