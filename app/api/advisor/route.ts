import type { AdvisorConversationMessage, AdvisorProposal, JourneyPrototypeState, PlanningBehavior, PrototypeMapAction } from "../../prototype-domain.ts";
import { GeminiServiceError, requestGeminiStructuredOutput } from "../../ai/gemini-server.ts";
import { prototypeDestinations } from "../../data/prototype-map-data.ts";
import { isPrototypeDestinationId, validateAdvisorProposal } from "../../prototype-engine.ts";

const destinationIds = prototypeDestinations.map((destination) => destination.id);
const nullableString = { type: ["string", "null"] };
const advisorSchema = {
  type: "object", additionalProperties: false,
  properties: {
    humanResponse: { type: "string" },
    intentPatch: { type: "object", additionalProperties: false, properties: {
      jobToBeDone: nullableString,
      interests: { type: "array", items: { type: "string" }, maxItems: 8 },
      planningBehavior: { type: ["string", "null"], enum: ["detailed-planner", "flexible-explorer", "wanderer", null] },
      maxDailyDrivingMinutes: { type: ["integer", "null"], minimum: 60, maximum: 480 },
      season: nullableString,
    }, required: ["jobToBeDone", "interests", "planningBehavior", "maxDailyDrivingMinutes", "season"] },
    mapActions: { type: "array", maxItems: 6, items: { type: "object", additionalProperties: false, properties: {
      type: { type: "string", enum: ["add", "remove", "set-route", "clear"] },
      destinationId: { type: ["string", "null"], enum: [...destinationIds, null] },
      destinationIds: { type: "array", items: { type: "string", enum: destinationIds }, maxItems: 8 },
    }, required: ["type", "destinationId", "destinationIds"] } },
    suggestedDestinationIds: { type: "array", items: { type: "string", enum: destinationIds }, maxItems: 6 },
    candidateJourneys: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: {
      id: { type: "string" }, title: { type: "string" }, destinationIds: { type: "array", items: { type: "string", enum: destinationIds }, minItems: 2, maxItems: 8 }, rationale: { type: "string" },
    }, required: ["id", "title", "destinationIds", "rationale"] } },
    uiSurface: { type: "string", enum: ["conversation", "readiness", "surprise", "route-insight"] },
    journeyMutationProposal: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, properties: { summary: { type: "string" }, affectedDestinationIds: { type: "array", items: { type: "string", enum: destinationIds }, maxItems: 8 } }, required: ["summary", "affectedDestinationIds"] }] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["humanResponse", "intentPatch", "mapActions", "suggestedDestinationIds", "candidateJourneys", "uiSurface", "journeyMutationProposal", "confidence"],
};

type RawAdvisorResult = {
  humanResponse?: unknown;
  intentPatch?: { jobToBeDone?: unknown; interests?: unknown; planningBehavior?: unknown; maxDailyDrivingMinutes?: unknown; season?: unknown };
  mapActions?: Array<{ type?: unknown; destinationId?: unknown; destinationIds?: unknown }>;
  suggestedDestinationIds?: unknown;
  candidateJourneys?: unknown;
  uiSurface?: unknown;
  journeyMutationProposal?: unknown;
  confidence?: unknown;
};

const planningBehaviors = new Set<PlanningBehavior>(["detailed-planner", "flexible-explorer", "wanderer"]);

