import type { Catalog, OperationsTimelineEntry, OutcomeMetrics, OutcomeObservation, RawRealitySignal, RealityRuntimeState, Trip } from "./domain.ts";
import { mockCatalog } from "./data/mock-data.ts";
import { eventCompilerRegistry, type EventCompiler } from "./reality-compilers.ts";
import { impactRuleRegistry, type ImpactRule } from "./reality-impact-rules.ts";
import { candidatePlanPolicyRegistry, type CandidatePlanPolicy } from "./reality-policies.ts";
import { assessRealityEvent, compileRealitySignal, generateCandidatePlans, realityEventFingerprint, upsertRealityEvent } from "./reality-engine.ts";
import { applyCanonicalCandidatePlan } from "./trip-engine.ts";

export interface RealityRuntimeRegistry {
  compilers: EventCompiler[];
  impactRules: ImpactRule[];
  candidatePolicies: CandidatePlanPolicy[];
}

export const defaultRealityRegistry: RealityRuntimeRegistry = {
  compilers: eventCompilerRegistry,
  impactRules: impactRuleRegistry,
  candidatePolicies: candidatePlanPolicyRegistry,
};

export interface RealityDecisionSelection {
  eventId: string;
  eventVersion: number;
  planId: string;
  baseTripRevision: number;
  impactAssessmentId: string;
  catalogFingerprint: string;
}

export function applyRealityDecision(trip: Trip, selection: RealityDecisionSelection, decisionTime = new Date().toISOString(), catalog: Catalog = mockCatalog, registry: RealityRuntimeRegistry = defaultRealityRegistry): Trip {
  if (selection.baseTripRevision !== trip.revision) return trip;
  const event = trip.realityEvents.find((item) => item.id === selection.eventId && item.version === selection.eventVersion && item.status === "ACTIVE");
  if (!event) return trip;
  const assessment = assessRealityEvent(trip, event, catalog, registry.impactRules);
  if (assessment.id !== selection.impactAssessmentId || assessment.baseTripRevision !== selection.baseTripRevision || assessment.catalogFingerprint !== selection.catalogFingerprint) return trip;
  const plans = generateCandidatePlans(trip, event, assessment, catalog, registry.candidatePolicies);
  const selected = plans.find((plan) => plan.id === selection.planId);
  if (!selected) return trip;
  return applyCanonicalCandidatePlan(trip, event, selected, plans, decisionTime, catalog);
}

const timelineEntry = (entry: OperationsTimelineEntry) => entry;
const appendTimeline = (state: RealityRuntimeState, entries: OperationsTimelineEntry[]) => {
  const known = new Set(state.timeline.map((entry) => entry.id));
  return [...state.timeline, ...entries.filter((entry) => !known.has(entry.id))];
};

export function createRealityRuntimeState(trip: Trip, signals: RawRealitySignal[] = [], catalog: Catalog = mockCatalog, registry: RealityRuntimeRegistry = defaultRealityRegistry): RealityRuntimeState {
  const relevantSignals = signals.filter((signal) => trip.realityEvents.some((event) => event.sourceSignalId === signal.id));
  const timeline = trip.realityEvents.flatMap((event) => {
    const assessment = assessRealityEvent(trip, event, catalog, registry.impactRules);
    const plans = generateCandidatePlans(trip, event, assessment, catalog, registry.candidatePolicies);
    return [
      timelineEntry({ id: `timeline-${event.sourceSignalId}-received`, tripId: trip.id, kind: "SIGNAL_RECEIVED", occurredAt: event.observedAt, eventId: event.id, eventVersion: event.version, title: "Reality signal received", detail: `${event.source} · ${event.sourceType}`, sourceType: event.sourceType, provenance: "demo-mock" }),
      timelineEntry({ id: `timeline-${event.id}-v${event.version}-compiled`, tripId: trip.id, kind: "EVENT_COMPILED", occurredAt: event.updatedAt, eventId: event.id, eventVersion: event.version, title: event.title, detail: `Canonical ${event.type} · version ${event.version}`, sourceType: event.sourceType, provenance: "demo-mock" }),
      timelineEntry({ id: `timeline-${assessment.id}-assessed`, tripId: trip.id, kind: "IMPACT_ASSESSED", occurredAt: event.updatedAt, eventId: event.id, eventVersion: event.version, impactAssessmentId: assessment.id, title: "Trip impact assessed", detail: `${assessment.affectedObjects.length} structured objects may be affected`, sourceType: event.sourceType, provenance: "demo-mock" }),
      ...(plans.length ? [timelineEntry({ id: `timeline-${assessment.id}-plans`, tripId: trip.id, kind: "PLANS_PREPARED", occurredAt: event.updatedAt, eventId: event.id, eventVersion: event.version, impactAssessmentId: assessment.id, title: `${plans.length} alternatives prepared`, detail: `Policy ${plans[0].policyId}`, sourceType: event.sourceType, provenance: "demo-mock" })] : []),
    ];
  });
  return { signals: structuredClone(relevantSignals), outcomes: [], timeline };
}

