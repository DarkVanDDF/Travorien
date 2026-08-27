import type { AffectedTripObject, Catalog, ImpactAssessment, RealityEvent, Trip } from "./domain.ts";

export interface ImpactFinding {
  affectedObjects: AffectedTripObject[];
  impactTypes: ImpactAssessment["impactTypes"];
  summary: string;
  reasoning: string[];
}

export interface ImpactRule {
  id: string;
  eventType: string;
  supports(event: RealityEvent): boolean;
  assess(event: RealityEvent, trip: Trip, catalog: Catalog): ImpactFinding;
}

const addAffected = (items: AffectedTripObject[], item: AffectedTripObject) => {
  if (!items.some((current) => current.objectType === item.objectType && current.objectId === item.objectId)) items.push(item);
};

export const chinaDayOverlapsEvent = (date: string, event: RealityEvent) => {
  const dayStart = Date.parse(`${date}T00:00:00+08:00`);
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const eventStart = Date.parse(event.effectiveFrom);
  const eventEnd = Date.parse(event.effectiveUntil);
  return [dayStart, eventStart, eventEnd].every(Number.isFinite) && eventStart < dayEnd && eventEnd >= dayStart;
};

const destinationName = (catalog: Catalog, id: string) => catalog.destinations.find((item) => item.id === id)?.name ?? id;
const routeLabel = (catalog: Catalog, id: string) => {
  const route = catalog.routeSegments.find((item) => item.id === id);
  return route ? `${destinationName(catalog, route.fromDestinationId)} → ${destinationName(catalog, route.toDestinationId)}` : id;
};

export const weatherImpactRule: ImpactRule = {
  id: "impact-rule-weather-area",
  eventType: "WEATHER_RISK",
  supports: (event) => event.type === "WEATHER_RISK",
  assess(event, trip, catalog) {
    const affectedObjects: AffectedTripObject[] = [];
    const destinations = new Set(event.scope.destinationIds);
    const routes = new Set(event.scope.routeSegmentIds);
    for (const day of trip.days) {
      if (!chinaDayOverlapsEvent(day.date, event)) continue;
      const matchedRoutes = day.routeSegmentIds.filter((id) => routes.has(id));
      const affected = destinations.has(day.destinationId) || matchedRoutes.length > 0;
      if (!affected) continue;
      for (const id of matchedRoutes) addAffected(affectedObjects, { objectType: "RouteSegment", objectId: id, label: routeLabel(catalog, id), reason: "The referenced route overlaps the weather event window." });
      addAffected(affectedObjects, { objectType: "TripDay", objectId: day.id, label: `Day ${day.dayNumber} · ${day.title}`, reason: "The planned stop or route is inside the weather scope." });
      for (const id of day.experienceIds) {
        const experience = catalog.experiences.find((item) => item.id === id);
        if (experience?.category === "nature" && destinations.has(experience.destinationId)) addAffected(affectedObjects, { objectType: "Experience", objectId: id, label: experience.name, reason: "The outdoor experience is inside the weather scope." });
      }
      if (day.hotelId) {
        const hotel = catalog.hotels.find((item) => item.id === day.hotelId);
        if (hotel) addAffected(affectedObjects, { objectType: "Hotel", objectId: hotel.id, label: hotel.name, reason: destinations.has(hotel.destinationId) ? "The stay is inside the weather scope." : "Arrival timing depends on the affected route." });
      }
    }
    return {
      affectedObjects,
      impactTypes: affectedObjects.length ? ["SAFETY", "ROUTE", "OUTDOOR_EXPERIENCE", "ARRIVAL_TIME", "STAY"] : [],
      summary: affectedObjects.length ? `${event.title} affects the scoped route and outdoor journey.` : "The weather scope does not intersect this Trip during its effective window.",
      reasoning: affectedObjects.length ? ["Only explicitly scoped destinations and routes were matched.", "China local-day dates overlap the event window."] : ["No scoped route or destination overlaps both the Trip and event window."],
    };
  },
};

export const roadClosureImpactRule: ImpactRule = {
  id: "impact-rule-road-segment",
  eventType: "ROAD_CLOSURE",
  supports: (event) => event.type === "ROAD_CLOSURE",
  assess(event, trip, catalog) {
    const affectedObjects: AffectedTripObject[] = [];
    const routes = new Set(event.scope.routeSegmentIds);
    for (const day of trip.days) {
      if (!chinaDayOverlapsEvent(day.date, event)) continue;
      const matched = day.routeSegmentIds.filter((id) => routes.has(id));
      if (!matched.length) continue;
      for (const id of matched) addAffected(affectedObjects, { objectType: "RouteSegment", objectId: id, label: routeLabel(catalog, id), reason: "This exact planned segment is marked closed." });
      addAffected(affectedObjects, { objectType: "TripDay", objectId: day.id, label: `Day ${day.dayNumber} · ${day.title}`, reason: "The day uses the closed route segment." });
    }
    return {
      affectedObjects,
      impactTypes: affectedObjects.length ? ["SAFETY", "ROUTE", "ARRIVAL_TIME"] : [],
      summary: affectedObjects.length ? `${event.title} blocks a referenced Trip route.` : "No planned route uses the closed segment during the event window.",
      reasoning: affectedObjects.length ? ["The rule matched exact route-segment IDs, not nearby destinations."] : ["No Trip day contains a scoped closed route segment in the effective window."],
    };
  },
};

