import { prototypeDestinationFor, prototypeDestinations, prototypeRouteFacts, type PrototypeRouteFact } from "./data/prototype-map-data.ts";
import type { AdvisorProposal, DestinationRecommendation, JourneyPrototypeState, PrototypeMapAction, PrototypePlanningHandoff, RouteInsight } from "./prototype-domain.ts";

export const createJourneyPrototypeState = (): JourneyPrototypeState => ({
  destinationIds: [], undoStack: [], selectedDestinationId: null, jobToBeDone: "", interests: [], planningBehavior: "flexible-explorer", maxDailyDrivingMinutes: null, season: null, readiness: null, readinessContext: null,
});

export const isPrototypeDestinationId = (id: string) => Boolean(prototypeDestinationFor(id));

const withRoute = (state: JourneyPrototypeState, destinationIds: string[], selectedDestinationId: string | null): JourneyPrototypeState => ({
  ...state,
  destinationIds,
  selectedDestinationId,
  undoStack: [...state.undoStack, state.destinationIds].slice(-20),
});

export function applyPrototypeMapAction(state: JourneyPrototypeState, action: PrototypeMapAction): JourneyPrototypeState {
  if (action.type === "select") return action.destinationId === null || isPrototypeDestinationId(action.destinationId) ? { ...state, selectedDestinationId: action.destinationId } : state;
  if (action.type === "undo") {
    const previous = state.undoStack.at(-1);
    return previous ? { ...state, destinationIds: previous, selectedDestinationId: previous.at(-1) ?? null, undoStack: state.undoStack.slice(0, -1) } : state;
  }
  if (action.type === "clear") return state.destinationIds.length ? withRoute(state, [], null) : state;
  if (action.type === "add") {
    if (!isPrototypeDestinationId(action.destinationId) || state.destinationIds.includes(action.destinationId)) return state;
    return withRoute(state, [...state.destinationIds, action.destinationId], action.destinationId);
  }
  if (action.type === "remove") {
    if (!state.destinationIds.includes(action.destinationId)) return state;
    const next = state.destinationIds.filter((id) => id !== action.destinationId);
    return withRoute(state, next, next.at(-1) ?? null);
  }
  if (action.type === "set-route") {
    const next = [...new Set(action.destinationIds.filter(isPrototypeDestinationId))].slice(0, 8);
    return next.length && next.join("|") !== state.destinationIds.join("|") ? withRoute(state, next, next.at(-1) ?? null) : state;
  }
  if (action.type === "reorder") {
    if (action.fromIndex < 0 || action.toIndex < 0 || action.fromIndex >= state.destinationIds.length || action.toIndex >= state.destinationIds.length || action.fromIndex === action.toIndex) return state;
    const next = [...state.destinationIds];
    const [moved] = next.splice(action.fromIndex, 1);
    next.splice(action.toIndex, 0, moved);
    return withRoute(state, next, moved);
  }
  return state;
}

export function applyIntentPatch(state: JourneyPrototypeState, patch: AdvisorProposal["intentPatch"]): JourneyPrototypeState {
  return {
    ...state,
    jobToBeDone: patch.jobToBeDone ?? state.jobToBeDone,
    interests: patch.interests ? [...new Set([...state.interests, ...patch.interests])] : state.interests,
    planningBehavior: patch.planningBehavior ?? state.planningBehavior,
    maxDailyDrivingMinutes: patch.maxDailyDrivingMinutes !== undefined ? patch.maxDailyDrivingMinutes : state.maxDailyDrivingMinutes,
    season: patch.season !== undefined ? patch.season : state.season,
  };
}

const factFor = (from: string, to: string) => prototypeRouteFacts.find((fact) => (fact.from === from && fact.to === to) || (fact.from === to && fact.to === from));

