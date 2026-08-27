import test from "node:test";
import assert from "node:assert/strict";
import { heavyRainGorgeEvent, mockCatalog } from "../app/data/mock-data.ts";
import { manualRealitySignalAdapter, mockRealitySignalAdapter, staticDemoFeedAdapter } from "../app/reality-adapters.ts";
import { assessRealityEvent, compileRealitySignal, generateCandidatePlans, realityEventFingerprint, transitionRealityEvent, upsertRealityEvent } from "../app/reality-engine.ts";
import { applyRealityDecision, createDemoOutcomeObservation, createRealityRuntimeState, ingestRealitySignal, recordDecisionTimeline, recordOutcomeObservation } from "../app/reality-runtime.ts";
import { applyCanonicalCandidatePlan, applyTripChangeCommand, createGoldenTrip, validateItineraryContinuity } from "../app/trip-engine.ts";

const signalFor = (eventType) => mockRealitySignalAdapter.adapt({ eventType })[0];
const ingestType = (trip, state, eventType) => ingestRealitySignal(trip, state, signalFor(eventType));

const eventSetup = (eventType) => {
  const initial = createGoldenTrip();
  const state = createRealityRuntimeState(initial);
  if (eventType === "WEATHER_RISK") {
    const event = initial.realityEvents[0];
    const impact = assessRealityEvent(initial, event);
    return { trip: initial, state, event, impact, plans: generateCandidatePlans(initial, event, impact) };
  }
  const ingested = ingestType(initial, state, eventType);
  const event = ingested.event;
  const impact = assessRealityEvent(ingested.trip, event);
  return { trip: ingested.trip, state: ingested.state, event, impact, plans: generateCandidatePlans(ingested.trip, event, impact) };
};

const selectionFor = (trip, event, impact, plan) => ({ eventId: event.id, eventVersion: event.version, planId: plan.id, baseTripRevision: trip.revision, impactAssessmentId: impact.id, catalogFingerprint: impact.catalogFingerprint });

test("mock, manual and static adapters all produce RawRealitySignal inputs", () => {
  const mock = signalFor("ROAD_CLOSURE");
  const manual = manualRealitySignalAdapter.adapt({ text: "The hotel in Shaxi is unavailable tonight.", observedAt: "2026-10-13T08:00:00Z" })[0];
  const staticSignals = staticDemoFeedAdapter.adapt(undefined);
  assert.equal(mock.sourceType, "demo-mock");
  assert.equal(manual.sourceType, "manual-demo");
  assert.equal(manual.rawText, "The hotel in Shaxi is unavailable tonight.");
  assert.equal(staticSignals.length, 4);
  assert.ok(staticSignals.every((signal) => signal.sourceType === "static-demo-feed" && signal.provenance === "demo-mock"));
});

test("the four structured signal types compile into versioned canonical events", () => {
  const signals = staticDemoFeedAdapter.adapt(undefined);
  const events = signals.map((signal) => compileRealitySignal(signal));
  assert.deepEqual(events.map((event) => event.type), ["WEATHER_RISK", "ROAD_CLOSURE", "HOTEL_UNAVAILABLE", "FLIGHT_DELAY"]);
  assert.ok(events.every((event, index) => event.version === 1 && event.sourceSignalId === signals[index].id && event.provenance === "demo-mock"));
});

test("manual text remains a raw signal until AI supplies a structured payload", () => {
  const signal = manualRealitySignalAdapter.adapt({ text: "My flight is late.", observedAt: "2026-10-09T23:00:00Z" })[0];
  assert.equal(compileRealitySignal(signal), null);
});

test("malformed, unknown-reference and ambiguous compiler inputs create no event", () => {
  const signal = structuredClone(signalFor("ROAD_CLOSURE"));
  signal.payload.routeSegmentIds = ["route-does-not-exist"];
  assert.equal(compileRealitySignal(signal), null);
  const valid = signalFor("ROAD_CLOSURE");
  const duplicateCompiler = { id: "duplicate", eventType: "ROAD_CLOSURE", supports: () => true, compile: () => structuredClone(heavyRainGorgeEvent) };
  assert.equal(compileRealitySignal(valid, mockCatalog, [duplicateCompiler, { ...duplicateCompiler, id: "duplicate-two" }]), null);
  assert.equal(compileRealitySignal({ ...structuredClone(valid), observedAt: "not-a-timestamp" }), null);
});

