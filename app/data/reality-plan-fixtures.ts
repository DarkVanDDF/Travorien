import type { RealityEvent, TripDay } from "../domain.ts";

type DayBaseline = Pick<TripDay, "id" | "destinationId" | "routeSegmentIds" | "hotelId" | "experienceIds">;
type DayReplacement = Omit<TripDay, "dayNumber" | "date">;

export interface DemoRealityPlanFixture {
  id: string;
  provenance: "demo-mock";
  eventId: string;
  eventType: RealityEvent["type"];
  destinationScopeId: string;
  requiredAffectedObjectIds: string[];
  baselineDays: DayBaseline[];
  skipDays: DayReplacement[];
  rerouteDays: DayReplacement[];
}

// Explicit Sprint 2 Golden policy. It is intentionally a demo fixture, not a
// universal planner. Unsupported events must not inherit these Day 7/8 changes.
export const gorgeRainDemoPolicy: DemoRealityPlanFixture = {
  id: "demo-policy-gorge-rain-v1",
  provenance: "demo-mock",
  eventId: "event-gorge-heavy-rain-demo",
  eventType: "WEATHER_RISK",
  destinationScopeId: "tiger-gorge",
  requiredAffectedObjectIds: ["day-7", "day-8", "route-lijiang-gorge", "route-gorge-shangrila", "exp-gorge-hike"],
  baselineDays: [
    { id: "day-7", destinationId: "tiger-gorge", routeSegmentIds: ["route-lijiang-gorge"], hotelId: "hotel-gorge-tea-horse", experienceIds: ["exp-gorge-hike"] },
    { id: "day-8", destinationId: "shangri-la", routeSegmentIds: ["route-gorge-shangrila"], hotelId: "hotel-shangrila-songtsam", experienceIds: ["exp-shangrila-monastery"] },
  ],
  skipDays: [
    { id: "day-7", destinationId: "shangri-la", title: "Avoid the gorge and continue to Shangri-La", routeSegmentIds: ["route-lijiang-shangrila-direct"], hotelId: "hotel-shangrila-arro", experienceIds: [], notes: "A demo direct route avoids the Tiger Leaping Gorge stop and arrives in Shangri-La this evening." },
    { id: "day-8", destinationId: "shangri-la", title: "A slower day on the plateau", routeSegmentIds: [], hotelId: "hotel-shangrila-songtsam", experienceIds: ["exp-shangrila-monastery"], notes: "No required driving on this day; the plateau arrival is already complete." },
  ],
  rerouteDays: [
    { id: "day-7", destinationId: "baishuitai", title: "Re-route to the White Water Terraces", routeSegmentIds: ["route-lijiang-baishuitai"], hotelId: "hotel-baishuitai-cloudline", experienceIds: ["exp-baishuitai-terraces"], notes: "A daylight demo route avoids the gorge corridor and replaces the hike with Bai Shui Tai." },
    { id: "day-8", destinationId: "shangri-la", title: "Terraces to the Tibetan plateau", routeSegmentIds: ["route-baishuitai-shangrila"], hotelId: "hotel-shangrila-songtsam", experienceIds: ["exp-shangrila-monastery"], notes: "Continue north on the alternative mountain route with monitored conditions." },
  ],
};
