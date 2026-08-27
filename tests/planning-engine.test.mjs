import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyTripIntent, mergeTripIntent } from "../app/intent-engine.ts";
import { mockCatalog } from "../app/data/mock-data.ts";
import { destinationMedia, hotelMedia, vehicleMedia } from "../app/data/media-catalog.ts";
import {
  applyPlanningAction,
  createPlanningSession,
  generateHotelOffers,
  generateVehicleOffers,
  isCurrentPlanningResponse,
  materializePlanningTrip,
  planRoute,
  reserveVehicle,
  retainPlanningSessionOnAiFailure,
  validateHotelSelection,
} from "../app/planning-engine.ts";
import { mockRealitySignalAdapter } from "../app/reality-adapters.ts";
import { assessRealityEvent, generateCandidatePlans } from "../app/reality-engine.ts";
import { applyRealityDecision, createRealityRuntimeState, ingestRealitySignal } from "../app/reality-runtime.ts";

const intent = (fields) => mergeTripIntent(createEmptyTripIntent(), {
  originCountry: "Germany", destinationRegion: "Yunnan", travelers: 2, travelerType: "couple",
  startDate: "2026-10-10", durationDays: 9, drivingPreference: "self-drive",
  travelPace: "relaxed", budget: "mid-to-premium", luggageCount: 2,
  vehiclePreference: "suv", accommodationPreference: "local-character",
  drivingLicenceStatus: "valid-foreign-licence", interests: ["Mountains", "Food", "Small towns"],
  ...fields,
});

const routeSession = (tripIntent, proposal = []) => {
  const plan = planRoute(tripIntent, proposal);
  assert.ok(plan);
  let session = createPlanningSession(tripIntent, `planning-${tripIntent.arrivalCity}-${tripIntent.durationDays}`);
  session = applyPlanningAction(session, { type: "PROPOSE_ROUTE", baseRevision: session.revision, routePlan: plan });
  return session;
};

const vehicleReservationSession = (tripIntent, proposal = []) => {
  let session = routeSession(tripIntent, proposal);
  const offers = generateVehicleOffers(session.intent, session.routePlan, undefined, "2026-08-25T08:00:00.000Z");
  session = applyPlanningAction(session, { type: "CONFIRM_ROUTE", baseRevision: session.revision, offers });
  const selection = { offerId: offers[0].id, snapshotId: offers[0].snapshotId };
  session = applyPlanningAction(session, { type: "SELECT_VEHICLE", baseRevision: session.revision, selection });
  return { session, selection, offers };
};

test("PlanningSession is revisioned and rejects a stale conversation result", () => {
  const start = createPlanningSession(createEmptyTripIntent());
  const withUser = applyPlanningAction(start, { type: "ADD_USER_MESSAGE", message: { id: "u1", role: "user", text: "Nine days in Yunnan" } });
  assert.equal(withUser.revision, start.revision + 1);
  const stale = applyPlanningAction(withUser, { type: "APPLY_CONVERSATION_RESULT", baseRevision: start.revision, result: { assistantMessage: "stale", extractedFields: { durationDays: 9 }, proposedDestinationIds: [], routeExplanation: null, confidence: 1 }, assistantMessage: { id: "a1", role: "assistant", text: "stale" } });
  assert.equal(stale, withUser);
  assert.equal(retainPlanningSessionOnAiFailure(withUser), withUser);
  const later = applyPlanningAction(withUser, { type: "ADD_USER_MESSAGE", message: { id: "u2", role: "user", text: "One more change" } });
  assert.equal(isCurrentPlanningResponse(withUser, withUser), true);
  assert.equal(isCurrentPlanningResponse(later, withUser), false);
  assert.equal(isCurrentPlanningResponse(createPlanningSession(createEmptyTripIntent()), withUser), false);
});