test("weather impact preserves the Sprint 2 gorge object coverage", () => {
  const { impact } = eventSetup("WEATHER_RISK");
  const ids = new Set(impact.affectedObjects.map((item) => item.objectId));
  for (const id of ["route-lijiang-gorge", "route-gorge-shangrila", "exp-gorge-hike", "day-7", "hotel-gorge-tea-horse"]) assert.ok(ids.has(id));
  assert.equal(impact.requiresAction, true);
});

test("an exact road closure affects its route and day but not any hotel", () => {
  const { impact } = eventSetup("ROAD_CLOSURE");
  assert.ok(impact.affectedObjects.some((item) => item.objectId === "route-dali-shaxi"));
  assert.ok(impact.affectedObjects.some((item) => item.objectId === "day-4"));
  assert.equal(impact.affectedObjects.some((item) => item.objectType === "Hotel"), false);
});

test("hotel unavailability affects the exact hotel, booking and day but no route", () => {
  const { impact } = eventSetup("HOTEL_UNAVAILABLE");
  const ids = new Set(impact.affectedObjects.map((item) => item.objectId));
  for (const id of ["hotel-gorge-tea-horse", "booking-hotel-day-7", "day-7"]) assert.ok(ids.has(id));
  assert.equal(impact.affectedObjects.some((item) => item.objectType === "RouteSegment"), false);
});

test("flight delay affects Day 1, arrival bookings, experience and check-in", () => {
  const { impact } = eventSetup("FLIGHT_DELAY");
  const ids = new Set(impact.affectedObjects.map((item) => item.objectId));
  for (const id of ["day-1", "booking-arrival-flight", "booking-vehicle-pickup", "exp-kunming-market", "hotel-kunming-green-lake"]) assert.ok(ids.has(id));
  assert.equal(impact.affectedObjects.some((item) => item.objectType === "RouteSegment"), false);
});

test("China local-day matching catches an event after UTC midnight on the prior date", () => {
  const { trip, event } = eventSetup("FLIGHT_DELAY");
  const boundary = { ...structuredClone(event), effectiveFrom: "2026-10-09T16:30:00Z", effectiveUntil: "2026-10-09T17:00:00Z" };
  assert.ok(assessRealityEvent(trip, boundary).affectedObjects.some((item) => item.objectId === "day-1"));
});

test("a delayed flight for another destination or booking does not affect this Trip", () => {
  const { trip, event } = eventSetup("FLIGHT_DELAY");
  const unrelated = { ...structuredClone(event), id: "event-unrelated-flight", location: { label: "Dali arrival", destinationId: "dali" }, scope: { ...event.scope, destinationIds: ["dali"], bookingIds: ["booking-another-traveler-flight"] } };
  const impact = assessRealityEvent(trip, unrelated);
  assert.deepEqual(impact.affectedObjects, []);
  assert.equal(impact.requiresAction, false);
});

test("an unrelated hotel reference does not affect the Trip", () => {
  const { trip, event } = eventSetup("HOTEL_UNAVAILABLE");
  const unrelated = { ...structuredClone(event), id: "event-unrelated-hotel", scope: { ...event.scope, hotelIds: ["hotel-gorge-ridge"], bookingIds: [] } };
  const impact = assessRealityEvent(trip, unrelated);
  assert.deepEqual(impact.affectedObjects, []);
  assert.equal(impact.requiresAction, false);
});

test("registered policies produce unified executable candidate shapes", () => {
  for (const type of ["WEATHER_RISK", "ROAD_CLOSURE", "HOTEL_UNAVAILABLE", "FLIGHT_DELAY"]) {
    const { trip, event, impact, plans } = eventSetup(type);
    assert.ok(plans.length >= 2);
    assert.ok(plans.every((plan) => plan.tripId === trip.id && plan.eventVersion === event.version && plan.baseTripRevision === trip.revision && plan.impactAssessmentId === impact.id && plan.policyId));
  }
});