const estimatedFact = (from: string, to: string) => {
  const a = prototypeDestinationFor(from);
  const b = prototypeDestinationFor(to);
  if (!a || !b) return null;
  const distanceKm = Math.max(80, Math.round(Math.hypot((a.x - b.x) * 14, (a.y - b.y) * 11)));
  return { distanceKm, drivingMinutes: Math.round(distanceKm / 65 * 60), feasibility: "unknown" as const, difficultyScore: Math.max(a.terrain === "alpine" || b.terrain === "alpine" ? 4 : 2, 2), wowScore: a.terrain === b.terrain ? 3 : 4, reason: "Prototype estimate only; current roads, restrictions and driving time require verification." };
};

const difficultyLevel = (score: number): RouteInsight["difficulty"]["level"] => score <= 1 ? "Easy" : score === 2 ? "Moderate" : score === 3 ? "Challenging" : score === 4 ? "Very challenging" : "Extreme";
const wowLevel = (score: number): RouteInsight["wow"]["level"] => score <= 1 ? "Low" : score === 2 ? "Good" : score <= 4 ? "Great" : "Exceptional";

export function calculateRouteInsight(destinationIds: string[], maxDailyDrivingMinutes: number | null = null): RouteInsight | null {
  if (destinationIds.length < 2) return null;
  const facts = destinationIds.slice(1).map((to, index) => factFor(destinationIds[index], to) ?? estimatedFact(destinationIds[index], to)).filter(Boolean) as Array<Pick<PrototypeRouteFact, "distanceKm" | "drivingMinutes" | "feasibility" | "difficultyScore" | "wowScore" | "reason">>;
  if (!facts.length) return null;
  const special = facts.find((fact) => fact.feasibility === "special");
  const preparation = facts.find((fact) => fact.feasibility === "preparation");
  const unknown = facts.find((fact) => fact.feasibility === "unknown");
  const exceedsPersonalLimit = maxDailyDrivingMinutes ? facts.find((fact) => fact.drivingMinutes > maxDailyDrivingMinutes) : null;
  const difficultyScore = Math.max(...facts.map((fact) => fact.difficultyScore));
  const wowScore = Math.round(facts.reduce((sum, fact) => sum + fact.wowScore, 0) / facts.length);
  const urbanConnector = destinationIds.length === 2 && destinationIds.includes("guangzhou") && destinationIds.includes("shenzhen");
  return {
    distanceKm: facts.reduce((sum, fact) => sum + fact.distanceKm, 0),
    drivingMinutes: facts.reduce((sum, fact) => sum + fact.drivingMinutes, 0),
    metricsStatus: unknown ? "unknown" : "demo-known",
    feasibility: special ? { level: "Special requirements", reason: "This route crosses an area with additional travel requirements for international visitors. Travorien must verify feasibility before building the drive." } : unknown ? { level: "Unknown", reason: unknown.reason } : exceedsPersonalLimit ? { level: "Preparation needed", reason: `One mapped leg exceeds your ${maxDailyDrivingMinutes}-minute daily limit. The journey needs an explicit overnight split or a closer anchor before it can become a drive plan.` } : preparation ? { level: "Preparation needed", reason: preparation.reason } : { level: "Straightforward", reason: facts[0].reason },
    difficulty: { level: difficultyLevel(difficultyScore), score: difficultyScore, reason: special ? "Extreme distance, altitude and mountain-road exposure require specialist planning." : urbanConnector ? "Dense expressways, frequent services and many return options keep the drive operationally easy." : facts.find((fact) => fact.difficultyScore === difficultyScore)?.reason ?? facts[0].reason },
    wow: { level: wowLevel(urbanConnector ? 1 : wowScore), score: urbanConnector ? 1 : wowScore, reason: urbanConnector ? "Mostly urban and expressway driving, with limited road-trip scenery and frequent congestion." : facts.find((fact) => fact.wowScore >= wowScore)?.reason ?? facts[0].reason },
    provenance: "demo-mock",
  };
}

const driveMinutesBetween = (from: string | undefined, to: string) => {
  if (!from) return 0;
  return (factFor(from, to) ?? estimatedFact(from, to))?.drivingMinutes ?? 0;
};

