import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyTripIntent, isMinimumViableIntent, mergeTripIntent, nextQuestionForIntent, retainTripIntentOnAiFailure, validateExtractionResult } from "../app/intent-engine.ts";
import { applyTripChangeCommand, createGoldenTrip } from "../app/trip-engine.ts";

test("multi-turn extraction merges new facts without overwriting confirmed intent", () => {
  const first = mergeTripIntent(createEmptyTripIntent(), { originCountry: "Germany", destinationRegion: "Yunnan" });
  const second = mergeTripIntent(first, { travelers: 2, travelerType: "couple" });
  assert.equal(second.originCountry, "Germany");
  assert.equal(second.destinationRegion, "Yunnan");
  assert.equal(second.travelers, 2);
  assert.equal(second.travelerType, "couple");
});

test("unrecognized fields remain null and unresolved instead of receiving defaults", () => {
  const result = validateExtractionResult({
    extractedFields: { destinationRegion: "Yunnan" }, confidence: 0.91,
    unresolvedFields: ["budget", "travelers"], nextQuestion: "Who are you traveling with?", readyToGenerateTrip: false,
  });
  assert.ok(result);
  const intent = mergeTripIntent(createEmptyTripIntent(), result.extractedFields);
  assert.equal(intent.destinationRegion, "Yunnan");
  assert.equal(intent.budget, null);
  assert.equal(intent.vehiclePreference, null);
  assert.equal(intent.drivingLicenceStatus, null);
  assert.ok(intent.unresolvedFields.includes("budget"));
});

test("trip generation readiness requires destination, duration, travelers and explicit self-drive intent", () => {
  let intent = mergeTripIntent(createEmptyTripIntent(), { destinationRegion: "Yunnan", durationDays: 9, travelers: 2 });
  assert.equal(isMinimumViableIntent(intent), false);
  intent = mergeTripIntent(intent, { drivingPreference: "undecided" });
  assert.equal(isMinimumViableIntent(intent), false);
  intent = mergeTripIntent(intent, { drivingPreference: "self-drive" });
  assert.equal(isMinimumViableIntent(intent), true);
});

test("follow-up policy asks exactly one deterministic high-value question", () => {
  const first = nextQuestionForIntent(createEmptyTripIntent());
  assert.equal(first, "Which part of China would you most like to explore by road?");
  assert.equal(first.match(/\?/g)?.length, 1);
  const withRegion = mergeTripIntent(createEmptyTripIntent(), { destinationRegion: "Yunnan" });
  assert.equal(nextQuestionForIntent(withRegion), "Are you traveling solo, as a couple, with family, or with friends?");
});

test("AI failure preserves the exact existing TripIntent reference", () => {
  const intent = mergeTripIntent(createEmptyTripIntent(), { originCountry: "Germany", destinationRegion: "Yunnan" });
  assert.equal(retainTripIntentOnAiFailure(intent), intent);
  assert.equal(retainTripIntentOnAiFailure(intent).originCountry, "Germany");
});

test("interpreted change commands must pass deterministic Trip Engine validation", () => {
  const trip = createGoldenTrip();
  const forged = { type: "set-max-daily-driving-minutes", maxMinutes: 120 };
  assert.equal(applyTripChangeCommand(trip, forged), trip);
  const next = applyTripChangeCommand(trip, { type: "set-max-daily-driving-minutes", maxMinutes: 180 }, "2026-08-25T00:00:00.000Z");
  assert.equal(next.revision, 2);
  assert.notEqual(next, trip);
  assert.equal(trip.revision, 1);
});