test("weather candidates keep three choices and separate operational delay", () => {
  const { plans } = eventSetup("WEATHER_RISK");
  assert.deepEqual(plans.map((plan) => plan.kind), ["KEEP", "SKIP", "REROUTE"]);
  assert.equal(plans[0].drivingTimeDeltaMinutes, 0);
  assert.equal(plans[0].expectedOutcome.operationalDelayMinutes, 60);
});

test("road closure policy discovers a same-endpoint catalog alternative", () => {
  const { plans } = eventSetup("ROAD_CLOSURE");
  const reroute = plans.find((plan) => plan.kind === "REROUTE");
  const command = reroute.changeCommands.find((item) => item.type === "REPLACE_DAY");
  assert.deepEqual(command.replacement.routeSegmentIds, ["route-dali-shaxi-east"]);
  assert.equal(reroute.drivingTimeDeltaMinutes, 45);
});

test("two hotel alternatives update TripDay and Booking using catalog prices", () => {
  const { plans } = eventSetup("HOTEL_UNAVAILABLE");
  assert.equal(plans.length, 2);
  assert.ok(plans.every((plan) => plan.changeCommands.some((item) => item.type === "REPLACE_DAY") && plan.changeCommands.some((item) => item.type === "REPLACE_BOOKING")));
  assert.deepEqual(plans.map((plan) => plan.estimatedCostDeltaCny), [140, 360]);
});

test("flight plans reschedule bookings and one removes the Day 1 experience", () => {
  const { plans } = eventSetup("FLIGHT_DELAY");
  assert.equal(plans.length, 2);
  assert.ok(plans.every((plan) => plan.changeCommands.filter((item) => item.type === "REPLACE_BOOKING").length === 2));
  const calm = plans.find((plan) => plan.kind === "CHANGE_DAY");
  assert.deepEqual(calm.changeCommands.find((item) => item.type === "REPLACE_DAY").replacement.experienceIds, []);
  assert.equal(calm.estimatedCostDeltaCny, -520);
});

test("Sprint 2 Golden reroute applies through plan ID and updates its hotel booking", () => {
  const { trip, event, impact, plans } = eventSetup("WEATHER_RISK");
  const selected = plans.find((plan) => plan.kind === "REROUTE");
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, selected), "2026-08-25T05:00:00.000Z");
  assert.equal(next.revision, 2);
  assert.equal(next.days.find((day) => day.id === "day-7").destinationId, "baishuitai");
  assert.equal(next.bookings.find((booking) => booking.id === "booking-hotel-day-7").itemId, "hotel-baishuitai-cloudline");
  assert.equal(next.changes.at(-1).eventId, event.id);
  assert.equal(next.decisions.at(-1).tripChangeId, next.changes.at(-1).id);
});

test("hotel replacement atomically updates booking, stay and Trip price", () => {
  const { trip, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, plans[0]));
  assert.equal(next.revision, 2);
  assert.equal(next.days.find((day) => day.id === "day-7").hotelId, "hotel-gorge-ridge");
  assert.equal(next.bookings.find((booking) => booking.id === "booking-hotel-day-7").itemId, "hotel-gorge-ridge");
  assert.equal(next.price.total - trip.price.total, 140);
});

test("flight delay creates executable booking and Day 1 changes", () => {
  const { trip, event, impact, plans } = eventSetup("FLIGHT_DELAY");
  const selected = plans.find((plan) => plan.kind === "CHANGE_DAY");
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, selected));
  assert.equal(next.revision, 2);
  assert.deepEqual(next.days[0].experienceIds, []);
  assert.match(next.bookings.find((booking) => booking.kind === "vehicle").notes, /delayed inbound flight/i);
});

test("a stale event preview cannot apply after another Trip revision", () => {
  const { trip, event, impact, plans } = eventSetup("WEATHER_RISK");
  const stale = selectionFor(trip, event, impact, plans[2]);
  const revised = applyTripChangeCommand(trip, { type: "set-max-daily-driving-minutes", maxMinutes: 180 });
  assert.equal(applyRealityDecision(revised, stale), revised);
  const currentImpact = assessRealityEvent(revised, revised.realityEvents[0]);
  const currentPlans = generateCandidatePlans(revised, revised.realityEvents[0], currentImpact);
  assert.equal(applyRealityDecision(revised, selectionFor(revised, revised.realityEvents[0], currentImpact, currentPlans[2])).revision, 3);
});