function normalizeResult(value: unknown): AdvisorProposal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as RawAdvisorResult;
  const mapActions: PrototypeMapAction[] = [];
  for (const action of Array.isArray(raw.mapActions) ? raw.mapActions : []) {
    if (action.type === "clear") mapActions.push({ type: "clear" });
    else if ((action.type === "add" || action.type === "remove") && typeof action.destinationId === "string" && isPrototypeDestinationId(action.destinationId)) mapActions.push({ type: action.type, destinationId: action.destinationId });
    else if (action.type === "set-route" && Array.isArray(action.destinationIds)) mapActions.push({ type: "set-route", destinationIds: action.destinationIds.filter((id): id is string => typeof id === "string" && isPrototypeDestinationId(id)) });
  }
  const patch = raw.intentPatch ?? {};
  const proposal: AdvisorProposal = {
    humanResponse: typeof raw.humanResponse === "string" ? raw.humanResponse.trim() : "",
    intentPatch: {
      ...(typeof patch.jobToBeDone === "string" && patch.jobToBeDone.trim() ? { jobToBeDone: patch.jobToBeDone.trim() } : {}),
      ...(Array.isArray(patch.interests) ? { interests: patch.interests.filter((item): item is string => typeof item === "string").slice(0, 8) } : {}),
      ...(typeof patch.planningBehavior === "string" && planningBehaviors.has(patch.planningBehavior as PlanningBehavior) ? { planningBehavior: patch.planningBehavior as PlanningBehavior } : {}),
      ...(typeof patch.maxDailyDrivingMinutes === "number" ? { maxDailyDrivingMinutes: patch.maxDailyDrivingMinutes } : {}),
      ...(typeof patch.season === "string" && patch.season.trim() ? { season: patch.season.trim() } : {}),
    },
    mapActions,
    suggestedDestinationIds: Array.isArray(raw.suggestedDestinationIds) ? raw.suggestedDestinationIds.filter((id): id is string => typeof id === "string" && isPrototypeDestinationId(id)).slice(0, 6) : [],
    candidateJourneys: Array.isArray(raw.candidateJourneys) ? raw.candidateJourneys.filter((item): item is AdvisorProposal["candidateJourneys"][number] => Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string" && typeof (item as { title?: unknown }).title === "string" && typeof (item as { rationale?: unknown }).rationale === "string" && Array.isArray((item as { destinationIds?: unknown }).destinationIds))).map((item) => ({ ...item, destinationIds: item.destinationIds.filter(isPrototypeDestinationId).slice(0, 8) })).filter((item) => item.destinationIds.length >= 2).slice(0, 3) : [],
    uiSurface: ["conversation", "readiness", "surprise", "route-insight"].includes(String(raw.uiSurface)) ? raw.uiSurface as AdvisorProposal["uiSurface"] : "conversation",
    journeyMutationProposal: raw.journeyMutationProposal && typeof raw.journeyMutationProposal === "object" && !Array.isArray(raw.journeyMutationProposal) && typeof (raw.journeyMutationProposal as { summary?: unknown }).summary === "string" && Array.isArray((raw.journeyMutationProposal as { affectedDestinationIds?: unknown }).affectedDestinationIds) ? { summary: (raw.journeyMutationProposal as { summary: string }).summary, affectedDestinationIds: (raw.journeyMutationProposal as { affectedDestinationIds: unknown[] }).affectedDestinationIds.filter((id): id is string => typeof id === "string" && isPrototypeDestinationId(id)) } : null,
    confidence: typeof raw.confidence === "number" ? raw.confidence : -1,
  };
  return validateAdvisorProposal(proposal);
}