export function ingestRealitySignal(trip: Trip, state: RealityRuntimeState, signal: RawRealitySignal, catalog: Catalog = mockCatalog, registry: RealityRuntimeRegistry = defaultRealityRegistry) {
  if (state.signals.some((item) => item.id === signal.id)) return { trip, state, event: null };
  const nextSignals = [...state.signals.map((item) => structuredClone(item)), structuredClone(signal)];
  const received = timelineEntry({ id: `timeline-${signal.id}-received`, tripId: trip.id, kind: "SIGNAL_RECEIVED", occurredAt: signal.observedAt, title: "Reality signal received", detail: `${signal.source} · ${signal.sourceType}`, sourceType: signal.sourceType, provenance: "demo-mock" });
  const event = compileRealitySignal(signal, catalog, registry.compilers);
  if (!event) return { trip, state: { ...state, signals: nextSignals, timeline: appendTimeline(state, [received]) }, event: null };
  const current = trip.realityEvents.find((item) => item.id === event.id);
  const nextTrip = upsertRealityEvent(trip, event);
  const rejectedUpdate = current && realityEventFingerprint(current) !== realityEventFingerprint(event) && nextTrip === trip;
  if (rejectedUpdate) return { trip, state: { ...state, signals: nextSignals, timeline: appendTimeline(state, [received]) }, event: null };
  const canonicalEvent = nextTrip.realityEvents.find((item) => item.id === event.id)!;
  const assessment = assessRealityEvent(nextTrip, canonicalEvent, catalog, registry.impactRules);
  const plans = generateCandidatePlans(nextTrip, canonicalEvent, assessment, catalog, registry.candidatePolicies);
  const compiledKind = canonicalEvent.status === "RESOLVED" ? "EVENT_RESOLVED" : current && canonicalEvent.version > current.version ? "EVENT_UPDATED" : "EVENT_COMPILED";
  const receivedForEvent = { ...received, eventId: canonicalEvent.id, eventVersion: canonicalEvent.version };
  const entries: OperationsTimelineEntry[] = [
    receivedForEvent,
    timelineEntry({ id: `timeline-${canonicalEvent.id}-v${canonicalEvent.version}-compiled`, tripId: trip.id, kind: compiledKind, occurredAt: canonicalEvent.updatedAt, eventId: canonicalEvent.id, eventVersion: canonicalEvent.version, title: canonicalEvent.title, detail: `${canonicalEvent.type} · version ${canonicalEvent.version} · ${canonicalEvent.status.toLowerCase()}`, sourceType: canonicalEvent.sourceType, provenance: "demo-mock" }),
    timelineEntry({ id: `timeline-${assessment.id}-assessed`, tripId: trip.id, kind: "IMPACT_ASSESSED", occurredAt: canonicalEvent.updatedAt, eventId: canonicalEvent.id, eventVersion: canonicalEvent.version, impactAssessmentId: assessment.id, title: "Trip impact assessed", detail: `${assessment.affectedObjects.length} structured objects may be affected`, sourceType: canonicalEvent.sourceType, provenance: "demo-mock" }),
    ...(plans.length ? [timelineEntry({ id: `timeline-${assessment.id}-plans`, tripId: trip.id, kind: "PLANS_PREPARED", occurredAt: canonicalEvent.updatedAt, eventId: canonicalEvent.id, eventVersion: canonicalEvent.version, impactAssessmentId: assessment.id, title: `${plans.length} alternatives prepared`, detail: `Policy ${plans[0].policyId}`, sourceType: canonicalEvent.sourceType, provenance: "demo-mock" })] : []),
  ];
  return { trip: nextTrip, state: { ...state, signals: nextSignals, timeline: appendTimeline(state, entries) }, event: canonicalEvent };
}