test("invalid plan IDs and forged display projections cannot cross orchestration", () => {
  const { trip, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
  assert.equal(applyRealityDecision(trip, { ...selectionFor(trip, event, impact, plans[0]), planId: "plan-forged" }), trip);
  const forged = structuredClone(plans[0]);
  forged.estimatedCostDeltaCny = -99999;
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, forged));
  assert.equal(next.price.total - trip.price.total, plans[0].estimatedCostDeltaCny);
  assert.equal(next.decisions.at(-1).selectedPlan.estimatedCostDeltaCny, plans[0].estimatedCostDeltaCny);
});

test("a changed catalog snapshot invalidates the preview instead of silently repricing it", () => {
  const { trip, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
  const changedCatalog = structuredClone(mockCatalog);
  changedCatalog.hotels.find((hotel) => hotel.id === "hotel-gorge-ridge").nightlyPriceCny += 10_000;
  const staleSelection = selectionFor(trip, event, impact, plans[0]);
  assert.equal(applyRealityDecision(trip, staleSelection, "2026-10-15T10:00:00Z", changedCatalog), trip);
  assert.equal(applyCanonicalCandidatePlan(trip, event, plans[0], plans, "2026-10-15T10:00:00Z", changedCatalog), trip);
  const currentImpact = assessRealityEvent(trip, event, changedCatalog);
  const currentPlans = generateCandidatePlans(trip, event, currentImpact, changedCatalog);
  const repricedPlan = currentPlans.find((plan) => plan.id.includes("hotel-gorge-ridge"));
  const next = applyRealityDecision(trip, selectionFor(trip, event, currentImpact, repricedPlan), "2026-10-15T10:00:00Z", changedCatalog);
  assert.equal(next.price.total - trip.price.total, 10_140);
  assert.equal(next.decisions.at(-1).catalogFingerprint, currentImpact.catalogFingerprint);
});

test("an invalid final booking command rejects the complete canonical batch", () => {
  const { trip, event, plans } = eventSetup("HOTEL_UNAVAILABLE");
  const invalid = structuredClone(plans[0]);
  invalid.changeCommands.find((item) => item.type === "REPLACE_BOOKING").replacement.amountCny = 1;
  assert.equal(applyCanonicalCandidatePlan(trip, event, invalid, [invalid]), trip);
  assert.equal(trip.days.find((day) => day.id === "day-7").hotelId, "hotel-gorge-tea-horse");
});

test("full-itinerary validation still rejects disconnected valid route IDs", () => {
  const trip = createGoldenTrip();
  const days = structuredClone(trip.days);
  Object.assign(days.find((day) => day.id === "day-7"), { destinationId: "chuxiong", routeSegmentIds: ["route-kunming-chuxiong"], hotelId: "hotel-chuxiong-pavilion", experienceIds: ["exp-chuxiong-yi"] });
  assert.equal(validateItineraryContinuity(trip, days), false);
  assert.equal(validateItineraryContinuity(trip, trip.days), true);
});

test("duplicate signal replay is idempotent and creates no duplicate event", () => {
  const trip = createGoldenTrip();
  const state = createRealityRuntimeState(trip);
  const signal = signalFor("ROAD_CLOSURE");
  const first = ingestRealitySignal(trip, state, signal);
  const second = ingestRealitySignal(first.trip, first.state, signal);
  assert.equal(second.trip, first.trip);
  assert.equal(second.state, first.state);
  assert.equal(second.trip.realityEvents.filter((event) => event.id === first.event.id).length, 1);
});

test("linear event v2 replaces v1 and stale or non-linear updates are rejected", () => {
  const { trip, state, event } = eventSetup("ROAD_CLOSURE");
  const v2Signal = structuredClone(signalFor("ROAD_CLOSURE"));
  v2Signal.id = "signal-dali-shaxi-road-closed-v2";
  v2Signal.observedAt = "2026-10-13T10:00:00Z";
  v2Signal.payload.version = 2;
  v2Signal.payload.supersedesVersion = 1;
  const updated = ingestRealitySignal(trip, state, v2Signal);
  assert.equal(updated.event.version, 2);
  assert.equal(updated.trip.realityEvents.filter((item) => item.id === event.id).length, 1);
  assert.ok(updated.state.timeline.some((entry) => entry.eventId === event.id && entry.eventVersion === 2 && entry.kind === "EVENT_UPDATED"));
  assert.equal(upsertRealityEvent(updated.trip, { ...structuredClone(updated.event), version: 1, supersedesVersion: undefined }), updated.trip);
  assert.equal(upsertRealityEvent(updated.trip, { ...structuredClone(updated.event), version: 4, supersedesVersion: 2 }), updated.trip);
  assert.equal(upsertRealityEvent(updated.trip, { ...structuredClone(updated.event), version: 3, supersedesVersion: 2, updatedAt: "not-a-timestamp", observedAt: "not-a-timestamp" }), updated.trip);

  const resolvedSignal = structuredClone(v2Signal);
  resolvedSignal.id = "signal-dali-shaxi-road-closed-v3";
  resolvedSignal.observedAt = "2026-10-13T15:00:00Z";
  resolvedSignal.payload.version = 3;
  resolvedSignal.payload.supersedesVersion = 2;
  resolvedSignal.payload.status = "RESOLVED";
  resolvedSignal.payload.closureStatus = "REOPENED";
  const resolved = ingestRealitySignal(updated.trip, updated.state, resolvedSignal);
  assert.equal(resolved.event.version, 3);
  assert.equal(resolved.event.status, "RESOLVED");
  assert.ok(resolved.state.timeline.some((entry) => entry.eventId === event.id && entry.eventVersion === 3 && entry.kind === "EVENT_RESOLVED"));

  const invalidReopenSignal = structuredClone(resolvedSignal);
  invalidReopenSignal.id = "signal-dali-shaxi-road-closed-v4";
  invalidReopenSignal.observedAt = "2026-10-13T16:00:00Z";
  invalidReopenSignal.payload.version = 4;
  invalidReopenSignal.payload.supersedesVersion = 3;
  invalidReopenSignal.payload.status = "ACTIVE";
  invalidReopenSignal.payload.closureStatus = "CLOSED";
  const invalidReopen = ingestRealitySignal(resolved.trip, resolved.state, invalidReopenSignal);
  assert.equal(invalidReopen.trip, resolved.trip);
  assert.equal(invalidReopen.event, null);
});

test("a v1 decision does not suppress reassessment of active event v2", () => {
  const { trip, state, event, impact, plans } = eventSetup("ROAD_CLOSURE");
  const waited = applyRealityDecision(trip, selectionFor(trip, event, impact, plans.find((plan) => plan.kind === "WAIT")));
  const stateAfterDecision = recordDecisionTimeline(state, trip, waited, event.id);
  const v2Signal = structuredClone(signalFor("ROAD_CLOSURE"));
  v2Signal.id = "signal-road-update-v2";
  v2Signal.observedAt = "2026-10-13T11:00:00Z";
  v2Signal.payload.version = 2;
  v2Signal.payload.supersedesVersion = 1;
  const updated = ingestRealitySignal(waited, stateAfterDecision, v2Signal);
  const v2Impact = assessRealityEvent(updated.trip, updated.event);
  assert.equal(v2Impact.requiresAction, true);
  assert.ok(generateCandidatePlans(updated.trip, updated.event, v2Impact).length >= 2);
});

test("two active events keep assessments, decisions and changes isolated", () => {
  let trip = createGoldenTrip();
  let state = createRealityRuntimeState(trip);
  let result = ingestType(trip, state, "FLIGHT_DELAY"); trip = result.trip; state = result.state;
  result = ingestType(trip, state, "HOTEL_UNAVAILABLE"); trip = result.trip;
  const flight = trip.realityEvents.find((event) => event.type === "FLIGHT_DELAY");
  const hotel = trip.realityEvents.find((event) => event.type === "HOTEL_UNAVAILABLE");
  const flightImpact = assessRealityEvent(trip, flight);
  const hotelImpactAtR1 = assessRealityEvent(trip, hotel);
  const hotelPlansAtR1 = generateCandidatePlans(trip, hotel, hotelImpactAtR1);
  const afterFlight = applyRealityDecision(trip, selectionFor(trip, flight, flightImpact, generateCandidatePlans(trip, flight, flightImpact)[1]));
  assert.equal(applyRealityDecision(afterFlight, selectionFor(trip, hotel, hotelImpactAtR1, hotelPlansAtR1[0])), afterFlight);
  const currentHotel = afterFlight.realityEvents.find((event) => event.id === hotel.id);
  const hotelImpact = assessRealityEvent(afterFlight, currentHotel);
  const afterHotel = applyRealityDecision(afterFlight, selectionFor(afterFlight, currentHotel, hotelImpact, generateCandidatePlans(afterFlight, currentHotel, hotelImpact)[0]));
  assert.deepEqual(afterHotel.decisions.slice(-2).map((item) => item.eventId), [flight.id, hotel.id]);
  assert.deepEqual(afterHotel.changes.slice(-2).map((item) => item.eventId), [flight.id, hotel.id]);
  assert.notEqual(afterHotel.decisions.at(-1).impactAssessmentId, afterHotel.decisions.at(-2).impactAssessmentId);
});

test("OutcomeObservation completes the chain without changing Trip", () => {
  const { trip, state, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, plans[0]));
  const withDecisionTimeline = recordDecisionTimeline(state, trip, next, event.id);
  const observation = createDemoOutcomeObservation(next, event.id, "2026-10-17T12:00:00Z");
  const recorded = recordOutcomeObservation(withDecisionTimeline, next, observation);
  assert.equal(recorded.trip, next);
  assert.equal(recorded.trip.revision, next.revision);
  assert.equal(recorded.state.outcomes.length, 1);
  assert.ok(recorded.state.timeline.some((entry) => entry.kind === "OUTCOME_OBSERVED" && entry.decisionId === next.decisions.at(-1).id));
});