function validJourney(value: unknown): JourneyPrototypeState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const state = value as JourneyPrototypeState;
  if (!Array.isArray(state.destinationIds) || !state.destinationIds.every((id) => typeof id === "string" && isPrototypeDestinationId(id))) return null;
  return {
    destinationIds: state.destinationIds.slice(0, 8), undoStack: [], selectedDestinationId: typeof state.selectedDestinationId === "string" && isPrototypeDestinationId(state.selectedDestinationId) ? state.selectedDestinationId : null,
    jobToBeDone: typeof state.jobToBeDone === "string" ? state.jobToBeDone.slice(0, 600) : "", interests: Array.isArray(state.interests) ? state.interests.filter((item): item is string => typeof item === "string").slice(0, 8) : [],
    planningBehavior: planningBehaviors.has(state.planningBehavior) ? state.planningBehavior : "flexible-explorer", maxDailyDrivingMinutes: typeof state.maxDailyDrivingMinutes === "number" ? state.maxDailyDrivingMinutes : null,
    season: typeof state.season === "string" ? state.season.slice(0, 80) : null, readiness: state.readiness && typeof state.readiness === "object" ? state.readiness : null,
    readinessContext: state.readinessContext && typeof state.readinessContext === "object" ? state.readinessContext : null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown; conversation?: unknown; journey?: unknown; routeInsight?: unknown; tripContext?: unknown };
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) return Response.json({ error: { code: "INVALID_REQUEST", message: "Please send a short road-trip question." } }, { status: 400 });
    const journey = validJourney(body.journey);
    if (!journey) return Response.json({ error: { code: "INVALID_REQUEST", message: "A valid shared journey context is required." } }, { status: 400 });
    const conversation = Array.isArray(body.conversation) ? body.conversation.filter((message): message is AdvisorConversationMessage => Boolean(message && typeof message === "object" && ["user", "assistant", "system"].includes((message as AdvisorConversationMessage).role) && typeof (message as AdvisorConversationMessage).text === "string")).slice(-20).map(({ role, text, source }) => ({ role, text: text.slice(0, 1800), source })) : [];
    const knowledge = prototypeDestinations.map(({ id, name, region, tags, story, terrain, provenance }) => ({ id, name, region, tags, story, terrain, provenance }));
    const prompt = `You are Travorien, a premium AI travel advisor for international visitors who want to discover China by road.

Return only the requested JSON schema. Your humanResponse must be genuinely useful travel advice, not a form or a list of missing fields. Start with what the traveler wants from the road. Ask at most one high-value question and only when it materially changes the recommendation.

You can infer one behavioral planning mode: detailed-planner, flexible-explorer, or wanderer. Never call them J/P types and never force the traveler to choose a label.

You may propose actions only with destination IDs in BOUNDED DEMO DESTINATION KNOWLEDGE. Deterministic project code validates and applies them. Do not claim that you changed a booking, Trip, legal status, route authority, price, inventory, or permit. Route times, ratings and destination knowledge are demo-mock.

VERIFIED POLICY FACTS (checked 2026-08-25):
- An overseas licence alone is not sufficient for mainland China; eligible short-term visitors need the applicable provisional/temporary Chinese motor-vehicle driving permit before driving.
- Typical official preparation includes passport and entry documents, a valid overseas licence, a Chinese translation and ID photos; city procedures vary.
- Travorien does not issue or guarantee a permit. For any city/licence combination not supplied as verified context, say it requires local verification; never infer legal eligibility.
- Routes involving the Tibet Autonomous Region require additional travel feasibility checks for international visitors; do not claim the route is available.

CURRENT SHARED JOURNEY STATE:
${JSON.stringify(journey)}
CURRENT ROUTE INSIGHT:
${JSON.stringify(body.routeInsight ?? null)}
CURRENT AUTHORITATIVE TRIP CONTEXT:
${JSON.stringify(body.tripContext ?? { status: "not-materialized" })}
COMPLETE PROTOTYPE CONVERSATION (up to 20 turns):
${JSON.stringify(conversation)}
BOUNDED DEMO DESTINATION KNOWLEDGE:
${JSON.stringify(knowledge)}
NEW TRAVELER MESSAGE:
${body.message.trim()}`;
    const raw = await requestGeminiStructuredOutput(prompt, advisorSchema, 12_000);
    const result = normalizeResult(raw);
    if (!result) throw new GeminiServiceError("AI_INVALID_RESPONSE", "Gemini returned an invalid travel-advisor response. The shared journey is unchanged.", true);
    return Response.json({ result, modelMode: "live-gemini", context: { conversationTurns: conversation.length, mapPoints: journey.destinationIds.length, readinessIncluded: Boolean(journey.readiness), knowledgeDestinations: knowledge.length } });
  } catch (error) {
    if (error instanceof GeminiServiceError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable }, modelMode: "unavailable" }, { status: error.code === "AI_NOT_CONFIGURED" ? 503 : 502 });
    return Response.json({ error: { code: "AI_UPSTREAM_ERROR", message: "Live AI is unavailable. No demo response has been substituted and your journey is unchanged.", retryable: true }, modelMode: "unavailable" }, { status: 502 });
  }
}
