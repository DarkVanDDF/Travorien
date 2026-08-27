import type { CandidatePlan, Catalog, ImpactAssessment, RealityEvent, Risk, Trip, TripChangeCommand, TripDay } from "./domain.ts";
import { gorgeRainDemoPolicy } from "./data/reality-plan-fixtures.ts";

export interface CandidatePlanDraft {
  idSuffix: string;
  kind: CandidatePlan["kind"];
  responseEffect: CandidatePlan["responseEffect"];
  title: string;
  description: string;
  changeCommands: TripChangeCommand[];
  riskLevel: CandidatePlan["riskLevel"];
  operationalDelayMinutes?: number;
  hotelId?: string;
  segmentCompletionExpected?: boolean;
  experienceOutcome: string;
  tradeoffs: string[];
}

export interface CandidatePlanPolicy {
  id: string;
  eventType: string;
  supports(event: RealityEvent, assessment: ImpactAssessment, trip: Trip, catalog: Catalog): boolean;
  propose(event: RealityEvent, assessment: ImpactAssessment, trip: Trip, catalog: Catalog): CandidatePlanDraft[];
}

const sameIds = (left: string[], right: string[]) => left.length === right.length && left.every((id, index) => id === right[index]);
const eventRisk = (trip: Trip, event: RealityEvent, suffix: string, severity: Risk["severity"], title: string, mitigation: string): Risk => ({
  id: `risk-${event.id}-v${event.version}-${suffix}`,
  tripId: trip.id,
  severity,
  category: event.type === "WEATHER_RISK" ? "weather" : event.type === "HOTEL_UNAVAILABLE" ? "supplier" : event.type === "FLIGHT_DELAY" ? "arrival" : "road",
  title,
  mitigation,
});

const materializeDays = (trip: Trip, templates: typeof gorgeRainDemoPolicy.skipDays): TripDay[] => templates.flatMap((template) => {
  const current = trip.days.find((day) => day.id === template.id);
  return current ? [{ ...template, dayNumber: current.dayNumber, date: current.date }] : [];
});

const weatherGoldenApplies = (event: RealityEvent, assessment: ImpactAssessment, trip: Trip) => {
  const policy = gorgeRainDemoPolicy;
  if (event.id !== policy.eventId || event.type !== policy.eventType || !event.scope.destinationIds.includes(policy.destinationScopeId)) return false;
  const affectedIds = new Set(assessment.affectedObjects.map((item) => item.objectId));
  if (!policy.requiredAffectedObjectIds.every((id) => affectedIds.has(id))) return false;
  return policy.baselineDays.every((baseline) => {
    const current = trip.days.find((day) => day.id === baseline.id);
    return current
      && current.destinationId === baseline.destinationId
      && current.hotelId === baseline.hotelId
      && sameIds(current.routeSegmentIds, baseline.routeSegmentIds)
      && sameIds(current.experienceIds, baseline.experienceIds);
  });
};