test("AI failure preserves a multi-step session including its confirmed booking", () => {
  const tripIntent = intent({ arrivalCity: "Dali", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const reserved = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const booking = reserveVehicle(reserved.session, reserved.selection, "preserve-booking", "2026-08-25T08:05:00.000Z");
  assert.ok(booking);
  const confirmed = applyPlanningAction(reserved.session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: reserved.session.revision, booking });
  assert.equal(retainPlanningSessionOnAiFailure(confirmed), confirmed);
  assert.deepEqual(confirmed.vehicleBooking, booking);
  assert.ok(confirmed.routePlan);
});

test("Dali five-day solo and Kunming family plans are distinct and non-Golden", () => {
  const solo = planRoute(intent({ originCountry: "Singapore", arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" }), ["dali", "shaxi", "lijiang"]);
  const family = planRoute(intent({ arrivalCity: "Kunming", durationDays: 7, travelers: 4, travelerType: "family", luggageCount: 4, vehiclePreference: "mpv", maxDailyDrivingMinutes: 180 }));
  assert.ok(solo && family);
  assert.deepEqual(solo.destinationIds, ["dali", "shaxi", "lijiang"]);
  assert.equal(solo.days.length, 5);
  assert.equal(family.days.length, 7);
  assert.ok(family.destinationIds.includes("chuxiong"));
  assert.notDeepEqual(family.destinationIds, solo.destinationIds);
  assert.notDeepEqual(family.destinationIds, ["kunming", "dali", "shaxi", "lijiang", "tiger-gorge", "shangri-la"]);
});

test("route planner rejects unknown, repeated, reverse-only, and contradictory date proposals", () => {
  const base = intent({ arrivalCity: "Dali", durationDays: 5 });
  assert.equal(planRoute(base, ["dali", "unknown"]), null);
  assert.equal(planRoute(base, ["dali", "shaxi", "shaxi"]), null);
  assert.equal(planRoute(base, ["dali", "kunming"]), null);
  assert.equal(planRoute(intent({ arrivalCity: "Dali", startDate: "2026-02-31", durationDays: 5 }), ["dali", "shaxi"]), null);
  assert.equal(planRoute(intent({ arrivalCity: "Dali", durationDays: 5, maxDailyDrivingMinutes: 60 }), ["dali", "shaxi"]), null);
  assert.equal(planRoute(intent({ arrivalCity: "Dali", durationDays: 5, endDate: "2026-10-20" }), ["dali", "shaxi"]), null);
});

test("vehicle ranking exposes OTA categories and filters impossible luggage capacity", () => {
  const familyIntent = intent({ arrivalCity: "Kunming", durationDays: 7, travelers: 4, travelerType: "family", luggageCount: 4, vehiclePreference: "mpv", maxDailyDrivingMinutes: 180 });
  const familyPlan = planRoute(familyIntent);
  assert.ok(familyPlan);
  const familyOffers = generateVehicleOffers(familyIntent, familyPlan, undefined, "2026-08-25T08:00:00.000Z");
  assert.equal(familyOffers[0].category, "mpv");
  assert.ok(familyOffers.every((offer) => offer.vehicleId !== "vehicle-vw-golf"));
  assert.ok(familyOffers.every((offer) => offer.model && offer.primaryImage && offer.gallery.length && offer.imageProvenance.sourceUrl && offer.doors >= 4 && offer.fuelType && offer.pickupLocation && offer.dropoffLocation && offer.pickupDateTime && offer.dropoffDateTime && offer.cancellationPolicy && offer.mileagePolicy && offer.depositCny > 0 && offer.basicCoverage && offer.source.includes("demo-mock")));
  const soloIntent = intent({ originCountry: "Singapore", arrivalCity: "Dali", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact", budget: "budget", interests: ["Easy parking"] });
  const soloPlan = planRoute(soloIntent);
  assert.ok(soloPlan);
  const soloOffers = generateVehicleOffers(soloIntent, soloPlan, undefined, "2026-08-25T08:00:00.000Z");
  assert.equal(soloOffers[0].category, "compact");
  assert.ok(new Set(soloOffers.map((offer) => offer.category)).size >= 4);
  const unsupportedIntent = intent({ arrivalCity: "Dali", durationDays: 5, travelers: 8, luggageCount: 8 });
  const unsupportedPlan = planRoute(unsupportedIntent, ["dali", "shaxi", "lijiang"]);
  assert.ok(unsupportedPlan);
  assert.deepEqual(generateVehicleOffers(unsupportedIntent, unsupportedPlan), []);
});

test("new conversational preferences regenerate vehicle snapshot and ranking", () => {
  const tripIntent = intent({ originCountry: "Singapore", arrivalCity: "Dali", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "suv" });
  let session = routeSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const firstOffers = generateVehicleOffers(session.intent, session.routePlan, undefined, "2026-08-25T08:00:00.000Z");
  session = applyPlanningAction(session, { type: "CONFIRM_ROUTE", baseRevision: session.revision, offers: firstOffers });
  const withPreference = applyPlanningAction(session, { type: "APPLY_CONVERSATION_RESULT", baseRevision: session.revision, result: { assistantMessage: "I’ll prioritize compact cars.", extractedFields: { vehiclePreference: "compact", budget: "budget", interests: ["Easy parking"] }, proposedDestinationIds: [], routeExplanation: null, confidence: 1 }, assistantMessage: { id: "compact-answer", role: "assistant", text: "I’ll prioritize compact cars." } });
  const refreshedOffers = generateVehicleOffers(withPreference.intent, withPreference.routePlan, undefined, "2026-08-25T08:01:00.000Z");
  const refreshed = applyPlanningAction(withPreference, { type: "REFRESH_VEHICLE_OFFERS", baseRevision: withPreference.revision, offers: refreshedOffers });
  assert.notEqual(refreshed.vehicleOffers[0].snapshotId, firstOffers[0].snapshotId);
  assert.equal(refreshed.vehicleOffers[0].category, "compact");
  assert.equal(refreshed.vehicleSelection, null);
});

test("vehicle-stage conversation keeps route structure immutable and clears stale offers when capacity becomes unsupported", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  let session = routeSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const offers = generateVehicleOffers(session.intent, session.routePlan);
  session = applyPlanningAction(session, { type: "CONFIRM_ROUTE", baseRevision: session.revision, offers });
  const patched = applyPlanningAction(session, { type: "APPLY_CONVERSATION_RESULT", baseRevision: session.revision, result: { assistantMessage: "I recorded the vehicle-relevant update only.", extractedFields: { startDate: "2026-11-01", durationDays: 8, arrivalCity: "Kunming", luggageCount: 8 }, proposedDestinationIds: ["kunming", "dali"], routeExplanation: "ignored after route confirmation", confidence: 1 }, assistantMessage: { id: "structural-after-route", role: "assistant", text: "I recorded the vehicle-relevant update only." } });
  assert.equal(patched.intent.startDate, "2026-10-12");
  assert.equal(patched.intent.durationDays, 5);
  assert.equal(patched.intent.arrivalCity, "Dali");
  assert.equal(patched.intent.luggageCount, 8);
  const refreshed = applyPlanningAction(patched, { type: "REFRESH_VEHICLE_OFFERS", baseRevision: patched.revision, offers: generateVehicleOffers(patched.intent, patched.routePlan) });
  assert.equal(refreshed.vehicleOffers.length, 0);
  assert.equal(refreshed.stage, "VEHICLE_SELECTION");
});

test("vehicle reservation rejects forged and expired offers and is idempotent", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const { session, selection } = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const forged = { ...session, vehicleOffers: session.vehicleOffers.map((offer) => offer.id === selection.offerId ? { ...offer, totalPriceCny: 1, dailyPriceCny: 1 } : offer) };
  assert.equal(reserveVehicle(forged, selection, "reserve-one", "2026-08-25T08:05:00.000Z"), null);
  const revived = { ...session, vehicleOffers: session.vehicleOffers.map((offer) => offer.id === selection.offerId ? { ...offer, validUntil: "2026-08-25T12:00:00.000Z" } : offer) };
  assert.equal(reserveVehicle(revived, selection, "reserve-one", "2026-08-25T09:00:00.000Z"), null);
  assert.equal(reserveVehicle(session, selection, "reserve-one", "2026-08-25T09:00:00.000Z"), null);
  const booking = reserveVehicle(session, selection, "reserve-one", "2026-08-25T08:05:00.000Z");
  assert.ok(booking);
  assert.equal(booking.reservedAt, "2026-08-25T08:05:00.000Z");
  assert.ok(booking.reservationCode.startsWith("TVR-") && booking.pickupLocation && booking.dropoffLocation && booking.pickupDateTime && booking.dropoffDateTime && booking.currency === "CNY" && booking.source.includes("demo-mock"));
  const confirmed = applyPlanningAction(session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: session.revision, booking });
  const duplicate = reserveVehicle(confirmed, selection, "reserve-one", "2026-08-25T08:06:00.000Z");
  assert.equal(duplicate?.id, booking.id);
  assert.equal(reserveVehicle(confirmed, selection, "different-key", "2026-08-25T08:06:00.000Z"), null);
  const malformed = { ...session, vehicleOffers: session.vehicleOffers.map((offer) => offer.id === selection.offerId ? { ...offer, validUntil: "not-a-date" } : offer) };
  assert.equal(reserveVehicle(malformed, selection, "malformed-time", "2026-08-25T08:06:00Z"), null);
  assert.deepEqual(generateVehicleOffers(session.intent, session.routePlan, undefined, "not-a-date"), []);

  let equivalentSession = routeSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const equivalentOffers = generateVehicleOffers(equivalentSession.intent, equivalentSession.routePlan, undefined, "2026-08-25T08:00:00Z");
  equivalentSession = applyPlanningAction(equivalentSession, { type: "CONFIRM_ROUTE", baseRevision: equivalentSession.revision, offers: equivalentOffers });
  const equivalentSelection = { offerId: equivalentOffers[0].id, snapshotId: equivalentOffers[0].snapshotId };
  equivalentSession = applyPlanningAction(equivalentSession, { type: "SELECT_VEHICLE", baseRevision: equivalentSession.revision, selection: equivalentSelection });
  assert.ok(reserveVehicle(equivalentSession, equivalentSelection, "equivalent-time", "2026-08-25T08:05:00Z"));
});

test("expired vehicle review can return to a current offer set without losing route or intent", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const reserved = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const routePlan = reserved.session.routePlan;
  const refreshedOffers = generateVehicleOffers(reserved.session.intent, routePlan, undefined, "2026-08-25T09:00:00Z");
  const recovered = applyPlanningAction(reserved.session, { type: "RETURN_TO_VEHICLE_SELECTION", baseRevision: reserved.session.revision, offers: refreshedOffers });
  assert.equal(recovered.stage, "VEHICLE_SELECTION");
  assert.equal(recovered.routePlan, routePlan);
  assert.deepEqual(recovered.intent, reserved.session.intent);
  assert.equal(recovered.vehicleSelection, null);
  assert.notEqual(recovered.vehicleOffers[0].snapshotId, reserved.offers[0].snapshotId);
});

test("hotel offers require one coherent current selection per route night", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const reserved = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const booking = reserveVehicle(reserved.session, reserved.selection, "hotel-path", "2026-08-25T08:05:00.000Z");
  assert.ok(booking);
  let session = applyPlanningAction(reserved.session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: reserved.session.revision, booking });
  const offers = generateHotelOffers(session.intent, session.routePlan, undefined, "2026-08-25T08:06:00.000Z");
  session = applyPlanningAction(session, { type: "CHOOSE_HOTELS", baseRevision: session.revision, decision: "yes", offers });
  assert.equal(session.stage, "HOTEL_SELECTION");
  assert.ok(offers.every((offer) => offer.roomType && offer.mealPlan && offer.cancellationPolicy && offer.amenities.length && offer.source.includes("demo-mock")));
  const selectedOfferIds = session.routePlan.days.slice(0, -1).map((day) => offers.find((offer) => offer.dayId === day.id && offer.rank === 1).id);
  const selection = { decision: "selected", selectedOfferIds, snapshotId: offers[0].snapshotId };
  assert.equal(validateHotelSelection(session, selection, "2026-08-25T08:10:00.000Z"), true);
  assert.equal(validateHotelSelection(session, { ...selection, selectedOfferIds: selectedOfferIds.slice(1) }, "2026-08-25T08:10:00.000Z"), false);
  assert.equal(validateHotelSelection(session, { ...selection, selectedOfferIds: [selectedOfferIds[0], ...selectedOfferIds.slice(0, -1)] }, "2026-08-25T08:10:00.000Z"), false);
  const wrongNight = session.hotelOffers.find((offer) => offer.dayId !== session.hotelOffers[0].dayId);
  assert.ok(wrongNight);
  assert.equal(validateHotelSelection(session, { ...selection, selectedOfferIds: [wrongNight.id, ...selectedOfferIds.slice(1)] }, "2026-08-25T08:10:00.000Z"), false);
  const revived = { ...session, hotelOffers: session.hotelOffers.map((offer) => offer.id === selectedOfferIds[0] ? { ...offer, validUntil: "2026-08-25T12:00:00.000Z" } : offer) };
  assert.equal(validateHotelSelection(revived, selection, "2026-08-25T08:10:00.000Z"), false);
  const malformed = { ...session, hotelOffers: session.hotelOffers.map((offer) => offer.id === selectedOfferIds[0] ? { ...offer, validUntil: "not-a-date" } : offer) };
  assert.equal(validateHotelSelection(malformed, selection, "2026-08-25T08:10:00Z"), false);
  assert.equal(validateHotelSelection(session, selection, "not-a-date"), false);
  assert.deepEqual(generateHotelOffers(session.intent, session.routePlan, undefined, "not-a-date"), []);

  const equivalentOffers = generateHotelOffers(session.intent, session.routePlan, undefined, "2026-08-25T08:06:00Z");
  const equivalentSession = { ...session, hotelOffers: equivalentOffers };
  const equivalentIds = session.routePlan.days.slice(0, -1).map((day) => equivalentOffers.find((offer) => offer.dayId === day.id && offer.rank === 1).id);
  assert.equal(validateHotelSelection(equivalentSession, { decision: "selected", selectedOfferIds: equivalentIds, snapshotId: equivalentOffers[0].snapshotId }, "2026-08-25T08:10:00Z"), true);
});

