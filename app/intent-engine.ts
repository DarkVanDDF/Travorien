import type { IntentExtractionResult, Traveler, TripIntent, TripIntentField } from "./domain.ts";

export const intentFields: TripIntentField[] = [
  "originCountry", "travelers", "travelerType", "arrivalCity", "destinationRegion",
  "startDate", "endDate", "durationDays", "interests", "budget", "travelPace",
  "drivingPreference", "vehiclePreference", "luggageCount", "crowdPreference",
  "maxDailyDrivingMinutes", "drivingLicenceStatus", "accommodationPreference",
];

export const minimumViableIntentFields: TripIntentField[] = ["destinationRegion", "durationDays", "travelers", "drivingPreference"];

export function createEmptyTripIntent(): TripIntent {
  return {
    originCountry: null, travelers: null, travelerType: null, arrivalCity: null,
    destinationRegion: null, startDate: null, endDate: null, durationDays: null,
    interests: [], budget: null, travelPace: null, drivingPreference: null,
    vehiclePreference: null, luggageCount: null, crowdPreference: null, maxDailyDrivingMinutes: null,
    drivingLicenceStatus: null, accommodationPreference: null,
    unresolvedFields: [...intentFields],
  };
}

const hasValue = (intent: TripIntent, field: TripIntentField) => field === "interests" ? intent.interests.length > 0 : intent[field] !== null;

export function deriveUnresolvedFields(intent: TripIntent): TripIntentField[] {
  return intentFields.filter((field) => !hasValue(intent, field));
}

export function isMinimumViableIntent(intent: TripIntent): boolean {
  return minimumViableIntentFields.every((field) => hasValue(intent, field)) && intent.drivingPreference === "self-drive";
}

export function isRoutePlanReadyIntent(intent: TripIntent): boolean {
  return isMinimumViableIntent(intent) && Boolean(intent.arrivalCity && intent.startDate);
}

export function nextQuestionForIntent(intent: TripIntent): string {
  if (!intent.destinationRegion) return "Which part of China would you most like to explore by road?";
  if (!intent.travelers) return "Are you traveling solo, as a couple, with family, or with friends?";
  if (!intent.durationDays) return "Roughly how many days would you like the road trip to last?";
  if (!intent.drivingPreference) return "Would you like to drive yourselves, or would you prefer a driver?";
  if (!intent.arrivalCity) return "Which city will you arrive in before picking up the car?";
  if (!intent.startDate) return "What date should the road trip begin?";
  if (!intent.originCountry) return "Which country will you be traveling from? That helps with driving-readiness guidance.";
  if (!intent.drivingLicenceStatus) return "Do you currently hold a valid driving licence in your home country?";
  if (!intent.travelPace) return "Should the journey feel relaxed, balanced, or fast-paced?";
  if (!intent.vehiclePreference) return "Do you have a vehicle preference, such as an automatic SUV?";
  return "Anything else you want the first route to optimize for?";
}

const validTravelerTypes = new Set(["solo", "couple", "family", "friends"]);
const validBudgets = new Set(["budget", "mid-range", "mid-to-premium", "premium"]);
const validPaces = new Set(["relaxed", "balanced", "fast"]);
const validDriving = new Set(["self-drive", "chauffeur", "undecided"]);
const validLicence = new Set(["valid-foreign-licence", "no-licence", "unknown"]);
const validVehicles = new Set(["compact", "sedan", "suv", "premium", "mpv", "undecided"]);
const validCrowd = new Set(["quiet", "balanced", "popular"]);
const validAccommodation = new Set(["local-character", "comfort", "premium", "budget"]);

