import test from "node:test";
import assert from "node:assert/strict";
import { mockCatalog } from "../app/data/mock-data.ts";
import { applyRelaxedDrivingChange, createGoldenTrip, getTripMetrics } from "../app/trip-engine.ts";

test("mock catalog meets Sprint quality-first counts and provenance boundary", () => {
  assert.equal(mockCatalog.vehicles.length, 10);
  assert.ok(mockCatalog.hotels.length >= 20);
  assert.ok(mockCatalog.experiences.length >= 20);
  assert.ok(mockCatalog.destinations.length >= 10);
  for (const group of Object.values(mockCatalog)) assert.ok(group.every((item) => item.provenance === "demo-mock"));
});

test("Golden Path is a related, priced nine-day structured Trip", () => {
  const trip = createGoldenTrip();
  assert.equal(trip.days.length, 9);
  assert.equal(trip.traveler.nationality, "Germany");
  assert.equal(trip.vehicleId, "vehicle-haval-h6");
  assert.ok(trip.price.total > 0);
  assert.equal(trip.realityEvents.length, 1);
  for (const day of trip.days) {
    assert.ok(mockCatalog.destinations.some((item) => item.id === day.destinationId));
    assert.ok(day.routeSegmentIds.every((id) => mockCatalog.routeSegments.some((item) => item.id === id)));
    assert.ok(day.experienceIds.every((id) => mockCatalog.experiences.some((item) => item.id === id)));
  }
});

test("relaxed-driving Copilot change is local, immutable, revisioned and dependent", () => {
  const original = createGoldenTrip();
  const before = structuredClone(original);
  const next = applyRelaxedDrivingChange(original, "2026-08-25T00:00:00.000Z");
  assert.deepEqual(original, before);
  assert.notEqual(next, original);
  assert.equal(next.revision, 2);
  assert.equal(next.status, "customized");
  assert.equal(next.days.find((item) => item.id === "day-2").destinationId, "chuxiong");
  assert.equal(next.days.find((item) => item.id === "day-2").hotelId, "hotel-chuxiong-pavilion");
  assert.deepEqual(next.days.find((item) => item.id === "day-3").routeSegmentIds, ["route-chuxiong-dali"]);
  assert.ok(getTripMetrics(next).longestDrivingMinutes <= 180);
  assert.equal(next.changes.length, 1);
  assert.ok(next.changes[0].diffs.some((item) => item.objectType === "Hotel"));
  assert.equal(next.price.total - original.price.total, next.changes[0].priceDeltaCny);
});

test("applying the same supported repair twice is a reference-equal no-op", () => {
  const once = applyRelaxedDrivingChange(createGoldenTrip());
  assert.equal(applyRelaxedDrivingChange(once), once);
});