export function recommendSurpriseDestinations(state: JourneyPrototypeState): DestinationRecommendation[] {
  const start = state.destinationIds.at(-1) ?? state.selectedDestinationId ?? "xian";
  const interests = state.interests.length ? state.interests : ["history", "mountains", "food"];
  const season = state.season?.toLowerCase() ?? "";
  return prototypeDestinations.filter((candidate) => candidate.id !== start && !state.destinationIds.includes(candidate.id)).map((candidate) => {
    const driveMinutes = driveMinutesBetween(start, candidate.id);
    const interestScore = candidate.interestKeys.filter((key) => interests.includes(key)).length * 8;
    const timeScore = state.maxDailyDrivingMinutes ? (driveMinutes <= state.maxDailyDrivingMinutes ? 10 : -Math.min(14, Math.round((driveMinutes - state.maxDailyDrivingMinutes) / 30))) : driveMinutes <= 320 ? 5 : -3;
    const xianBonus = start === "xian" ? ({ luoyang: 30, huashan: 35, pingyao: 24 }[candidate.id] ?? 0) : 0;
    const behaviorScore = state.planningBehavior === "wanderer" && candidate.terrain !== "urban" ? 5 : 0;
    const seasonScore = /winter|december|january|february/.test(season)
      ? (candidate.terrain === "coastal" ? 9 : candidate.terrain === "alpine" ? -7 : 0)
      : /summer|june|july|august/.test(season)
        ? (["alpine", "highland"].includes(candidate.terrain) ? 6 : candidate.terrain === "urban" ? -3 : 0)
        : /spring|autumn|fall|march|april|may|september|october|november/.test(season)
          ? (["historic", "highland"].includes(candidate.terrain) ? 4 : 0)
          : 0;
    const score = interestScore + timeScore + xianBonus + behaviorScore + seasonScore;
    return { destinationId: candidate.id, driveMinutes, reason: candidate.story, score, provenance: "demo-mock" as const };
  }).sort((a, b) => b.score - a.score || a.driveMinutes - b.driveMinutes).slice(0, 3);
}

export function surpriseSelectionAction(state: JourneyPrototypeState, destinationId: string): PrototypeMapAction {
  return state.destinationIds.length ? { type: "add", destinationId } : { type: "set-route", destinationIds: ["xian", destinationId] };
}

export function canContinuePrototypeSelfDrive(state: JourneyPrototypeState, insight: RouteInsight | null): boolean {
  if (!insight || !["Straightforward", "Preparation needed"].includes(insight.feasibility.level)) return false;
  return !state.readiness || ["LIKELY_ELIGIBLE", "ACTION_REQUIRED"].includes(state.readiness.status);
}

export function prototypeContinuationBlocker(state: JourneyPrototypeState, insight: RouteInsight | null): "route" | "readiness" | null {
  if (!insight || !["Straightforward", "Preparation needed"].includes(insight.feasibility.level)) return "route";
  if (state.readiness && !["LIKELY_ELIGIBLE", "ACTION_REQUIRED"].includes(state.readiness.status)) return "readiness";
  return null;
}

export function prototypeHandoffPrompt(handoff: PrototypePlanningHandoff): string {
  const destinations = handoff.destinationIds.map((id) => prototypeDestinationFor(id)).filter(Boolean);
  const regions = [...new Set(destinations.map((destination) => destination!.region))].join(" and ");
  const route = destinations.map((destination) => destination!.name).join(" → ");
  return [
    `Continue my shared ${regions} map journey: ${route}.`,
    handoff.jobToBeDone ? `What I want from the road: ${handoff.jobToBeDone}.` : "Help me shape the road-trip story before showing inventory.",
    `Planning behavior: ${handoff.planningBehavior.replaceAll("-", " ")}.`,
    handoff.interests.length ? `Keep these interests: ${handoff.interests.join(", ")}.` : "Keep the route open to discovery.",
    handoff.maxDailyDrivingMinutes ? `Hard daily driving limit: ${handoff.maxDailyDrivingMinutes} minutes.` : "No hard daily driving limit is set yet.",
    `Current demo route insight: ${handoff.routeInsight.feasibility.level}; ${handoff.routeInsight.difficulty.level}; wow ${handoff.routeInsight.wow.level}.`,
    "Choose a journey-fit car only after we agree the drive.",
  ].join(" ");
}