export const weatherGoldenPolicy: CandidatePlanPolicy = {
  id: gorgeRainDemoPolicy.id,
  eventType: "WEATHER_RISK",
  supports: (event, assessment, trip) => weatherGoldenApplies(event, assessment, trip),
  propose(event, _assessment, trip, catalog) {
    const skipDays = materializeDays(trip, gorgeRainDemoPolicy.skipDays);
    const rerouteDays = materializeDays(trip, gorgeRainDemoPolicy.rerouteDays);
    const day7Booking = trip.bookings.find((booking) => booking.kind === "hotel" && booking.dayId === "day-7");
    const skipHotel = catalog.hotels.find((hotel) => hotel.id === skipDays[0]?.hotelId);
    const rerouteHotel = catalog.hotels.find((hotel) => hotel.id === rerouteDays[0]?.hotelId);
    if (skipDays.length !== 2 || rerouteDays.length !== 2 || !day7Booking || !skipHotel || !rerouteHotel) return [];
    const skipBooking = { type: "REPLACE_BOOKING" as const, eventId: event.id, bookingId: day7Booking.id, replacement: { ...day7Booking, itemId: skipHotel.id, amountCny: skipHotel.nightlyPriceCny, notes: "Demo weather-response stay replacement." } };
    const rerouteBooking = { type: "REPLACE_BOOKING" as const, eventId: event.id, bookingId: day7Booking.id, replacement: { ...day7Booking, itemId: rerouteHotel.id, amountCny: rerouteHotel.nightlyPriceCny, notes: "Demo reroute stay replacement." } };
    return [
      {
        idSuffix: "keep", kind: "KEEP", responseEffect: "ACCEPTED", title: "Keep the original plan", description: "Keep the gorge stop and acknowledge the elevated demo risk.",
        changeCommands: [{ type: "ADD_RISK", eventId: event.id, risk: eventRisk(trip, event, "keep", "high", "Active rainfall risk retained", "Monitor the demo event and reassess before entering the gorge corridor.") }],
        riskLevel: "HIGH", operationalDelayMinutes: event.details.kind === "WEATHER_RISK" ? event.details.expectedOperationalDelayMinutes : undefined, segmentCompletionExpected: true,
        experienceOutcome: "Keep the gorge hike", tradeoffs: ["No itinerary changes", "Risk remains high", "Weather delay remains possible"],
      },
      {
        idSuffix: "skip", kind: "SKIP", responseEffect: "MITIGATED", title: "Skip Tiger Leaping Gorge", description: "Drive directly from Lijiang to Shangri-La and remove the gorge hike.",
        changeCommands: [...skipDays.map((replacement) => ({ type: "REPLACE_DAY" as const, eventId: event.id, dayId: replacement.id, replacement })), skipBooking, { type: "ADD_RISK", eventId: event.id, risk: eventRisk(trip, event, "skip", "low", "Gorge rainfall avoided", "The selected route does not enter the affected gorge stop.") }],
        riskLevel: "LOW", operationalDelayMinutes: 0, segmentCompletionExpected: true,
        experienceOutcome: "Remove the gorge hike", tradeoffs: ["Lowest weather exposure", "Lose the signature gorge experience", "Earlier plateau arrival"],
      },
      {
        idSuffix: "reroute", kind: "REROUTE", responseEffect: "MITIGATED", title: "Re-route via Bai Shui Tai", description: "Replace the gorge with a coherent scenic stop at the White Water Terraces.",
        changeCommands: [...rerouteDays.map((replacement) => ({ type: "REPLACE_DAY" as const, eventId: event.id, dayId: replacement.id, replacement })), rerouteBooking, { type: "ADD_RISK", eventId: event.id, risk: eventRisk(trip, event, "reroute", "medium", "Alternative mountain route monitored", "Use daylight driving and continue checking the active demo event.") }],
        riskLevel: "LOW_MEDIUM", operationalDelayMinutes: 0, hotelId: "hotel-baishuitai-cloudline", segmentCompletionExpected: true,
        experienceOutcome: "Swap gorge hike for White Water Terraces", tradeoffs: ["Keeps a scenic mountain stop", "Uses a longer alternative road", "Adds a remote premium lodge"],
      },
    ];
  },
};