export function recordDecisionTimeline(state: RealityRuntimeState, before: Trip, after: Trip, eventId: string): RealityRuntimeState {
  if (after === before) return state;
  const decision = after.decisions.findLast((item) => item.eventId === eventId && item.tripRevisionAfter === after.revision);
  const change = decision ? after.changes.find((item) => item.id === decision.tripChangeId) : undefined;
  const event = after.realityEvents.find((item) => item.id === eventId);
  if (!decision || !change || !event) return state;
  return {
    ...state,
    timeline: appendTimeline(state, [
      timelineEntry({ id: `timeline-${decision.id}-decision`, tripId: after.id, kind: "DECISION_MADE", occurredAt: decision.decisionTime, eventId, eventVersion: decision.eventVersion, impactAssessmentId: decision.impactAssessmentId, decisionId: decision.id, title: decision.selectedPlan.title, detail: `${decision.selectedPlan.kind} response selected`, sourceType: event.sourceType, provenance: "demo-mock" }),
      timelineEntry({ id: `timeline-${change.id}-revision`, tripId: after.id, kind: "TRIP_REVISED", occurredAt: change.appliedAt, eventId, eventVersion: decision.eventVersion, decisionId: decision.id, tripChangeId: change.id, title: `Trip revision ${after.revision} created`, detail: `${change.diffs.length} structured diffs · ${change.priceDeltaCny >= 0 ? "+" : ""}¥${change.priceDeltaCny}`, sourceType: event.sourceType, provenance: "demo-mock" }),
    ]),
  };
}

const outcomeMetricKeys = ["priceDeltaCny", "drivingTimeDeltaMinutes", "operationalDelayMinutes", "hotelId", "segmentCompleted"] as const;
const metricKeys = (metrics: OutcomeMetrics) => outcomeMetricKeys.filter((key) => Object.hasOwn(metrics, key));
const validOutcomeMetrics = (metrics: OutcomeMetrics) => {
  if (Object.keys(metrics).some((key) => !outcomeMetricKeys.includes(key as typeof outcomeMetricKeys[number]))) return false;
  return Object.entries(metrics).every(([key, value]) => key === "hotelId" ? typeof value === "string" && Boolean(value) : key === "segmentCompleted" ? typeof value === "boolean" : typeof value === "number" && Number.isFinite(value));
};

const expectedMetricsForDecision = (decision: Trip["decisions"][number]): OutcomeMetrics => {
  const expectedPlan = decision.selectedPlan.expectedOutcome;
  return {
    priceDeltaCny: expectedPlan.priceDeltaCny,
    drivingTimeDeltaMinutes: expectedPlan.drivingTimeDeltaMinutes,
    ...(expectedPlan.operationalDelayMinutes === undefined ? {} : { operationalDelayMinutes: expectedPlan.operationalDelayMinutes }),
    ...(expectedPlan.hotelId ? { hotelId: expectedPlan.hotelId } : {}),
    ...(expectedPlan.segmentCompletionExpected === undefined ? {} : { segmentCompleted: expectedPlan.segmentCompletionExpected }),
  };
};

