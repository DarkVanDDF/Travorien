import type { DrivingReadinessAssessment } from "./product-domain.ts";

export type PlanningBehavior = "detailed-planner" | "flexible-explorer" | "wanderer";
export type AdvisorSurface = "conversation" | "readiness" | "surprise" | "route-insight";
export type AdvisorMessageSource = "live-ai" | "demo-guidance" | "map-activity" | "system" | "traveler";

export interface PrototypeDestination {
  id: string;
  name: string;
  region: string;
  x: number;
  y: number;
  tags: string;
  story: string;
  interestKeys: string[];
  terrain: "urban" | "coastal" | "karst" | "highland" | "alpine" | "historic" | "desert";
  provenance: "demo-mock";
}

export interface PrototypeReadinessContext {
  nationality: string;
  licenceCountry: string;
  hasValidForeignLicence: boolean | null;
  arrivalCity: string;
  arrivalDate: string;
  stayDays: number;
}

export interface JourneyPrototypeState {
  destinationIds: string[];
  undoStack: string[][];
  selectedDestinationId: string | null;
  jobToBeDone: string;
  interests: string[];
  planningBehavior: PlanningBehavior;
  maxDailyDrivingMinutes: number | null;
  season: string | null;
  readiness: DrivingReadinessAssessment | null;
  readinessContext: PrototypeReadinessContext | null;
}

export type PrototypeMapAction =
  | { type: "add"; destinationId: string }
  | { type: "remove"; destinationId: string }
  | { type: "set-route"; destinationIds: string[] }
  | { type: "reorder"; fromIndex: number; toIndex: number }
  | { type: "clear" }
  | { type: "undo" }
  | { type: "select"; destinationId: string | null };

export type FeasibilityLevel = "Straightforward" | "Preparation needed" | "Special requirements" | "Not recommended" | "Unknown";
export type DifficultyLevel = "Easy" | "Moderate" | "Challenging" | "Very challenging" | "Extreme";
export type WowLevel = "Low" | "Good" | "Great" | "Exceptional";

export interface RouteInsight {
  distanceKm: number;
  drivingMinutes: number;
  metricsStatus: "demo-known" | "unknown";
  feasibility: { level: FeasibilityLevel; reason: string };
  difficulty: { level: DifficultyLevel; reason: string; score: number };
  wow: { level: WowLevel; reason: string; score: number };
  provenance: "demo-mock";
}

export interface DestinationRecommendation {
  destinationId: string;
  driveMinutes: number;
  reason: string;
  score: number;
  provenance: "demo-mock";
}

export interface AdvisorIntentPatch {
  jobToBeDone?: string;
  interests?: string[];
  planningBehavior?: PlanningBehavior;
  maxDailyDrivingMinutes?: number | null;
  season?: string | null;
}

export interface CandidateJourney {
  id: string;
  title: string;
  destinationIds: string[];
  rationale: string;
}

export interface AdvisorProposal {
  humanResponse: string;
  intentPatch: AdvisorIntentPatch;
  mapActions: PrototypeMapAction[];
  suggestedDestinationIds: string[];
  candidateJourneys: CandidateJourney[];
  uiSurface: AdvisorSurface;
  journeyMutationProposal: { summary: string; affectedDestinationIds: string[] } | null;
  confidence: number;
}

export interface AdvisorConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  source: AdvisorMessageSource;
}

export interface PrototypePlanningHandoff {
  kind: "prototype-journey";
  destinationIds: string[];
  jobToBeDone: string;
  interests: string[];
  planningBehavior: PlanningBehavior;
  maxDailyDrivingMinutes: number | null;
  season: string | null;
  readiness: DrivingReadinessAssessment | null;
  readinessContext: PrototypeReadinessContext | null;
  routeInsight: RouteInsight;
}