test("OutcomeObservation cannot forge the selected plan's expected metrics", () => {
  const { trip, state, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, plans[0]));
  const observation = createDemoOutcomeObservation(next, event.id, "2026-10-17T12:00:00Z");
  const forged = { ...observation, expected: { ...observation.expected, priceDeltaCny: observation.expected.priceDeltaCny + 1 } };
  const recorded = recordOutcomeObservation(state, next, forged);
  assert.equal(recorded.trip, next);
  assert.equal(recorded.state, state);
});

test("OutcomeObservation rejects empty, impossible, inconsistent, or untrusted observations", () => {
  const { trip, state, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
  const next = applyRealityDecision(trip, selectionFor(trip, event, impact, plans[0]), "2026-10-16T12:00:00Z");
  const valid = createDemoOutcomeObservation(next, event.id, "2026-10-17T12:00:00Z");
  const invalid = [
    { ...valid, observed: {} },
    { ...valid, observedAt: "2026-10-15T12:00:00Z" },
    { ...valid, observed: { ...valid.observed, priceDeltaCny: valid.observed.priceDeltaCny + 1 }, status: "MATCHED" },
    { ...valid, source: "", sourceType: "live-provider", provenance: "live" },
  ];
  for (const observation of invalid) assert.equal(recordOutcomeObservation(state, next, observation).state, state);
  const deviated = { ...valid, id: `${valid.id}-deviated`, observed: { ...valid.observed, priceDeltaCny: valid.observed.priceDeltaCny + 1 }, status: "DEVIATED" };
  assert.equal(recordOutcomeObservation(state, next, deviated).state.outcomes.length, 1);
});

test("timeline records signal, compile, impact, plans, decision and revision", () => {
  const setup = eventSetup("FLIGHT_DELAY");
  const next = applyRealityDecision(setup.trip, selectionFor(setup.trip, setup.event, setup.impact, setup.plans[0]));
  const state = recordDecisionTimeline(setup.state, setup.trip, next, setup.event.id);
  const kinds = new Set(state.timeline.filter((entry) => entry.eventId === setup.event.id).map((entry) => entry.kind));
  for (const kind of ["SIGNAL_RECEIVED", "EVENT_COMPILED", "IMPACT_ASSESSED", "PLANS_PREPARED", "DECISION_MADE", "TRIP_REVISED"]) assert.ok(kinds.has(kind));
});

test("structured demo event loop remains complete with no Gemini key", () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const { trip, event, impact, plans } = eventSetup("HOTEL_UNAVAILABLE");
    assert.equal(applyRealityDecision(trip, selectionFor(trip, event, impact, plans[0])).revision, 2);
  } finally { if (previous !== undefined) process.env.GEMINI_API_KEY = previous; }
});

