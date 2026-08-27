import { GeminiServiceError, requestGeminiStructuredOutput } from "../../ai/gemini-server";
import { createEmptyTripIntent, isMinimumViableIntent, mergeTripIntent, nextQuestionForIntent, validateExtractionResult } from "../../intent-engine.ts";

const nullableString = { type: ["string", "null"] };
const intentResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    extractedFields: {
      type: "object", additionalProperties: false,
      properties: {
        originCountry: nullableString,
        travelers: { type: ["integer", "null"], minimum: 1, maximum: 12 },
        travelerType: { type: ["string", "null"], enum: ["solo", "couple", "family", "friends", null] },
        arrivalCity: nullableString,
        destinationRegion: nullableString,
        startDate: { type: ["string", "null"], format: "date" },
        endDate: { type: ["string", "null"], format: "date" },
        durationDays: { type: ["integer", "null"], minimum: 2, maximum: 60 },
        interests: { type: "array", items: { type: "string" }, maxItems: 8 },
        budget: { type: ["string", "null"], enum: ["budget", "mid-range", "mid-to-premium", "premium", null] },
        travelPace: { type: ["string", "null"], enum: ["relaxed", "balanced", "fast", null] },
        drivingPreference: { type: ["string", "null"], enum: ["self-drive", "chauffeur", "undecided", null] },
        vehiclePreference: nullableString,
        drivingLicenceStatus: { type: ["string", "null"], enum: ["valid-foreign-licence", "no-licence", "unknown", null] },
        accommodationPreference: nullableString,
      },
      required: [],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    unresolvedFields: { type: "array", items: { type: "string" } },
    nextQuestion: { type: "string" },
    readyToGenerateTrip: { type: "boolean" },
  },
  required: ["extractedFields", "confidence", "unresolvedFields", "nextQuestion", "readyToGenerateTrip"],
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown; currentIntent?: unknown };
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) return Response.json({ error: { code: "INVALID_REQUEST", message: "Please send a short trip message." } }, { status: 400 });
    const currentIntent = mergeTripIntent(createEmptyTripIntent(), body.currentIntent);
    const prompt = `You are Travorien's legacy trip-intent extractor for inbound self-drive travel in China.
Return only the requested schema. Extract only facts explicitly stated or unambiguously implied by the NEW USER MESSAGE.
Do not repeat existing values in extractedFields unless the user explicitly corrects them. Use null or omit uncertain values; never invent a budget, licence, date, vehicle, or preference.
Map wife/husband/partner to travelerType couple and two travelers only when unambiguous. Map phrases such as drive ourselves/self-drive to drivingPreference self-drive.
Ask exactly one concise, warm follow-up question for the most valuable missing field. Minimum viable intent is destinationRegion, durationDays, travelers, and self-drive intent.

CURRENT INTENT:
${JSON.stringify(currentIntent)}

NEW USER MESSAGE:
${body.message.trim()}`;
    const raw = await requestGeminiStructuredOutput(prompt, intentResponseSchema);
    const extraction = validateExtractionResult(raw);
    if (!extraction) throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI returned an invalid intent result. Please retry.", true);
    const merged = mergeTripIntent(currentIntent, extraction.extractedFields);
    const ready = isMinimumViableIntent(merged);
    return Response.json({ extraction: { ...extraction, unresolvedFields: merged.unresolvedFields, readyToGenerateTrip: ready, nextQuestion: ready ? "I have enough to build your first route. Want me to create it?" : nextQuestionForIntent(merged) } });
  } catch (error) {
    if (error instanceof GeminiServiceError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.code === "AI_NOT_CONFIGURED" ? 503 : 502 });
    return Response.json({ error: { code: "AI_UPSTREAM_ERROR", message: "Travorien AI hit a temporary problem. Your trip details are still here.", retryable: true } }, { status: 502 });
  }
}