test("family hotel offers allocate and price enough rooms with honest style-reference media", () => {
  const familyIntent = intent({ arrivalCity: "Kunming", durationDays: 7, travelers: 4, travelerType: "family", luggageCount: 4, accommodationPreference: "family-friendly" });
  const familyPlan = planRoute(familyIntent);
  assert.ok(familyPlan);
  const offers = generateHotelOffers(familyIntent, familyPlan, undefined, "2026-08-25T08:06:00.000Z");
  assert.ok(offers.length > 0);
  assert.ok(offers.every((offer) => offer.roomCount === 2 && offer.nightlyPriceCny === offer.roomRateCny * 2));
  assert.ok(offers.every((offer) => offer.primaryImage === offer.imageProvenance.primaryImage && offer.imageProvenance.imageKind === "style-reference-not-property"));
  for (const day of familyPlan.days.slice(0, -1)) {
    const nightImages = offers.filter((offer) => offer.dayId === day.id).map((offer) => offer.primaryImage);
    assert.equal(new Set(nightImages).size, nightImages.length);
  }
});

test("confirmation-only planning stages reject conversational mutations", () => {
  const tripIntent = intent({ arrivalCity: "Dali", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const reserved = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const attempted = applyPlanningAction(reserved.session, { type: "ADD_USER_MESSAGE", message: { id: "late-message", role: "user", text: "Change the car" } });
  assert.equal(attempted, reserved.session);
  const attemptedPatch = applyPlanningAction(reserved.session, { type: "APPLY_CONVERSATION_RESULT", baseRevision: reserved.session.revision, result: { assistantMessage: "ignored", extractedFields: { startDate: "2026-11-01", durationDays: 8 }, proposedDestinationIds: [], routeExplanation: null, confidence: 1 }, assistantMessage: { id: "late-answer", role: "assistant", text: "ignored" } });
  assert.equal(attemptedPatch, reserved.session);
  assert.equal(materializePlanningTrip(reserved.session), null);
});

test("hotel skip materializes a ready structured Trip with no hotel bookings", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const reserved = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const booking = reserveVehicle(reserved.session, reserved.selection, "skip-hotels", "2026-08-25T08:05:00.000Z");
  assert.ok(booking);
  let session = applyPlanningAction(reserved.session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: reserved.session.revision, booking });
  session = applyPlanningAction(session, { type: "CHOOSE_HOTELS", baseRevision: session.revision, decision: "skip" });
  const trip = materializePlanningTrip(session);
  assert.ok(trip);
  assert.equal(trip.status, "ready");
  assert.equal(trip.days.length, 5);
  assert.equal(trip.bookings.filter((item) => item.kind === "hotel").length, 0);
  assert.equal(trip.bookings.filter((item) => item.kind === "vehicle" && item.status === "confirmed").length, 1);
  assert.equal(trip.price.vehicle, booking.amountCny);
  assert.equal(materializePlanningTrip({ ...session, intent: { ...session.intent, startDate: "2026-11-01", durationDays: 8 } }), null);
  assert.equal(materializePlanningTrip({ ...session, routePlan: { ...session.routePlan, days: session.routePlan.days.map((day, index) => index === 2 ? { ...day, date: "2026-12-31" } : day) } }), null);
});

