import type { CandidatePlan, Catalog, ImpactAssessment, RawRealitySignal, RealityEvent, Trip, TripChangeCommand } from "./domain.ts";
import { eventCompilerRegistry, type EventCompiler } from "./reality-compilers.ts";
import { impactRuleRegistry, type ImpactRule } from "./reality-impact-rules.ts";
import { candidatePlanPolicyRegistry, type CandidatePlanDraft, type CandidatePlanPolicy } from "./reality-policies.ts";
import { mockCatalog } from "./data/mock-data.ts";
import { calculatePrice, catalogSnapshotFingerprint, getTripMetrics } from "./trip-calculations.ts";

const eventTransitions: Record<RealityEvent["status"], RealityEvent["status"][]> = {
  DETECTED: ["ACTIVE", "DISMISSED"],
  ACTIVE: ["RESOLVED", "DISMISSED"],
  RESOLVED: [],
  DISMISSED: [],
};

export function transitionRealityEvent(event: RealityEvent, status: RealityEvent["status"], updatedAt = new Date().toISOString()): RealityEvent {
  if (!eventTransitions[event.status].includes(status) || !Number.isFinite(Date.parse(updatedAt)) || Date.parse(updatedAt) < Date.parse(event.updatedAt)) return event;
  return { ...event, status, version: event.version + 1, supersedesVersion: event.version, updatedAt };
}

export const realityEventFingerprint = (event: RealityEvent) => JSON.stringify({
  id: event.id,
  version: event.version,
  status: event.status,
  severity: event.severity,
  updatedAt: event.updatedAt,
  effectiveFrom: event.effectiveFrom,
  effectiveUntil: event.effectiveUntil,
  scope: event.scope,
  details: event.details,
});

export function compileRealitySignal(signal: RawRealitySignal, catalog: Catalog = mockCatalog, compilers: EventCompiler[] = eventCompilerRegistry): RealityEvent | null {
  const matches = compilers.filter((compiler) => compiler.supports(signal));
  if (matches.length !== 1) return null;
  return matches[0].compile(signal, catalog);
}

const emptyAssessmentFinding = (event: RealityEvent) => ({
  affectedObjects: [],
  impactTypes: [] as ImpactAssessment["impactTypes"],
  summary: `No registered impact rule can assess ${event.type}.`,
  reasoning: ["The canonical event is retained, but no deterministic Trip impact was inferred."],
});

export function assessRealityEvent(trip: Trip, event: RealityEvent, catalog: Catalog = mockCatalog, rules: ImpactRule[] = impactRuleRegistry): ImpactAssessment {
  const matchingRules = rules.filter((rule) => rule.supports(event));
  const finding = matchingRules.length === 1 ? matchingRules[0].assess(event, trip, catalog) : emptyAssessmentFinding(event);
  const decision = trip.decisions.findLast((item) => item.eventId === event.id && item.eventVersion === event.version && item.eventFingerprint === realityEventFingerprint(event));
  const mitigationStatus = decision ? decision.selectedPlan.responseEffect : "UNMITIGATED";
  const eventFingerprint = realityEventFingerprint(event);
  return {
    id: `impact-${event.id}-v${event.version}-${trip.id}-r${trip.revision}`,
    eventId: event.id,
    eventVersion: event.version,
    tripId: trip.id,
    baseTripRevision: trip.revision,
    eventFingerprint,
    catalogFingerprint: catalogSnapshotFingerprint(catalog),
    affectedObjects: finding.affectedObjects,
    impactTypes: finding.impactTypes,
    riskLevel: finding.affectedObjects.length ? event.severity : "LOW",
    summary: finding.summary,
    reasoning: finding.reasoning,
    requiresAction: event.status === "ACTIVE" && finding.affectedObjects.length > 0 && !decision,
    mitigationStatus,
    provenance: "demo-mock",
  };
}

const applyDraftCommands = (trip: Trip, commands: TripChangeCommand[]) => {
  const dayCommands = commands.filter((command): command is Extract<TripChangeCommand, { type: "REPLACE_DAY" }> => command.type === "REPLACE_DAY");
  const bookingCommands = commands.filter((command): command is Extract<TripChangeCommand, { type: "REPLACE_BOOKING" }> => command.type === "REPLACE_BOOKING");
  const days = trip.days.map((day) => dayCommands.find((command) => command.dayId === day.id)?.replacement ?? day);
  const bookings = trip.bookings.map((booking) => bookingCommands.find((command) => command.bookingId === booking.id)?.replacement ?? booking);
  return { days, bookings };
};