test("a synthetic registered event uses stable runtime and Trip Engine orchestration", () => {
  const trip = createGoldenTrip();
  const signal = { id: "signal-synthetic", source: "Architecture test", sourceType: "demo-mock", observedAt: "2026-10-10T01:00:00Z", payload: { eventType: "EXT:EXPERIENCE_CLOSED" }, provenance: "demo-mock" };
  const compiler = { id: "compiler-synthetic", eventType: "EXT:EXPERIENCE_CLOSED", supports: (item) => item.payload?.eventType === "EXT:EXPERIENCE_CLOSED", compile: (item) => ({ id: "event-synthetic", version: 1, updatedAt: item.observedAt, sourceSignalId: item.id, type: "EXT:EXPERIENCE_CLOSED", title: "Market walk unavailable", description: "Architecture-only registered demo event.", source: item.source, sourceType: item.sourceType, confidence: 1, severity: "LOW", status: "ACTIVE", location: { label: "Kunming", destinationId: "kunming" }, scope: { destinationIds: ["kunming"], routeSegmentIds: [], hotelIds: [], bookingIds: [], externalReferences: [] }, details: { kind: "EXT:EXPERIENCE_CLOSED" }, effectiveFrom: "2026-10-10T00:00:00+08:00", effectiveUntil: "2026-10-11T00:00:00+08:00", observedAt: item.observedAt, evidence: ["Architecture fixture"], tags: ["test"], provenance: "demo-mock" }) };
  const event = compileRealitySignal(signal, mockCatalog, [compiler]);
  const eventTrip = upsertRealityEvent(trip, event);
  const rule = { id: "rule-synthetic", eventType: "EXT:EXPERIENCE_CLOSED", supports: (item) => item.type === "EXT:EXPERIENCE_CLOSED", assess: () => ({ affectedObjects: [{ objectType: "Experience", objectId: "exp-kunming-market", label: "Private Yunnan food market walk", reason: "Synthetic rule." }, { objectType: "TripDay", objectId: "day-1", label: "Day 1", reason: "Synthetic rule." }], impactTypes: ["EXPERIENCE"], summary: "One experience is unavailable.", reasoning: ["Synthetic rule matched."] }) };
  const policy = { id: "policy-synthetic", eventType: "EXT:EXPERIENCE_CLOSED", supports: () => true, propose: (item, _assessment, currentTrip) => [{ idSuffix: "drop", kind: "CHANGE_DAY", responseEffect: "MITIGATED", title: "Drop unavailable experience", description: "Architecture-only executable response.", changeCommands: [{ type: "REPLACE_DAY", eventId: item.id, dayId: "day-1", replacement: { ...currentTrip.days[0], experienceIds: [] } }], riskLevel: "LOW", operationalDelayMinutes: 0, experienceOutcome: "Remove market walk", tradeoffs: ["No Runtime Core edits"] }] };
  const registry = { compilers: [compiler], impactRules: [rule], candidatePolicies: [policy] };
  const impact = assessRealityEvent(eventTrip, event, mockCatalog, registry.impactRules);
  const plans = generateCandidatePlans(eventTrip, event, impact, mockCatalog, registry.candidatePolicies);
  const next = applyRealityDecision(eventTrip, selectionFor(eventTrip, event, impact, plans[0]), "2026-10-10T02:00:00Z", mockCatalog, registry);
  assert.equal(next.revision, 2);
  assert.deepEqual(next.days[0].experienceIds, []);
});

test("RealityEvent lifecycle transitions create a linked new version", () => {
  const event = structuredClone(heavyRainGorgeEvent);
  const resolved = transitionRealityEvent(event, "RESOLVED", "2026-10-17T13:00:00Z");
  assert.equal(resolved.version, event.version + 1);
  assert.equal(resolved.supersedesVersion, event.version);
  assert.equal(resolved.status, "RESOLVED");
  assert.notEqual(realityEventFingerprint(resolved), realityEventFingerprint(event));
  assert.equal(transitionRealityEvent(resolved, "ACTIVE"), resolved);
});
