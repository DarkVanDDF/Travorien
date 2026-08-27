import type { ConversationMessage, ConversationTurnResult, TripPlanningStage } from "../../domain.ts";
import { GeminiServiceError, requestGeminiStructuredOutput } from "../../ai/gemini-server";
import { mockCatalog } from "../../data/mock-data.ts";
import { createEmptyTripIntent, mergeTripIntent, sanitizeExtractedFields } from "../../intent-engine.ts";

const nullableString = { type: ["string", "null"] };
const destinationIds = mockCatalog.destinations.map((item) => item.id);
const conversationResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistantMessage: { type: "string" },
    extractedFields: {
      type: "object",
      additionalProperties: false,
      properties: {
        originCountry: nullableString,
        travelers: { type: ["integer", "null"], minimum: 1, maximum: 12 },
        travelerType: { type: ["string", "null"], enum: ["solo", "couple", "family", "friends", null] },
        arrivalCity: nullableString,
        destinationRegion: nullableString,
        startDate: { type: ["string", "null"], format: "date" },
        endDate: { type: ["string", "null"], format: "date" },
        durationDays: { type: ["integer", "null"], minimum: 2, maximum: 30 },
        interests: { type: "array", items: { type: "string" }, maxItems: 8 },
        budget: { type: ["string", "null"], enum: ["budget", "mid-range", "mid-to-premium", "premium", null] },
        travelPace: { type: ["string", "null"], enum: ["relaxed", "balanced", "fast", null] },
        drivingPreference: { type: ["string", "null"], enum: ["self-drive", "chauffeur", "undecided", null] },
        vehiclePreference: { type: ["string", "null"], enum: ["compact", "sedan", "suv", "premium", "mpv", "undecided", null] },
        luggageCount: { type: ["integer", "null"], minimum: 0, maximum: 12 },
        crowdPreference: { type: ["string", "null"], enum: ["quiet", "balanced", "popular", null] },
        maxDailyDrivingMinutes: { type: ["integer", "null"], minimum: 60, maximum: 480 },
        drivingLicenceStatus: { type: ["string", "null"], enum: ["valid-foreign-licence", "no-licence", "unknown", null] },
        accommodationPreference: { type: ["string", "null"], enum: ["local-character", "comfort", "premium", "budget", null] },
      },
      required: [],
    },
    proposedDestinationIds: { type: "array", items: { type: "string", enum: destinationIds }, maxItems: 8 },
    routeExplanation: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["assistantMessage", "extractedFields", "proposedDestinationIds", "routeExplanation", "confidence"],
};

const validStages = new Set<TripPlanningStage>(["DISCOVERY", "ROUTE_PROPOSAL", "VEHICLE_SELECTION", "VEHICLE_RESERVATION", "HOTEL_UPSELL", "HOTEL_SELECTION", "TRIP_READY"]);

function validateTurn(value: unknown): ConversationTurnResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (typeof source.assistantMessage !== "string" || !source.assistantMessage.trim() || source.assistantMessage.length > 1200) return null;
  if (typeof source.confidence !== "number" || source.confidence < 0 || source.confidence > 1) return null;
  const proposedDestinationIds = Array.isArray(source.proposedDestinationIds)
    ? source.proposedDestinationIds.filter((item): item is string => typeof item === "string" && destinationIds.includes(item)).slice(0, 8)
    : [];
  if (Array.isArray(source.proposedDestinationIds) && proposedDestinationIds.length !== source.proposedDestinationIds.length) return null;
  return {
    assistantMessage: source.assistantMessage.trim(),
    extractedFields: sanitizeExtractedFields(source.extractedFields),
    proposedDestinationIds,
    routeExplanation: typeof source.routeExplanation === "string" && source.routeExplanation.trim() ? source.routeExplanation.trim() : null,
    confidence: source.confidence,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown; currentIntent?: unknown; conversation?: unknown; stage?: unknown; planningRevision?: unknown };
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) return Response.json({ error: { code: "INVALID_REQUEST", message: "Please send a short trip message." } }, { status: 400 });
    if (typeof body.planningRevision !== "number" || !Number.isInteger(body.planningRevision) || body.planningRevision < 1) return Response.json({ error: { code: "INVALID_REQUEST", message: "A current planning revision is required." } }, { status: 400 });
    const stage = typeof body.stage === "string" && validStages.has(body.stage as TripPlanningStage) ? body.stage as TripPlanningStage : "DISCOVERY";
    const currentIntent = mergeTripIntent(createEmptyTripIntent(), body.currentIntent);
    const history = Array.isArray(body.conversation) ? body.conversation.filter((item): item is ConversationMessage => Boolean(item && typeof item === "object" && ["user", "assistant"].includes((item as ConversationMessage).role) && typeof (item as ConversationMessage).text === "string")).slice(-8) : [];
    const prompt = `You are Travorien's conversational trip designer for inbound self-drive travel in China.
Return only the requested schema. Speak naturally and helpfully in assistantMessage; do not sound like a form.
Extract only facts explicitly stated or unambiguously corrected in the NEW USER MESSAGE. Do not repeat existing facts unless corrected, and never invent dates, licence status, budget, luggage, vehicle, or accommodation preferences.
Normalize vehicle preference to compact, sedan, suv, premium, mpv, or undecided. Normalize accommodation preference to local-character, comfort, premium, or budget. Convert a stated daily driving-hour limit to minutes.
When the user has explicitly supplied a Yunnan arrival city, start date, duration, travelers, and self-drive intent, you may propose a sequence of 2–8 IDs from this exact catalog list: ${destinationIds.join(", ")}.
The sequence must start at the arrival city. Prefer a coherent Yunnan northbound journey; never invent route distance, driving time, price, availability, or booking status. Project code will validate the directed graph and may reject the proposal.
At DISCOVERY, ask at most one high-value question when essential facts are missing. At later stages, answer questions or explain recommendations without claiming to mutate offers, bookings, prices, or the Trip.

CURRENT PLANNING STAGE: ${stage}
CURRENT PLANNING REVISION: ${body.planningRevision}
CURRENT STRUCTURED INTENT:
${JSON.stringify(currentIntent)}
RECENT CONVERSATION:
${JSON.stringify(history.map(({ role, text }) => ({ role, text })))}
NEW USER MESSAGE:
${body.message.trim()}`;
    const raw = await requestGeminiStructuredOutput(prompt, conversationResponseSchema);
    const result = validateTurn(raw);
    if (!result) throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI returned an invalid conversation result. Please retry.", true);
    return Response.json({ result, baseRevision: body.planningRevision });
  } catch (error) {
    if (error instanceof GeminiServiceError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.code === "AI_NOT_CONFIGURED" ? 503 : 502 });
    return Response.json({ error: { code: "AI_UPSTREAM_ERROR", message: "Travorien AI is temporarily unavailable. Your planning state is unchanged.", retryable: true } }, { status: 502 });
  }
}