test("selected stays materialize exactly one coherent booking per route night", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  let session = routeSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const vehicleOffers = generateVehicleOffers(session.intent, session.routePlan);
  session = applyPlanningAction(session, { type: "CONFIRM_ROUTE", baseRevision: session.revision, offers: vehicleOffers });
  const selection = { offerId: vehicleOffers[0].id, snapshotId: vehicleOffers[0].snapshotId };
  session = applyPlanningAction(session, { type: "SELECT_VEHICLE", baseRevision: session.revision, selection });
  const booking = reserveVehicle(session, selection, "selected-hotels");
  assert.ok(booking);
  session = applyPlanningAction(session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: session.revision, booking });
  const hotelOffers = generateHotelOffers(session.intent, session.routePlan);
  session = applyPlanningAction(session, { type: "CHOOSE_HOTELS", baseRevision: session.revision, decision: "yes", offers: hotelOffers });
  const selectedOfferIds = session.routePlan.days.slice(0, -1).map((day) => hotelOffers.find((offer) => offer.dayId === day.id && offer.rank === 1).id);
  session = applyPlanningAction(session, { type: "COMPLETE_HOTELS", baseRevision: session.revision, selection: { decision: "selected", selectedOfferIds, snapshotId: hotelOffers[0].snapshotId } });
  const trip = materializePlanningTrip(session);
  assert.ok(trip);
  assert.equal(trip.bookings.filter((item) => item.kind === "hotel").length, trip.days.length - 1);
  assert.ok(trip.days.slice(0, -1).every((day) => trip.bookings.some((item) => item.kind === "hotel" && item.dayId === day.id && item.itemId === day.hotelId)));
});