export const roadClosurePolicy: CandidatePlanPolicy = {
  id: "policy-road-closure-alternative-route-v1",
  eventType: "ROAD_CLOSURE",
  supports: (event, assessment) => event.type === "ROAD_CLOSURE" && event.details.kind === "ROAD_CLOSURE" && event.details.closureStatus === "CLOSED" && assessment.affectedObjects.filter((item) => item.objectType === "RouteSegment").length === 1,
  propose(event, assessment, trip, catalog) {
    const closedId = assessment.affectedObjects.find((item) => item.objectType === "RouteSegment")?.objectId;
    const currentRoute = catalog.routeSegments.find((item) => item.id === closedId);
    const day = trip.days.find((item) => closedId && item.routeSegmentIds.includes(closedId));
    if (!closedId || !currentRoute || !day) return [];
    const alternative = catalog.routeSegments.find((item) => item.id !== closedId && !event.scope.routeSegmentIds.includes(item.id) && item.fromDestinationId === currentRoute.fromDestinationId && item.toDestinationId === currentRoute.toDestinationId);
    const delay = event.details.kind === "ROAD_CLOSURE" ? event.details.expectedOperationalDelayMinutes : undefined;
    const drafts: CandidatePlanDraft[] = [{
      idSuffix: "wait", kind: "WAIT", responseEffect: "ACCEPTED", title: "Wait for a safe reopening", description: "Keep the scheduled corridor but pause until the demo closure is lifted.",
      changeCommands: [{ type: "ADD_RISK", eventId: event.id, risk: eventRisk(trip, event, "wait", "high", "Closed segment retained", "Do not enter until the demo feed confirms reopening.") }],
      riskLevel: "HIGH", operationalDelayMinutes: delay, segmentCompletionExpected: false, experienceOutcome: "Keep the destination, accept a delayed arrival", tradeoffs: ["No route substitution", "Arrival may be delayed", "Requires a later event update"],
    }];
    if (alternative) drafts.push({
      idSuffix: `reroute-${alternative.id}`, kind: "REROUTE", responseEffect: "MITIGATED", title: "Use the eastern valley road", description: "Replace only the closed segment with a catalog-backed route sharing the same endpoints.",
      changeCommands: [{ type: "REPLACE_DAY", eventId: event.id, dayId: day.id, replacement: { ...day, routeSegmentIds: day.routeSegmentIds.map((id) => id === closedId ? alternative.id : id), notes: `${day.notes} Demo reroute uses ${alternative.roadType}.` } }, { type: "ADD_RISK", eventId: event.id, risk: eventRisk(trip, event, "reroute", "low", "Closed road avoided", "Use the catalog-backed alternative route in daylight.") }],
      riskLevel: "LOW", operationalDelayMinutes: 0, segmentCompletionExpected: true, experienceOutcome: "Reach the same Shaxi stop by an alternative road", tradeoffs: ["Same overnight destination", "Longer driving day", "Avoids the closed segment"],
    });
    return drafts;
  },
};

export const hotelReplacementPolicy: CandidatePlanPolicy = {
  id: "policy-hotel-same-destination-v1",
  eventType: "HOTEL_UNAVAILABLE",
  supports: (event, assessment) => event.type === "HOTEL_UNAVAILABLE" && assessment.affectedObjects.filter((item) => item.objectType === "Hotel").length === 1,
  propose(event, _assessment, trip, catalog) {
    const unavailableId = event.scope.hotelIds[0];
    const day = trip.days.find((item) => item.hotelId === unavailableId);
    const booking = trip.bookings.find((item) => item.kind === "hotel" && item.itemId === unavailableId && (!item.dayId || item.dayId === day?.id));
    const unavailable = catalog.hotels.find((item) => item.id === unavailableId);
    if (!day || !booking || !unavailable) return [];
    return catalog.hotels
      .filter((item) => item.destinationId === unavailable.destinationId && item.id !== unavailable.id && !event.scope.hotelIds.includes(item.id))
      .sort((left, right) => left.nightlyPriceCny - right.nightlyPriceCny)
      .slice(0, 2)
      .map((hotel, index): CandidatePlanDraft => ({
        idSuffix: `replace-${hotel.id}`, kind: "REPLACE", responseEffect: "MITIGATED", title: index === 0 ? `Switch to ${hotel.name}` : `Upgrade to ${hotel.name}`, description: `Replace the unavailable stay and its selected booking with a ${hotel.style.toLowerCase()} in the same destination.`,
        changeCommands: [
          { type: "REPLACE_DAY", eventId: event.id, dayId: day.id, replacement: { ...day, hotelId: hotel.id, notes: `${day.notes} Stay changed to ${hotel.name} because the original demo hotel is unavailable.` } },
          { type: "REPLACE_BOOKING", eventId: event.id, bookingId: booking.id, replacement: { ...booking, itemId: hotel.id, amountCny: hotel.nightlyPriceCny, notes: `Demo replacement for ${unavailable.name}.` } },
        ],
        riskLevel: "LOW", operationalDelayMinutes: 0, hotelId: hotel.id, segmentCompletionExpected: true, experienceOutcome: "Keep the route and experiences; replace only the stay", tradeoffs: [`Same ${unavailable.destinationId} overnight stop`, `${hotel.nightlyPriceCny >= unavailable.nightlyPriceCny ? "Higher" : "Lower"} demo room price`, "Booking and Trip day update atomically"],
      }));
  },
};