export const hotelAvailabilityImpactRule: ImpactRule = {
  id: "impact-rule-hotel-booking",
  eventType: "HOTEL_UNAVAILABLE",
  supports: (event) => event.type === "HOTEL_UNAVAILABLE",
  assess(event, trip, catalog) {
    const affectedObjects: AffectedTripObject[] = [];
    const hotels = new Set(event.scope.hotelIds);
    const bookingIds = new Set(event.scope.bookingIds);
    for (const day of trip.days) {
      if (!day.hotelId || !hotels.has(day.hotelId) || !chinaDayOverlapsEvent(day.date, event)) continue;
      const hotel = catalog.hotels.find((item) => item.id === day.hotelId);
      addAffected(affectedObjects, { objectType: "Hotel", objectId: day.hotelId, label: hotel?.name ?? day.hotelId, reason: "This exact scheduled hotel is unavailable." });
      addAffected(affectedObjects, { objectType: "TripDay", objectId: day.id, label: `Day ${day.dayNumber} · ${day.title}`, reason: "The overnight stay requires a replacement." });
    }
    for (const booking of trip.bookings) {
      if (booking.kind === "hotel" && hotels.has(booking.itemId) && (bookingIds.has(booking.id) || !bookingIds.size) && (!booking.dayId || trip.days.some((day) => day.id === booking.dayId && chinaDayOverlapsEvent(day.date, event)))) addAffected(affectedObjects, { objectType: "Booking", objectId: booking.id, label: `Hotel booking · ${catalog.hotels.find((item) => item.id === booking.itemId)?.name ?? booking.itemId}`, reason: "The selected booking references the unavailable hotel." });
    }
    return {
      affectedObjects,
      impactTypes: affectedObjects.length ? ["STAY", "BOOKING", "PRICE"] : [],
      summary: affectedObjects.length ? `${event.title} affects one scheduled stay and its booking.` : "The unavailable hotel is not scheduled in this Trip during the event window.",
      reasoning: affectedObjects.length ? ["The rule matched exact hotel and booking references; routes were not inferred."] : ["No Trip day or booking references the scoped hotel in the effective window."],
    };
  },
};

export const flightDelayImpactRule: ImpactRule = {
  id: "impact-rule-arrival-delay",
  eventType: "FLIGHT_DELAY",
  supports: (event) => event.type === "FLIGHT_DELAY",
  assess(event, trip, catalog) {
    const affectedObjects: AffectedTripObject[] = [];
    const bookingIds = new Set(event.scope.bookingIds);
    const scopedArrivalBookings = trip.bookings.filter((booking) => bookingIds.has(booking.id) && (booking.kind === "flight" || booking.kind === "vehicle"));
    const hasInboundFlight = scopedArrivalBookings.some((booking) => booking.kind === "flight");
    const targetsArrivalCity = event.scope.destinationIds.includes(trip.traveler.arrivalCityId);
    const arrivalDay = hasInboundFlight && targetsArrivalCity ? trip.days.find((day) => day.dayNumber === 1 && day.destinationId === trip.traveler.arrivalCityId && chinaDayOverlapsEvent(day.date, event)) : undefined;
    if (arrivalDay) {
      addAffected(affectedObjects, { objectType: "TripDay", objectId: arrivalDay.id, label: `Day 1 · ${arrivalDay.title}`, reason: "The inbound arrival is later than the planned first-day schedule." });
      for (const id of arrivalDay.experienceIds) {
        const experience = catalog.experiences.find((item) => item.id === id);
        if (experience) addAffected(affectedObjects, { objectType: "Experience", objectId: id, label: experience.name, reason: "The delayed arrival reduces the available first-day experience window." });
      }
      if (arrivalDay.hotelId) {
        const hotel = catalog.hotels.find((item) => item.id === arrivalDay.hotelId);
        if (hotel) addAffected(affectedObjects, { objectType: "Hotel", objectId: hotel.id, label: hotel.name, reason: "Hotel check-in timing shifts with the delayed arrival." });
      }
    }
    if (arrivalDay) for (const booking of scopedArrivalBookings) {
      addAffected(affectedObjects, { objectType: "Booking", objectId: booking.id, label: booking.kind === "flight" ? "Inbound flight" : "Vehicle pickup", reason: "The booking is explicitly referenced by the arrival-delay signal." });
    }
    return {
      affectedObjects,
      impactTypes: affectedObjects.length ? ["ARRIVAL_TIME", "BOOKING", "EXPERIENCE", "STAY"] : [],
      summary: affectedObjects.length ? `${event.title} changes the Day 1 arrival window.` : "The delayed arrival does not intersect this Trip's first day or bookings.",
      reasoning: affectedObjects.length ? ["The rule matched the Trip arrival city, Day 1 in China local time, and an explicitly scoped inbound-flight booking."] : ["No matching arrival city, inbound-flight booking, or Day 1 intersects the delay window."],
    };
  },
};

export const impactRuleRegistry: ImpactRule[] = [weatherImpactRule, roadClosureImpactRule, hotelAvailabilityImpactRule, flightDelayImpactRule];
