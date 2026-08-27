export type ID = string;
export type DataProvenance = "demo-mock";

export type TripIntentField =
  | "originCountry"
  | "travelers"
  | "travelerType"
  | "arrivalCity"
  | "destinationRegion"
  | "startDate"
  | "endDate"
  | "durationDays"
  | "interests"
  | "budget"
  | "travelPace"
  | "drivingPreference"
  | "vehiclePreference"
  | "luggageCount"
  | "crowdPreference"
  | "maxDailyDrivingMinutes"
  | "drivingLicenceStatus"
  | "accommodationPreference";

export interface TripIntent {
  originCountry: string | null;
  travelers: number | null;
  travelerType: "solo" | "couple" | "family" | "friends" | null;
  arrivalCity: string | null;
  destinationRegion: string | null;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  interests: string[];
  budget: "budget" | "mid-range" | "mid-to-premium" | "premium" | null;
  travelPace: "relaxed" | "balanced" | "fast" | null;
  drivingPreference: "self-drive" | "chauffeur" | "undecided" | null;
  vehiclePreference: "compact" | "sedan" | "suv" | "premium" | "mpv" | "undecided" | null;
  luggageCount: number | null;
  crowdPreference: "quiet" | "balanced" | "popular" | null;
  maxDailyDrivingMinutes: number | null;
  drivingLicenceStatus: "valid-foreign-licence" | "no-licence" | "unknown" | null;
  accommodationPreference: "local-character" | "comfort" | "premium" | "budget" | null;
  unresolvedFields: TripIntentField[];
}

export interface IntentExtractionResult {
  extractedFields: Partial<Omit<TripIntent, "unresolvedFields">>;
  confidence: number;
  unresolvedFields: TripIntentField[];
  nextQuestion: string;
  readyToGenerateTrip: boolean;
}

export interface ConversationMessage {
  id: ID;
  role: "user" | "assistant";
  text: string;
  status?: "sent" | "thinking" | "error";
}

export type TripPlanningStage =
  | "DISCOVERY"
  | "ROUTE_PROPOSAL"
  | "VEHICLE_SELECTION"
  | "VEHICLE_RESERVATION"
  | "HOTEL_UPSELL"
  | "HOTEL_SELECTION"
  | "TRIP_READY";

export interface RoutePlan {
  id: ID;
  title: string;
  summary: string;
  destinationIds: ID[];
  routeSegmentIds: ID[];
  days: TripDay[];
  startDate: string;
  endDate: string;
  distanceKm: number;
  drivingMinutes: number;
  longestDrivingMinutes: number;
  rationale: string[];
  provenance: DataProvenance;
}

export interface DestinationMedia {
  destinationId: ID;
  imageUrl: string;
  heroImage: string;
  cardImage: string;
  gallery: string[];
  source: string;
  sourceType: "public-source";
  sourceUrl: string;
  sourceName: string;
  author: string;
  licenseNote: string;
  alt: string;
  provenance: DataProvenance;
}

export interface VehicleMedia {
  vehicleId: ID;
  imageUrl: string;
  primaryImage: string;
  gallery: string[];
  source: string;
  sourceType: "public-source";
  sourceUrl: string;
  sourceName: string;
  author: string;
  licenseNote: string;
  alt: string;
  provenance: DataProvenance;
}

export interface HotelMedia {
  hotelId: ID;
  primaryImage: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: "public-source";
  author: string;
  licenseNote: string;
  alt: string;
  imageKind: "style-reference-not-property";
  provenance: DataProvenance;
}

export interface VehicleOffer {
  id: ID;
  snapshotId: ID;
  queryFingerprint: string;
  vehicleId: ID;
  model: string;
  primaryImage: string;
  gallery: string[];
  imageProvenance: VehicleMedia;
  supplierName: string;
  source: string;
  category: "compact" | "sedan" | "suv" | "premium" | "mpv";
  transmission: "automatic" | "manual";
  seats: number;
  luggage: number;
  doors: number;
  fuelType: Vehicle["fuelType"];
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  currency: "CNY";
  dailyPriceCny: number;
  totalPriceCny: number;
  rentalDays: number;
  available: true;
  availability: "available-demo";
  validUntil: string;
  rank: number;
  score: number;
  recommendation: string;
  recommendationReasons: string[];
  inclusions: string[];
  terms: string[];
  cancellationPolicy: string;
  mileagePolicy: string;
  depositCny: number;
  basicCoverage: string;
  provenance: DataProvenance;
}

export interface VehicleSelection {
  offerId: ID;
  snapshotId: ID;
}