const addMinutes = (value: string | undefined, minutes: number) => value ? new Date(Date.parse(value) + minutes * 60_000).toISOString() : undefined;

export const flightDelayPolicy: CandidatePlanPolicy = {
  id: "policy-arrival-delay-day-one-v1",
  eventType: "FLIGHT_DELAY",
  supports: (event, assessment) => event.type === "FLIGHT_DELAY" && assessment.affectedObjects.some((item) => item.objectType === "TripDay" && item.objectId === "day-1"),
  propose(event, _assessment, trip) {
    if (event.details.kind !== "FLIGHT_DELAY") return [];
    const day = trip.days.find((item) => item.dayNumber === 1);
    const flight = trip.bookings.find((item) => item.kind === "flight" && event.scope.bookingIds.includes(item.id));
    const vehicle = trip.bookings.find((item) => item.kind === "vehicle" && event.scope.bookingIds.includes(item.id));
    if (!day || !flight || !vehicle) return [];
    const bookingCommands: TripChangeCommand[] = [
      { type: "REPLACE_BOOKING", eventId: event.id, bookingId: flight.id, replacement: { ...flight, scheduledAt: event.details.estimatedArrivalAt, notes: `Demo flight arrival moved by ${event.details.delayMinutes} minutes.` } },
      { type: "REPLACE_BOOKING", eventId: event.id, bookingId: vehicle.id, replacement: { ...vehicle, scheduledAt: addMinutes(vehicle.scheduledAt, event.details.delayMinutes), notes: "Vehicle pickup moved to follow the delayed inbound flight." } },
    ];
    return [
      {
        idSuffix: "keep-first-evening", kind: "WAIT", responseEffect: "ACCEPTED", title: "Keep the first evening flexible", description: "Move the flight and vehicle pickup times while retaining the first experience as optional.",
        changeCommands: [{ type: "REPLACE_DAY", eventId: event.id, dayId: day.id, replacement: { ...day, title: "Arrive later in Kunming", notes: "Late demo arrival; the market walk remains optional after hotel check-in." } }, ...bookingCommands],
        riskLevel: "MEDIUM", operationalDelayMinutes: event.details.delayMinutes, segmentCompletionExpected: true, experienceOutcome: "Keep the market walk as an optional late activity", tradeoffs: ["Vehicle pickup follows the flight", "First experience may feel rushed", "No itinerary-day change"],
      },
      {
        idSuffix: "drop-first-experience", kind: "CHANGE_DAY", responseEffect: "MITIGATED", title: "Make Day 1 arrival-only", description: "Move arrival bookings and remove the first experience for a calm hotel-only evening.",
        changeCommands: [{ type: "REPLACE_DAY", eventId: event.id, dayId: day.id, replacement: { ...day, title: "Land softly after the delay", experienceIds: [], notes: "Late demo arrival, rescheduled vehicle pickup and direct hotel check-in." } }, ...bookingCommands],
        riskLevel: "LOW", operationalDelayMinutes: event.details.delayMinutes, segmentCompletionExpected: true, experienceOutcome: "Drop the Day 1 market walk", tradeoffs: ["Lowest arrival pressure", "Experience price removed", "Day 2 remains unchanged"],
      },
    ];
  },
};

export const candidatePlanPolicyRegistry: CandidatePlanPolicy[] = [weatherGoldenPolicy, roadClosurePolicy, hotelReplacementPolicy, flightDelayPolicy];