export function sanitizeExtractedFields(value: unknown): IntentExtractionResult["extractedFields"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: IntentExtractionResult["extractedFields"] = {};
  const stringFields = ["originCountry", "arrivalCity", "destinationRegion", "startDate", "endDate"] as const;
  for (const field of stringFields) if (typeof source[field] === "string" && source[field].trim()) result[field] = source[field].trim();
  if (Number.isInteger(source.travelers) && Number(source.travelers) >= 1 && Number(source.travelers) <= 12) result.travelers = Number(source.travelers);
  if (Number.isInteger(source.durationDays) && Number(source.durationDays) >= 2 && Number(source.durationDays) <= 60) result.durationDays = Number(source.durationDays);
  if (Number.isInteger(source.luggageCount) && Number(source.luggageCount) >= 0 && Number(source.luggageCount) <= 12) result.luggageCount = Number(source.luggageCount);
  if (Number.isInteger(source.maxDailyDrivingMinutes) && Number(source.maxDailyDrivingMinutes) >= 60 && Number(source.maxDailyDrivingMinutes) <= 480) result.maxDailyDrivingMinutes = Number(source.maxDailyDrivingMinutes);
  if (Array.isArray(source.interests)) result.interests = [...new Set(source.interests.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))].slice(0, 8);
  if (typeof source.travelerType === "string" && validTravelerTypes.has(source.travelerType)) result.travelerType = source.travelerType as TripIntent["travelerType"];
  if (typeof source.budget === "string" && validBudgets.has(source.budget)) result.budget = source.budget as TripIntent["budget"];
  if (typeof source.travelPace === "string" && validPaces.has(source.travelPace)) result.travelPace = source.travelPace as TripIntent["travelPace"];
  if (typeof source.drivingPreference === "string" && validDriving.has(source.drivingPreference)) result.drivingPreference = source.drivingPreference as TripIntent["drivingPreference"];
  if (typeof source.vehiclePreference === "string" && validVehicles.has(source.vehiclePreference)) result.vehiclePreference = source.vehiclePreference as TripIntent["vehiclePreference"];
  if (typeof source.crowdPreference === "string" && validCrowd.has(source.crowdPreference)) result.crowdPreference = source.crowdPreference as TripIntent["crowdPreference"];
  if (typeof source.accommodationPreference === "string" && validAccommodation.has(source.accommodationPreference)) result.accommodationPreference = source.accommodationPreference as TripIntent["accommodationPreference"];
  if (typeof source.drivingLicenceStatus === "string" && validLicence.has(source.drivingLicenceStatus)) result.drivingLicenceStatus = source.drivingLicenceStatus as TripIntent["drivingLicenceStatus"];
  return result;
}

export function mergeTripIntent(current: TripIntent, extracted: unknown): TripIntent {
  const fields = sanitizeExtractedFields(extracted);
  const merged: TripIntent = { ...current, ...fields, interests: fields.interests ? [...new Set([...current.interests, ...fields.interests])] : [...current.interests], unresolvedFields: [] };
  merged.unresolvedFields = deriveUnresolvedFields(merged);
  return merged;
}

export function retainTripIntentOnAiFailure(current: TripIntent): TripIntent {
  return current;
}

export function validateExtractionResult(value: unknown): IntentExtractionResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (typeof source.confidence !== "number" || source.confidence < 0 || source.confidence > 1) return null;
  if (typeof source.nextQuestion !== "string" || !source.nextQuestion.trim()) return null;
  const unresolved = Array.isArray(source.unresolvedFields) ? source.unresolvedFields.filter((item): item is TripIntentField => typeof item === "string" && intentFields.includes(item as TripIntentField)) : [];
  return { extractedFields: sanitizeExtractedFields(source.extractedFields), confidence: source.confidence, unresolvedFields: unresolved, nextQuestion: source.nextQuestion.trim(), readyToGenerateTrip: Boolean(source.readyToGenerateTrip) };
}

export function intentToTraveler(intent: TripIntent): Traveler | null {
  if (!isRoutePlanReadyIntent(intent)) return null;
  const arrivalCityId = ({ kunming: "kunming", dali: "dali", shaxi: "shaxi", lijiang: "lijiang" } as Record<string, string>)[intent.arrivalCity!.trim().toLowerCase()];
  if (!arrivalCityId) return null;
  const startDate = intent.startDate!;
  const start = new Date(`${startDate}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() + (intent.durationDays ?? 9) - 1);
  return {
    id: "traveler-conversation", nationality: intent.originCountry ?? "Not specified",
    adults: intent.travelers!, arrivalCityId,
    startDate, endDate: intent.endDate ?? start.toISOString().slice(0, 10),
    hasForeignDrivingLicence: intent.drivingLicenceStatus === "valid-foreign-licence",
    travelStyles: [...intent.interests],
    drivingPreference: intent.travelPace === "fast" ? "adventurous" : intent.travelPace === "balanced" ? "balanced" : "relaxed",
    vehiclePreference: intent.vehiclePreference ?? "undecided",
    budget: intent.budget === "premium" ? "premium" : intent.budget === "mid-range" || intent.budget === "budget" ? "mid-range" : "mid-to-premium",
  };
}

export const yunnanDemoIntent: TripIntent = {
  originCountry: "Germany", travelers: 2, travelerType: "couple", arrivalCity: "Kunming",
  destinationRegion: "Yunnan", startDate: "2026-10-10", endDate: "2026-10-18", durationDays: 9,
  interests: ["Mountains", "Local food", "Small towns"], budget: "mid-to-premium", travelPace: "relaxed",
  drivingPreference: "self-drive", vehiclePreference: "suv", luggageCount: 2, crowdPreference: "quiet", maxDailyDrivingMinutes: 180,
  drivingLicenceStatus: "valid-foreign-licence", accommodationPreference: "local-character", unresolvedFields: [],
};
