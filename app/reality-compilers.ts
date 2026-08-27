import type { Catalog, RawRealitySignal, RealityEvent, RealityEventDetails, RealityEventType } from "./domain.ts";

export interface EventCompiler {
  id: string;
  eventType: RealityEventType;
  supports(signal: RawRealitySignal): boolean;
  compile(signal: RawRealitySignal, catalog: Catalog): RealityEvent | null;
}

type Payload = Record<string, unknown>;

const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : null;
const finiteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

const payloadFor = (signal: RawRealitySignal): Payload | null => signal.payload && typeof signal.payload === "object" && !Array.isArray(signal.payload) ? signal.payload as Payload : null;

const knownReferences = (payload: Payload, catalog: Catalog) => {
  const destinationIds = strings(payload.destinationIds) ?? [];
  const routeSegmentIds = strings(payload.routeSegmentIds) ?? [];
  const hotelIds = strings(payload.hotelIds) ?? [];
  const bookingIds = strings(payload.bookingIds) ?? [];
  if (!destinationIds.every((id) => catalog.destinations.some((item) => item.id === id))) return null;
  if (!routeSegmentIds.every((id) => catalog.routeSegments.some((item) => item.id === id))) return null;
  if (!hotelIds.every((id) => catalog.hotels.some((item) => item.id === id))) return null;
  return { destinationIds, routeSegmentIds, hotelIds, bookingIds };
};

const commonEvent = (signal: RawRealitySignal, eventType: RealityEventType, details: RealityEventDetails, catalog: Catalog): RealityEvent | null => {
  const payload = payloadFor(signal);
  if (!payload || payload.eventType !== eventType) return null;
  const references = knownReferences(payload, catalog);
  const version = finiteNumber(payload.version);
  const confidence = finiteNumber(payload.confidence);
  const severity = payload.severity;
  const status = payload.status;
  const effectiveFrom = payload.effectiveFrom;
  const effectiveUntil = payload.effectiveUntil;
  if (
    typeof signal.id !== "string" || !signal.id
    || typeof signal.source !== "string" || !signal.source
    || !["demo-mock", "manual-demo", "static-demo-feed"].includes(signal.sourceType)
    || signal.provenance !== "demo-mock"
    || typeof signal.observedAt !== "string" || !Number.isFinite(Date.parse(signal.observedAt))
    || !references
    || typeof payload.eventId !== "string"
    || !Number.isInteger(version) || version! < 1
    || confidence === null || confidence < 0 || confidence > 1
    || !["LOW", "MEDIUM", "HIGH"].includes(String(severity))
    || !["DETECTED", "ACTIVE", "RESOLVED", "DISMISSED"].includes(String(status))
    || typeof payload.title !== "string" || typeof payload.description !== "string"
    || typeof payload.locationLabel !== "string"
    || typeof effectiveFrom !== "string" || typeof effectiveUntil !== "string"
    || !Number.isFinite(Date.parse(effectiveFrom)) || !Number.isFinite(Date.parse(effectiveUntil))
    || Date.parse(effectiveFrom) > Date.parse(effectiveUntil)
    || (typeof payload.destinationId === "string" && !catalog.destinations.some((item) => item.id === payload.destinationId))
  ) return null;
  const supersedesVersion = finiteNumber(payload.supersedesVersion);
  if (supersedesVersion !== null && (!Number.isInteger(supersedesVersion) || supersedesVersion! >= version!)) return null;
  return {
    id: payload.eventId,
    version: version!,
    ...(supersedesVersion === null ? {} : { supersedesVersion: supersedesVersion! }),
    updatedAt: signal.observedAt,
    sourceSignalId: signal.id,
    type: eventType,
    title: payload.title,
    description: payload.description,
    source: signal.source,
    sourceType: signal.sourceType,
    confidence,
    severity: severity as RealityEvent["severity"],
    status: status as RealityEvent["status"],
    location: { label: payload.locationLabel, ...(typeof payload.destinationId === "string" ? { destinationId: payload.destinationId } : {}) },
    scope: { ...references, externalReferences: signal.externalReference ? [signal.externalReference] : [] },
    details,
    effectiveFrom,
    effectiveUntil,
    observedAt: signal.observedAt,
    evidence: strings(payload.evidence) ?? [],
    tags: strings(payload.tags) ?? [],
    provenance: "demo-mock",
  };
};

const createCompiler = (eventType: RealityEventType, details: (payload: Payload) => RealityEventDetails | null): EventCompiler => ({
  id: `compiler-${eventType.toLowerCase().replaceAll("_", "-")}`,
  eventType,
  supports(signal) { return payloadFor(signal)?.eventType === eventType; },
  compile(signal, catalog) {
    const payload = payloadFor(signal);
    const eventDetails = payload ? details(payload) : null;
    return eventDetails ? commonEvent(signal, eventType, eventDetails, catalog) : null;
  },
});

export const weatherRiskCompiler = createCompiler("WEATHER_RISK", (payload) => ({
  kind: "WEATHER_RISK",
  ...(finiteNumber(payload.expectedOperationalDelayMinutes) === null ? {} : { expectedOperationalDelayMinutes: finiteNumber(payload.expectedOperationalDelayMinutes)! }),
}));

export const roadClosureCompiler = createCompiler("ROAD_CLOSURE", (payload) => {
  if (!Array.isArray(payload.routeSegmentIds) || !payload.routeSegmentIds.length || !["CLOSED", "REOPENED"].includes(String(payload.closureStatus))) return null;
  return {
    kind: "ROAD_CLOSURE",
    closureStatus: payload.closureStatus as "CLOSED" | "REOPENED",
    ...(finiteNumber(payload.expectedOperationalDelayMinutes) === null ? {} : { expectedOperationalDelayMinutes: finiteNumber(payload.expectedOperationalDelayMinutes)! }),
  };
});

export const hotelUnavailableCompiler = createCompiler("HOTEL_UNAVAILABLE", (payload) => Array.isArray(payload.hotelIds) && payload.hotelIds.length && typeof payload.reason === "string"
  ? { kind: "HOTEL_UNAVAILABLE", reason: payload.reason }
  : null);

export const flightDelayCompiler = createCompiler("FLIGHT_DELAY", (payload) => {
  const delayMinutes = finiteNumber(payload.delayMinutes);
  if (delayMinutes === null || delayMinutes <= 0 || typeof payload.scheduledArrivalAt !== "string" || typeof payload.estimatedArrivalAt !== "string") return null;
  if (!Number.isFinite(Date.parse(payload.scheduledArrivalAt)) || !Number.isFinite(Date.parse(payload.estimatedArrivalAt))) return null;
  return { kind: "FLIGHT_DELAY", delayMinutes, scheduledArrivalAt: payload.scheduledArrivalAt, estimatedArrivalAt: payload.estimatedArrivalAt };
});

export const eventCompilerRegistry: EventCompiler[] = [weatherRiskCompiler, roadClosureCompiler, hotelUnavailableCompiler, flightDelayCompiler];