const mentionedDestinationIds = (prompt: string) => {
  const text = prompt.toLowerCase().replaceAll("’", "'");
  return prototypeDestinations.map((destination) => {
    const names = [destination.name.toLowerCase().replaceAll("’", "'"), destination.id.replaceAll("-", " ")];
    const positions = names.map((name) => text.indexOf(name)).filter((position) => position >= 0);
    return { id: destination.id, position: positions.length ? Math.min(...positions) : -1 };
  }).filter((item) => item.position >= 0).sort((a, b) => a.position - b.position).map((item) => item.id);
};

export function interpretPrototypePrompt(prompt: string, state: JourneyPrototypeState): AdvisorProposal {
  const text = prompt.trim().toLowerCase();
  const intentPatch: AdvisorProposal["intentPatch"] = {};
  const mapActions: PrototypeMapAction[] = [];
  let humanResponse = "Tell me what you want from the road—history, mountain silence, family time, food, or simply the freedom to decide tomorrow.";
  let suggestedDestinationIds: string[] = [];
  let uiSurface: AdvisorProposal["uiSurface"] = "conversation";
  let candidateJourneys: AdvisorProposal["candidateJourneys"] = [];

  if (/foreigner|temporary.*permit|can.*drive|licen[cs]e/.test(text)) {
    humanResponse = "International visitors can drive in mainland China only after completing the applicable temporary driving-permit procedure; an overseas licence alone is not enough. I can help organize the licence translation, documents, local application guidance and pickup readiness—without pretending that Travorien issues the permit.";
    uiSurface = "readiness";
  } else if (/yunnan.*sichuan|sichuan.*yunnan/.test(text)) {
    humanResponse = "Yunnan is usually the more approachable first drive in this prototype: gentler altitude progression, more mixed services and village-led days. Western Sichuan has the bigger alpine payoff, but mountain exposure, altitude and longer demanding sections make it less forgiving. I’d choose based on whether ease or high-alpine drama matters more—not budget first.";
    suggestedDestinationIds = ["dali", "shaxi", "siguniangshan"];
    candidateJourneys = [
      { id: "yunnan-slow-road", title: "Yunnan’s Tea Horse Road", destinationIds: ["kunming", "dali", "shaxi", "lijiang"], rationale: "Moderate highland progression, food and village depth." },
      { id: "sichuan-high-road", title: "Western Sichuan High Road", destinationIds: ["chengdu", "kangding", "siguniangshan"], rationale: "Bigger alpine drama with harder mountain days." },
    ];
  } else {
    if (/history|ancient|emperor|parents/.test(text)) intentPatch.interests = [...(intentPatch.interests ?? []), "history"];
    if (/food|eat|cuisine/.test(text)) intentPatch.interests = [...(intentPatch.interests ?? []), "food"];
    if (/mountain|quiet|nature/.test(text)) intentPatch.interests = [...(intentPatch.interests ?? []), "mountains", ...(text.includes("quiet") ? ["quiet"] : [])];
    if (/hate.*big cit|avoid.*big cit|no big cit/.test(text)) intentPatch.interests = [...(intentPatch.interests ?? []), "quiet"];
    if (/hate planning|surprise me|no plan|wake up.*decide/.test(text)) intentPatch.planningBehavior = "wanderer";
    else if (/plan it for me|daily itinerary|every day/.test(text)) intentPatch.planningBehavior = "detailed-planner";
    else if (/flexible|room to change|anchors/.test(text)) intentPatch.planningBehavior = "flexible-explorer";
    const twoHours = /(?:two|2)\s*hours?|120\s*minutes?/.test(text);
    if (twoHours) intentPatch.maxDailyDrivingMinutes = 120;
    if (/10 days|i want|i love|i hate|with kids|with my parents|don't want|do not want|surprise me/.test(text)) intentPatch.jobToBeDone = prompt.trim();
    const mentioned = mentionedDestinationIds(prompt);
    const removeMatch = text.match(/remove\s+([a-z’'\- ]+)/);
    const startingDestinationId = mentioned[0];
    if (removeMatch) {
      const removeId = mentioned.find((id) => state.destinationIds.includes(id));
      if (removeId) mapActions.push({ type: "remove", destinationId: removeId });
    } else if (/start me in|start.*from/.test(text) && startingDestinationId) mapActions.push({ type: "set-route", destinationIds: [startingDestinationId] });
    else mentioned.filter((id) => !state.destinationIds.includes(id)).forEach((destinationId) => mapActions.push({ type: "add", destinationId }));

    if (/surprise me|hate planning|no plan/.test(text)) {
      uiSurface = "surprise";
      const previewState = applyIntentPatch(state, intentPatch);
      suggestedDestinationIds = recommendSurpriseDestinations(previewState).map((item) => item.destinationId);
      humanResponse = `You don’t need an itinerary yet. I’ll use ${state.destinationIds.at(-1) ? `${prototypeDestinationFor(state.destinationIds.at(-1)!)?.name} as the current anchor` : "Xi’an as a playful demo starting point"}, then show three places with genuinely different road stories. Pick the one that makes you curious; the map will move with you.`;
    } else if (twoHours) {
      humanResponse = "I’ll treat two hours as a hard daily-driving ceiling. The current route needs short hops or a different anchor; I won’t squeeze a six-hour transfer into a confident-looking itinerary. Hainan and the Guilin–Yangshuo area are stronger prototype fits for this rhythm.";
      suggestedDestinationIds = ["haikou", "sanya", "guilin", "yangshuo"];
    } else if (intentPatch.interests?.includes("history") && intentPatch.interests.includes("food")) {
      humanResponse = "For ten days of history and food without leaning on big cities, I’d build around Xi’an, Luoyang and Pingyao, then leave breathing room for market towns and slower mornings. That gives the journey a clear sense of China’s imperial story without turning every day into a transfer.";
      suggestedDestinationIds = ["xian", "luoyang", "pingyao"];
      candidateJourneys = [{ id: "imperial-roads", title: "Imperial roads, lived-in history", destinationIds: ["xian", "luoyang", "pingyao"], rationale: "Emperors, regional food and walled-town evenings without a megacity-led itinerary." }];
    } else if (mapActions.length) {
      const affected = mapActions.flatMap((action) => "destinationId" in action && typeof action.destinationId === "string" ? [action.destinationId] : action.type === "set-route" ? action.destinationIds : []);
      humanResponse = `${affected.map((id) => prototypeDestinationFor(id)?.name).filter(Boolean).join(" and ")} ${removeMatch ? "has been removed from" : affected.length > 1 ? "are now part of" : "is now part of"} the shared journey. I’m reading the same route you see on the map, so the next recommendation will use this new shape.`;
      if (intentPatch.interests?.includes("mountains")) suggestedDestinationIds = ["siguniangshan", "shangri-la", "huashan"];
    }
  }

  const affectedDestinationIds = mapActions.flatMap((action) => "destinationId" in action && action.destinationId ? [action.destinationId] : action.type === "set-route" ? action.destinationIds : []);
  return {
    humanResponse,
    intentPatch,
    mapActions,
    suggestedDestinationIds: suggestedDestinationIds.filter(isPrototypeDestinationId).slice(0, 6),
    candidateJourneys,
    uiSurface,
    journeyMutationProposal: affectedDestinationIds.length ? { summary: "Update the shared map journey", affectedDestinationIds } : null,
    confidence: 0.82,
  };
}

export function validateAdvisorProposal(value: AdvisorProposal): AdvisorProposal | null {
  if (!value.humanResponse.trim() || value.humanResponse.length > 1800 || value.confidence < 0 || value.confidence > 1) return null;
  if (!value.suggestedDestinationIds.every(isPrototypeDestinationId)) return null;
  if (!value.mapActions.every((action) => {
    if (action.type === "select") return action.destinationId === null || isPrototypeDestinationId(action.destinationId);
    if (action.type === "clear" || action.type === "undo" || action.type === "reorder") return true;
    if (action.type === "set-route") return action.destinationIds.every(isPrototypeDestinationId);
    return isPrototypeDestinationId(action.destinationId);
  })) return null;
  return value;
}