export interface VehicleBooking extends Booking {
  kind: "vehicle";
  status: "confirmed";
  offerId: ID;
  snapshotId: ID;
  reservationCode: string;
  idempotencyKey: string;
  reservedAt: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  currency: "CNY";
  supplierName: string;
  source: string;
  cancellationPolicy: string;
}

export interface HotelOffer {
  id: ID;
  snapshotId: ID;
  hotelId: ID;
  primaryImage: string;
  imageProvenance: HotelMedia;
  dayId: ID;
  date: string;
  destinationId: ID;
  supplierName: string;
  source: string;
  roomCount: number;
  roomType: string;
  mealPlan: string;
  cancellationPolicy: string;
  amenities: string[];
  currency: "CNY";
  roomRateCny: number;
  nightlyPriceCny: number;
  available: true;
  validUntil: string;
  rank: number;
  score: number;
  recommendation: string;
  parkingType: Hotel["parkingType"];
  parkingDistanceMeters: number | null;
  lateArrivalSuitability: Hotel["lateArrivalSuitability"];
  vehicleAccess: Hotel["vehicleAccess"];
  oldTownAccessMinutes: number | null;
  routeConvenience: Hotel["routeConvenience"];
  terms: string[];
  provenance: DataProvenance;
}

export interface HotelSelection {
  decision: "selected" | "skipped";
  selectedOfferIds: ID[];
  snapshotId: ID | null;
}

export interface PlanningSession {
  id: ID;
  revision: number;
  stage: TripPlanningStage;
  plannedTripId: ID;
  intent: TripIntent;
  conversation: ConversationMessage[];
  routePlan: RoutePlan | null;
  vehicleOffers: VehicleOffer[];
  vehicleSelection: VehicleSelection | null;
  vehicleBooking: VehicleBooking | null;
  hotelDecision: "pending" | "yes" | "skip";
  hotelOffers: HotelOffer[];
  hotelSelection: HotelSelection | null;
  provenance: DataProvenance;
}

export interface ConversationTurnResult {
  assistantMessage: string;
  extractedFields: Partial<Omit<TripIntent, "unresolvedFields">>;
  proposedDestinationIds: ID[];
  routeExplanation: string | null;
  confidence: number;
}

export type TripChangeCommand =
  | { type: "set-max-daily-driving-minutes"; maxMinutes: number }
  | { type: "ADD_RISK"; eventId: ID; risk: Risk }
  | { type: "REPLACE_DAY"; eventId: ID; dayId: ID; replacement: TripDay }
  | { type: "REPLACE_BOOKING"; eventId: ID; bookingId: ID; replacement: Booking };

export interface Traveler {
  id: ID;
  nationality: string;
  adults: number;
  arrivalCityId: ID;
  startDate: string;
  endDate: string;
  hasForeignDrivingLicence: boolean;
  travelStyles: string[];
  drivingPreference: "relaxed" | "balanced" | "adventurous";
  vehiclePreference: string;
  budget: "mid-range" | "mid-to-premium" | "premium";
}

export interface Destination {
  id: ID;
  name: string;
  province: string;
  elevationMeters: number;
  summary: string;
  provenance: DataProvenance;
}

export interface RouteSegment {
  id: ID;
  fromDestinationId: ID;
  toDestinationId: ID;
  distanceKm: number;
  drivingMinutes: number;
  roadType: string;
  notes: string;
  provenance: DataProvenance;
}

export interface Vehicle {
  id: ID;
  name: string;
  category: string;
  transmission: "automatic" | "manual";
  seats: number;
  luggage: number;
  doors: number;
  fuelType: "petrol" | "hybrid" | "plug-in-hybrid";
  dailyPriceCny: number;
  highlights: string[];
  provenance: DataProvenance;
}

export interface Hotel {
  id: ID;
  destinationId: ID;
  name: string;
  style: string;
  nightlyPriceCny: number;
  rating: number;
  amenities: string[];
  parkingType: "on-site" | "nearby-lot" | "valet-transfer" | "unknown";
  parkingDistanceMeters: number | null;
  lateArrivalSuitability: "strong" | "limited" | "unknown";
  vehicleAccess: "direct" | "edge-of-old-town" | "pedestrian-transfer" | "unknown";
  oldTownAccessMinutes: number | null;
  routeConvenience: "high" | "medium" | "low" | "unknown";
  provenance: DataProvenance;
}

export interface Experience {
  id: ID;
  destinationId: ID;
  name: string;
  category: "nature" | "culture" | "food" | "wellness";
  durationHours: number;
  pricePerAdultCny: number;
  provenance: DataProvenance;
}