const affectedDaysForDraft = (trip: Trip, assessment: ImpactAssessment, commands: TripChangeCommand[]) => {
  const commandDays = commands.flatMap((command) => command.type === "REPLACE_DAY" ? [command.dayId] : []);
  const assessmentDays = assessment.affectedObjects.flatMap((item) => item.objectType === "TripDay" ? [item.objectId] : []);
  const ids = new Set(commandDays.length ? commandDays : assessmentDays);
  return trip.days.filter((day) => ids.has(day.id)).map((day) => day.dayNumber);
};

const projectCandidate = (trip: Trip, event: RealityEvent, assessment: ImpactAssessment, policy: CandidatePlanPolicy, draft: CandidatePlanDraft, catalog: Catalog): CandidatePlan => {
  const projected = applyDraftCommands(trip, draft.changeCommands);
  const nextTrip = { ...trip, days: projected.days, bookings: projected.bookings };
  const priceDeltaCny = calculatePrice(nextTrip, catalog).total - trip.price.total;
  const drivingTimeDeltaMinutes = getTripMetrics(nextTrip, catalog).drivingMinutes - getTripMetrics(trip, catalog).drivingMinutes;
  return {
    id: `plan-${event.id}-v${event.version}-${draft.idSuffix}`,
    eventId: event.id,
    eventVersion: event.version,
    tripId: trip.id,
    baseTripRevision: trip.revision,
    impactAssessmentId: assessment.id,
    eventFingerprint: assessment.eventFingerprint,
    catalogFingerprint: assessment.catalogFingerprint,
    policyId: policy.id,
    kind: draft.kind,
    responseEffect: draft.responseEffect,
    title: draft.title,
    description: draft.description,
    changeCommands: structuredClone(draft.changeCommands),
    riskLevel: draft.riskLevel,
    estimatedCostDeltaCny: priceDeltaCny,
    drivingTimeDeltaMinutes,
    tripDurationDeltaDays: projected.days.length - trip.days.length,
    expectedOutcome: {
      priceDeltaCny,
      drivingTimeDeltaMinutes,
      ...(draft.operationalDelayMinutes === undefined ? {} : { operationalDelayMinutes: draft.operationalDelayMinutes }),
      ...(draft.hotelId ? { hotelId: draft.hotelId } : {}),
      ...(draft.segmentCompletionExpected === undefined ? {} : { segmentCompletionExpected: draft.segmentCompletionExpected }),
    },
    affectedDays: affectedDaysForDraft(trip, assessment, draft.changeCommands),
    experienceOutcome: draft.experienceOutcome,
    tradeoffs: draft.tradeoffs,
    provenance: "demo-mock",
  };
};

export function generateCandidatePlans(trip: Trip, event: RealityEvent, assessment: ImpactAssessment, catalog: Catalog = mockCatalog, policies: CandidatePlanPolicy[] = candidatePlanPolicyRegistry): CandidatePlan[] {
  const canonicalEvent = trip.realityEvents.find((item) => item.id === event.id);
  if (
    !assessment.requiresAction
    || assessment.eventId !== event.id
    || assessment.eventVersion !== event.version
    || assessment.tripId !== trip.id
    || assessment.baseTripRevision !== trip.revision
    || assessment.eventFingerprint !== realityEventFingerprint(event)
    || assessment.catalogFingerprint !== catalogSnapshotFingerprint(catalog)
    || !canonicalEvent
    || canonicalEvent.version !== event.version
    || realityEventFingerprint(canonicalEvent) !== assessment.eventFingerprint
  ) return [];
  const matches = policies.filter((policy) => policy.supports(event, assessment, trip, catalog));
  if (matches.length !== 1) return [];
  return matches[0].propose(event, assessment, trip, catalog).map((draft) => projectCandidate(trip, event, assessment, matches[0], draft, catalog));
}

export function upsertRealityEvent(trip: Trip, event: RealityEvent): Trip {
  if (!Number.isFinite(Date.parse(event.updatedAt)) || !Number.isFinite(Date.parse(event.observedAt))) return trip;
  const current = trip.realityEvents.find((item) => item.id === event.id);
  if (!current) return { ...trip, realityEvents: [...trip.realityEvents.map((item) => structuredClone(item)), structuredClone(event)] };
  if (realityEventFingerprint(current) === realityEventFingerprint(event)) return trip;
  if (!eventTransitions[current.status].length || (event.status !== current.status && !eventTransitions[current.status].includes(event.status))) return trip;
  if (!Number.isFinite(Date.parse(event.updatedAt)) || !Number.isFinite(Date.parse(current.updatedAt)) || event.version !== current.version + 1 || event.supersedesVersion !== current.version || Date.parse(event.updatedAt) < Date.parse(current.updatedAt)) return trip;
  return { ...trip, realityEvents: trip.realityEvents.map((item) => item.id === event.id ? structuredClone(event) : structuredClone(item)) };
}