const metricsEqual = (left: OutcomeMetrics, right: OutcomeMetrics) => {
  const leftKeys = metricKeys(left);
  const rightKeys = metricKeys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => rightKeys.includes(key) && left[key] === right[key]);
};

const expectedOutcomeStatus = (expected: OutcomeMetrics, observed: OutcomeMetrics): OutcomeObservation["status"] | null => {
  const expectedKeys = metricKeys(expected);
  const observedKeys = metricKeys(observed);
  if (!observedKeys.length || observedKeys.some((key) => !expectedKeys.includes(key))) return null;
  if (observedKeys.length < expectedKeys.length) return "PARTIAL";
  return metricsEqual(expected, observed) ? "MATCHED" : "DEVIATED";
};

export function recordOutcomeObservation(state: RealityRuntimeState, trip: Trip, observation: OutcomeObservation) {
  const decision = trip.decisions.find((item) => item.id === observation.decisionId && item.eventId === observation.eventId && item.eventVersion === observation.eventVersion && item.tripRevisionAfter === observation.tripRevision);
  const event = trip.realityEvents.find((item) => item.id === observation.eventId && item.version >= observation.eventVersion);
  const derivedStatus = expectedOutcomeStatus(observation.expected, observation.observed);
  if (!decision || !event || observation.tripId !== trip.id || observation.impactAssessmentId !== decision.impactAssessmentId || observation.selectedPlanId !== decision.selectedPlanId || state.outcomes.some((item) => item.id === observation.id) || !validOutcomeMetrics(observation.expected) || !validOutcomeMetrics(observation.observed) || !metricsEqual(observation.expected, expectedMetricsForDecision(decision)) || observation.status !== derivedStatus || !Number.isFinite(Date.parse(observation.observedAt)) || Date.parse(observation.observedAt) < Date.parse(decision.decisionTime) || typeof observation.source !== "string" || !observation.source.trim() || typeof observation.notes !== "string" || !observation.notes.trim() || !["demo-mock", "manual-demo", "static-demo-feed"].includes(observation.sourceType) || observation.provenance !== "demo-mock") return { trip, state };
  return {
    trip,
    state: {
      ...state,
      outcomes: [...state.outcomes.map((item) => structuredClone(item)), structuredClone(observation)],
      timeline: appendTimeline(state, [timelineEntry({ id: `timeline-${observation.id}`, tripId: trip.id, kind: "OUTCOME_OBSERVED", occurredAt: observation.observedAt, eventId: observation.eventId, eventVersion: observation.eventVersion, impactAssessmentId: observation.impactAssessmentId, decisionId: observation.decisionId, outcomeObservationId: observation.id, title: "Outcome observed", detail: `${observation.status.toLowerCase()} · ${observation.notes}`, sourceType: observation.sourceType, provenance: "demo-mock" })]),
    },
  };
}

export function createDemoOutcomeObservation(trip: Trip, eventId: string, observedAt = new Date().toISOString()): OutcomeObservation | null {
  const decision = trip.decisions.findLast((item) => item.eventId === eventId);
  if (!decision) return null;
  const expected = expectedMetricsForDecision(decision);
  return {
    id: `outcome-${decision.id}`,
    tripId: trip.id,
    eventId: decision.eventId,
    eventVersion: decision.eventVersion,
    impactAssessmentId: decision.impactAssessmentId,
    decisionId: decision.id,
    selectedPlanId: decision.selectedPlanId,
    tripRevision: decision.tripRevisionAfter,
    observedAt,
    expected,
    observed: structuredClone(expected),
    status: "MATCHED",
    notes: "Demo observation matched the selected response.",
    source: "Travorien demo outcome recorder",
    sourceType: "demo-mock",
    provenance: "demo-mock",
  };
}