export interface PermitRequirement {
  id: ID;
  nationality: string;
  title: string;
  status: "guidance-included" | "action-needed" | "ready";
  leadTimeDays: number;
  feeCny: number;
  requiredDocuments: string[];
  disclaimer: string;
  provenance: DataProvenance;
}

export interface TripDay {
  id: ID;
  dayNumber: number;
  date: string;
  destinationId: ID;
  title: string;
  routeSegmentIds: ID[];
  hotelId?: ID;
  experienceIds: ID[];
  notes: string;
}

export interface Booking {
  id: ID;
  tripId: ID;
  kind: "flight" | "vehicle" | "hotel" | "experience" | "permit-assistance";
  itemId: ID;
  status: "recommended" | "selected" | "held" | "confirmed";
  amountCny: number;
  dayId?: ID;
  scheduledAt?: string;
  notes?: string;
  provenance: DataProvenance;
}

export interface Risk {
  id: ID;
  tripId: ID;
  severity: "low" | "medium" | "high";
  category: "road" | "weather" | "supplier" | "arrival" | "altitude" | "permit";
  title: string;
  mitigation: string;
}

export type RealitySignalSourceType = "demo-mock" | "manual-demo" | "static-demo-feed";

export interface RawRealitySignal {
  id: ID;
  source: string;
  sourceType: RealitySignalSourceType;
  observedAt: string;
  payload: unknown;
  rawText?: string;
  externalReference?: string;
  updatesEventId?: ID;
  provenance: DataProvenance;
}

export interface RealitySignalAdapter<Input = unknown> {
  id: ID;
  sourceType: RealitySignalSourceType;
  adapt(input: Input): RawRealitySignal[];
}

export type KnownRealityEventType = "WEATHER_RISK" | "ROAD_CLOSURE" | "HOTEL_UNAVAILABLE" | "FLIGHT_DELAY";
export type ExtensionRealityEventType = `EXT:${string}`;
export type RealityEventType = KnownRealityEventType | ExtensionRealityEventType;

export interface RealityEventScope {
  destinationIds: ID[];
  routeSegmentIds: ID[];
  hotelIds: ID[];
  bookingIds: ID[];
  externalReferences: string[];
}

export type RealityEventDetails =
  | { kind: "WEATHER_RISK"; expectedOperationalDelayMinutes?: number }
  | { kind: "ROAD_CLOSURE"; closureStatus: "CLOSED" | "REOPENED"; expectedOperationalDelayMinutes?: number }
  | { kind: "HOTEL_UNAVAILABLE"; reason: string }
  | { kind: "FLIGHT_DELAY"; delayMinutes: number; scheduledArrivalAt: string; estimatedArrivalAt: string }
  | ({ kind: ExtensionRealityEventType } & Record<string, unknown>);

export interface RealityEvent {
  id: ID;
  version: number;
  supersedesVersion?: number;
  updatedAt: string;
  sourceSignalId: ID;
  type: RealityEventType;
  title: string;
  description: string;
  source: string;
  sourceType: RealitySignalSourceType;
  confidence: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "DETECTED" | "ACTIVE" | "RESOLVED" | "DISMISSED";
  location: { label: string; destinationId?: ID };
  scope: RealityEventScope;
  details: RealityEventDetails;
  effectiveFrom: string;
  effectiveUntil: string;
  observedAt: string;
  evidence: string[];
  tags: string[];
  provenance: DataProvenance;
}

export type AffectedObjectType = "RouteSegment" | "Experience" | "TripDay" | "Hotel" | "Booking" | "Risk";

export interface AffectedTripObject {
  objectType: AffectedObjectType;
  objectId: ID;
  label: string;
  reason: string;
}

export interface ImpactAssessment {
  id: ID;
  eventId: ID;
  eventVersion: number;
  tripId: ID;
  baseTripRevision: number;
  eventFingerprint: string;
  catalogFingerprint: string;
  affectedObjects: AffectedTripObject[];
  impactTypes: Array<"SAFETY" | "ROUTE" | "EXPERIENCE" | "OUTDOOR_EXPERIENCE" | "ARRIVAL_TIME" | "STAY" | "BOOKING" | "PRICE">;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  reasoning: string[];
  requiresAction: boolean;
  mitigationStatus: "UNMITIGATED" | "MITIGATED" | "ACCEPTED";
  provenance: DataProvenance;
}