test("every routed destination and exact vehicle has unique attributed media", () => {
  const routedDestinationIds = new Set(mockCatalog.routeSegments.flatMap((route) => [route.fromDestinationId, route.toDestinationId]));
  assert.ok([...routedDestinationIds].every((id) => destinationMedia.some((item) => item.destinationId === id)));
  assert.ok(mockCatalog.vehicles.every((item) => vehicleMedia.some((media) => media.vehicleId === item.id)));
  const allMedia = [...destinationMedia, ...vehicleMedia];
  assert.equal(new Set(allMedia.map((item) => item.imageUrl)).size, allMedia.length);
  assert.ok(allMedia.every((item) => item.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/") && item.author && item.licenseNote && item.alt && item.provenance === "demo-mock"));
  assert.ok(destinationMedia.every((item) => item.heroImage && item.cardImage && item.gallery.length && item.sourceType === "public-source"));
  assert.ok(vehicleMedia.every((item) => item.primaryImage && item.gallery.length && item.sourceType === "public-source"));
  assert.ok(hotelMedia.every((item) => item.primaryImage && item.sourceType === "public-source" && item.imageKind === "style-reference-not-property" && item.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/") && item.author && item.licenseNote));
});

test("a non-Golden conversation Trip completes one generic road-closure Reality revision", () => {
  const tripIntent = intent({ arrivalCity: "Dali", startDate: "2026-10-12", durationDays: 5, travelers: 1, travelerType: "solo", luggageCount: 1, vehiclePreference: "compact" });
  const reserved = vehicleReservationSession(tripIntent, ["dali", "shaxi", "lijiang"]);
  const booking = reserveVehicle(reserved.session, reserved.selection, "runtime-trip", "2026-08-25T08:05:00.000Z");
  let session = applyPlanningAction(reserved.session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: reserved.session.revision, booking });
  session = applyPlanningAction(session, { type: "CHOOSE_HOTELS", baseRevision: session.revision, decision: "skip" });
  const trip = materializePlanningTrip(session);
  const signal = mockRealitySignalAdapter.adapt({ eventType: "ROAD_CLOSURE" })[0];
  const ingested = ingestRealitySignal(trip, createRealityRuntimeState(trip), signal);
  assert.ok(ingested.event);
  const impact = assessRealityEvent(ingested.trip, ingested.event);
  const plans = generateCandidatePlans(ingested.trip, ingested.event, impact);
  assert.ok(plans.length > 0);
  const plan = plans.find((item) => item.kind === "REROUTE") ?? plans[0];
  const next = applyRealityDecision(ingested.trip, { eventId: ingested.event.id, eventVersion: ingested.event.version, planId: plan.id, baseTripRevision: ingested.trip.revision, impactAssessmentId: impact.id, catalogFingerprint: impact.catalogFingerprint });
  assert.equal(next.revision, trip.revision + 1);
  assert.equal(next.changes.length, 1);
  assert.equal(next.changes[0].eventId, ingested.event.id);
});