export interface CandidatePlan {
  id: ID;
  eventId: ID;
  eventVersion: number;
  tripId: ID;
  baseTripRevision: number;
  impactAssessmentId: ID;
  eventFingerprint: string;
  catalogFingerprint: string;
  policyId: ID;
  kind: "KEEP" | "WAIT" | "SKIP" | "REROUTE" | "CHANGE_DAY" | "REPLACE";
  responseEffect: "ACCEPTED" | "MITIGATED";
  title: string;
  description: string;
  changeCommands: TripChangeCommand[];
  riskLevel: "LOW" | "LOW_MEDIUM" | "MEDIUM" | "HIGH";
  estimatedCostDeltaCny: number;
  drivingTimeDeltaMinutes: number;
  tripDurationDeltaDays: number;
  expectedOutcome: {
    priceDeltaCny: number;
    drivingTimeDeltaMinutes: number;
    operationalDelayMinutes?: number;
    hotelId?: ID;
    segmentCompletionExpected?: boolean;
  };
  affectedDays: number[];
  experienceOutcome: string;
  tradeoffs: string[];
  provenance: DataProvenance;
}

export interface TripDecision {
  id: ID;
  eventId: ID;
  eventVersion: number;
  impactAssessmentId: ID;
  eventFingerprint: string;
  catalogFingerprint: string;
  candidatePlanIds: ID[];
  candidatePlans: CandidatePlan[];
  selectedPlanId: ID;
  selectedPlan: CandidatePlan;
  tripRevisionBefore: number;
  tripRevisionAfter: number;
  tripChangeId: ID;
  decisionTime: string;
}

export interface TripDiff {
  objectType: "TripDay" | "RouteSegment" | "Hotel" | "Experience" | "Booking" | "Risk" | "Price" | "Trip";
  objectId: ID;
  field: string;
  before: string;
  after: string;
}

export interface TripChange {
  id: ID;
  tripId: ID;
  source: "traveler" | "reality-event";
  intent: string;
  summary: string;
  appliedAt: string;
  eventId?: ID;
  eventVersion?: number;
  decisionId?: ID;
  tripRevisionBefore?: number;
  tripRevisionAfter?: number;
  diffs: TripDiff[];
  priceDeltaCny: number;
}

export interface OutcomeMetrics {
  priceDeltaCny?: number;
  drivingTimeDeltaMinutes?: number;
  operationalDelayMinutes?: number;
  hotelId?: ID;
  segmentCompleted?: boolean;
}

export interface OutcomeObservation {
  id: ID;
  tripId: ID;
  eventId: ID;
  eventVersion: number;
  impactAssessmentId: ID;
  decisionId: ID;
  selectedPlanId: ID;
  tripRevision: number;
  observedAt: string;
  expected: OutcomeMetrics;
  observed: OutcomeMetrics;
  status: "MATCHED" | "DEVIATED" | "PARTIAL";
  notes: string;
  source: string;
  sourceType: RealitySignalSourceType;
  provenance: DataProvenance;
}

export interface OperationsTimelineEntry {
  id: ID;
  tripId: ID;
  kind: "SIGNAL_RECEIVED" | "EVENT_COMPILED" | "EVENT_UPDATED" | "IMPACT_ASSESSED" | "PLANS_PREPARED" | "DECISION_MADE" | "TRIP_REVISED" | "OUTCOME_OBSERVED" | "EVENT_RESOLVED";
  occurredAt: string;
  eventId?: ID;
  eventVersion?: number;
  impactAssessmentId?: ID;
  decisionId?: ID;
  tripChangeId?: ID;
  outcomeObservationId?: ID;
  title: string;
  detail: string;
  sourceType: RealitySignalSourceType;
  provenance: DataProvenance;
}

export interface RealityRuntimeState {
  signals: RawRealitySignal[];
  outcomes: OutcomeObservation[];
  timeline: OperationsTimelineEntry[];
}

export interface TripPrice {
  currency: "CNY";
  vehicle: number;
  hotels: number;
  experiences: number;
  permitAssistance: number;
  roadSupport: number;
  total: number;
}

export interface Trip {
  id: ID;
  title: string;
  status: "draft" | "customized" | "ready";
  revision: number;
  traveler: Traveler;
  vehicleId: ID;
  vehicleBookingId?: ID;
  planningSessionId?: ID;
  permitRequirementId: ID;
  days: TripDay[];
  bookings: Booking[];
  risks: Risk[];
  realityEvents: RealityEvent[];
  decisions: TripDecision[];
  changes: TripChange[];
  price: TripPrice;
  provenance: DataProvenance;
}

export interface Catalog {
  destinations: Destination[];
  routeSegments: RouteSegment[];
  vehicles: Vehicle[];
  hotels: Hotel[];
  experiences: Experience[];
  permitRequirements: PermitRequirement[];
}
