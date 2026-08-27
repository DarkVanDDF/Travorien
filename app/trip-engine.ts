import type { CandidatePlan, Catalog, RealityEvent, Traveler, Trip, TripChangeCommand, TripDay, TripDiff } from "./domain.ts";
import { heavyRainGorgeEvent, mockCatalog } from "./data/mock-data.ts";
import { calculatePrice, catalogSnapshotFingerprint, getTripMetrics } from "./trip-calculations.ts";

export { calculatePrice, getTripMetrics } from "./trip-calculations.ts";

const dateForDay = (startDate: string, offset: number) => {
  const date = new Date(`${startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const day = (dayNumber: number, date: string, destinationId: string, title: string, routeSegmentIds: string[], hotelId: string | undefined, experienceIds: string[], notes: string): TripDay => ({
  id: `day-${dayNumber}`, dayNumber, date, destinationId, title, routeSegmentIds, hotelId, experienceIds, notes,
});

export const defaultTraveler: Traveler = {
  id: "traveler-german-couple", nationality: "Germany", adults: 2, arrivalCityId: "kunming",
  startDate: "2026-10-10", endDate: "2026-10-18", hasForeignDrivingLicence: true,
  travelStyles: ["Nature", "Local culture", "Food"], drivingPreference: "relaxed",
  vehiclePreference: "Automatic SUV", budget: "mid-to-premium",
};

export function createGoldenTrip(traveler: Traveler = defaultTraveler, catalog: Catalog = mockCatalog): Trip {
  const dates = Array.from({ length: 9 }, (_, index) => dateForDay(traveler.startDate, index));
  const days = [
    day(1, dates[0], "kunming", "Land softly in Kunming", [], "hotel-kunming-green-lake", ["exp-kunming-market"], "Airport welcome, vehicle briefing and a gentle food-led introduction."),
    day(2, dates[1], "dali", "Open road to Dali", ["route-kunming-dali"], "hotel-dali-linden", ["exp-dali-bai"], "A longer expressway day, broken by two pre-planned rest stops."),
    day(3, dates[2], "dali", "Erhai at your own pace", [], "hotel-dali-linden", ["exp-dali-cycle", "exp-dali-kitchen"], "No required driving on this day."),
    day(4, dates[3], "shaxi", "Into the Tea Horse Road", ["route-dali-shaxi"], "hotel-shaxi-sunken", ["exp-shaxi-market"], "Arrive before sunset for the old market square."),
    day(5, dates[4], "lijiang", "Valleys to Lijiang", ["route-shaxi-lijiang"], "hotel-lijiang-villafound", ["exp-lijiang-naxi"], "A light drive leaves the afternoon free."),
    day(6, dates[5], "lijiang", "Snow mountain foothills", [], "hotel-lijiang-villafound", ["exp-lijiang-snow", "exp-lijiang-music"], "Driver-rest day with a hosted excursion."),
    day(7, dates[6], "tiger-gorge", "Drive into the gorge", ["route-lijiang-gorge"], "hotel-gorge-tea-horse", ["exp-gorge-hike"], "Check in before a supported half-day hike."),
    day(8, dates[7], "shangri-la", "Climb to the plateau", ["route-gorge-shangrila"], "hotel-shangrila-songtsam", ["exp-shangrila-monastery"], "Slow ascent, hydration stops and an easy evening."),
    day(9, dates[8], "shangri-la", "A spacious final morning", [], undefined, ["exp-shangrila-wetland"], "Late checkout support and airport transfer guidance."),
  ];
  const trip: Trip = {
    id: "trip-yunnan-9d", title: "Yunnan: Valleys to the Tibetan Plateau", status: "draft", revision: 1,
    traveler: structuredClone(traveler), vehicleId: "vehicle-haval-h6", permitRequirementId: traveler.nationality === "Germany" ? "permit-germany-demo" : "permit-generic-demo", days,
    bookings: [
      { id: "booking-arrival-flight", tripId: "trip-yunnan-9d", kind: "flight", itemId: "flight-muc-kmg-demo", status: "selected", amountCny: 0, dayId: "day-1", scheduledAt: `${dates[0]}T08:30:00+08:00`, notes: "Demo inbound arrival reference; no live flight data.", provenance: "demo-mock" },
      { id: "booking-vehicle-pickup", tripId: "trip-yunnan-9d", kind: "vehicle", itemId: "vehicle-haval-h6", status: "selected", amountCny: (catalog.vehicles.find((item) => item.id === "vehicle-haval-h6")?.dailyPriceCny ?? 0) * days.length, dayId: "day-1", scheduledAt: `${dates[0]}T10:00:00+08:00`, notes: "Demo pickup time; no live supplier hold.", provenance: "demo-mock" },
      ...days.filter((tripDay) => tripDay.hotelId).map((tripDay) => ({ id: `booking-hotel-${tripDay.id}`, tripId: "trip-yunnan-9d", kind: "hotel" as const, itemId: tripDay.hotelId!, status: "selected" as const, amountCny: catalog.hotels.find((item) => item.id === tripDay.hotelId)?.nightlyPriceCny ?? 0, dayId: tripDay.id, notes: "Demo selected stay; no live inventory.", provenance: "demo-mock" as const })),
    ],
    risks: [
      { id: "risk-altitude", tripId: "trip-yunnan-9d", severity: "medium", category: "altitude", title: "Shangri-La elevation", mitigation: "Gradual ascent, hydration reminders and an easy first evening." },
      { id: "risk-permit", tripId: "trip-yunnan-9d", severity: "low", category: "permit", title: "Temporary permit required", mitigation: "Document checklist and in-person handoff guidance included." },
    ],
    realityEvents: [structuredClone(heavyRainGorgeEvent)], decisions: [],
    changes: [], price: { currency: "CNY", vehicle: 0, hotels: 0, experiences: 0, permitAssistance: 0, roadSupport: 0, total: 0 }, provenance: "demo-mock",
  };
  trip.price = calculatePrice(trip, catalog);
  return trip;
}

export function applyRelaxedDrivingChange(trip: Trip, appliedAt = new Date().toISOString(), catalog: Catalog = mockCatalog): Trip {
  const affectedDay = trip.days.find((item) => item.routeSegmentIds.includes("route-kunming-dali"));
  if (!affectedDay) return trip;
  const beforePrice = trip.price.total;
  const nextDays = trip.days.map((item) => {
    if (item.id === affectedDay.id) return { ...item, destinationId: "chuxiong", title: "An easy first drive to Chuxiong", routeSegmentIds: ["route-kunming-chuxiong"], hotelId: "hotel-chuxiong-pavilion", experienceIds: ["exp-chuxiong-yi"], notes: "A comfortable first driving day, with time for a hosted Yi supper." };
    if (item.id === "day-3") return { ...item, title: "Chuxiong to Dali, then Erhai", routeSegmentIds: ["route-chuxiong-dali"], experienceIds: ["exp-dali-cycle", "exp-dali-bai"], notes: "A second short drive reaches Dali before a relaxed lakeside afternoon." };
    return item;
  });
  const nextBookings = trip.bookings.map((booking) => booking.kind === "hotel" && booking.dayId === affectedDay.id
    ? { ...booking, itemId: "hotel-chuxiong-pavilion", amountCny: catalog.hotels.find((hotel) => hotel.id === "hotel-chuxiong-pavilion")?.nightlyPriceCny ?? booking.amountCny, notes: "Demo stay updated with the relaxed-driving repair." }
    : booking);
  const next: Trip = { ...trip, status: "customized", revision: trip.revision + 1, days: nextDays, bookings: nextBookings };
  next.price = calculatePrice(next, catalog);
  next.changes = [...trip.changes, {
    id: `change-relaxed-driving-r${next.revision}`, tripId: trip.id, source: "traveler", intent: "I don't want to drive more than 3 hours per day.",
    summary: "Split the Kunming–Dali drive with a Chuxiong overnight; every driving day is now under 3 hours.", appliedAt,
    priceDeltaCny: next.price.total - beforePrice,
    diffs: [
      { objectType: "RouteSegment", objectId: "day-2", field: "Driving time", before: "4 hr 15 min", after: "2 hr 15 min" },
      { objectType: "Hotel", objectId: "day-2", field: "Night 2 stay", before: "Linden Centre Dali", after: "The Pavilion Chuxiong" },
      { objectType: "RouteSegment", objectId: "day-3", field: "Added drive", before: "No required driving", after: "Chuxiong → Dali · 2 hr 25 min" },
      { objectType: "Trip", objectId: trip.id, field: "Trip duration", before: "9 days", after: "9 days · unchanged" },
      { objectType: "Price", objectId: trip.id, field: "Estimated total", before: `¥${beforePrice.toLocaleString("en-US")}`, after: `¥${next.price.total.toLocaleString("en-US")}` },
    ],
  }];
  return next;
}

export function applyTripChangeCommand(trip: Trip, command: TripChangeCommand, appliedAt = new Date().toISOString(), catalog: Catalog = mockCatalog): Trip {
  if (command.type !== "set-max-daily-driving-minutes" || command.maxMinutes !== 180) return trip;
  return applyRelaxedDrivingChange(trip, appliedAt, catalog);
}

const validReplacementDay = (trip: Trip, command: Extract<TripChangeCommand, { type: "REPLACE_DAY" }>, catalog: Catalog) => {
  const current = trip.days.find((day) => day.id === command.dayId);
  const next = command.replacement;
  if (!current || next.id !== current.id || next.dayNumber !== current.dayNumber || next.date !== current.date) return false;
  if (!catalog.destinations.some((item) => item.id === next.destinationId)) return false;
  if (next.hotelId && !catalog.hotels.some((item) => item.id === next.hotelId && item.destinationId === next.destinationId)) return false;
  if (!next.routeSegmentIds.every((id) => catalog.routeSegments.some((item) => item.id === id))) return false;
  if (!next.experienceIds.every((id) => catalog.experiences.some((item) => item.id === id && item.destinationId === next.destinationId))) return false;
  return true;
};

const validReplacementBooking = (trip: Trip, command: Extract<TripChangeCommand, { type: "REPLACE_BOOKING" }>, catalog: Catalog) => {
  const current = trip.bookings.find((booking) => booking.id === command.bookingId);
  const next = command.replacement;
  if (!current || next.id !== current.id || next.tripId !== trip.id || next.kind !== current.kind || next.dayId !== current.dayId || next.provenance !== "demo-mock") return false;
  if (next.scheduledAt && !Number.isFinite(Date.parse(next.scheduledAt))) return false;
  if (next.kind === "hotel" && !catalog.hotels.some((hotel) => hotel.id === next.itemId && hotel.nightlyPriceCny === next.amountCny)) return false;
  if (next.kind === "vehicle" && !catalog.vehicles.some((vehicle) => vehicle.id === next.itemId)) return false;
  if (next.kind === "flight" && (next.itemId !== current.itemId || next.amountCny !== current.amountCny)) return false;
  return next.amountCny >= 0;
};

const validBookingCoherence = (days: TripDay[], bookings: Trip["bookings"], catalog: Catalog) => bookings.every((booking) => {
  if (booking.kind !== "hotel" || !booking.dayId) return true;
  const day = days.find((item) => item.id === booking.dayId);
  const hotel = catalog.hotels.find((item) => item.id === booking.itemId);
  return Boolean(day && hotel && day.hotelId === hotel.id && day.destinationId === hotel.destinationId && booking.amountCny === hotel.nightlyPriceCny);
});

export function validateItineraryContinuity(trip: Pick<Trip, "traveler">, days: TripDay[], catalog: Catalog = mockCatalog) {
  let currentDestinationId = trip.traveler.arrivalCityId;
  for (const day of days) {
    if (!day.routeSegmentIds.length) {
      if (day.destinationId !== currentDestinationId) return false;
      continue;
    }
    for (const routeId of day.routeSegmentIds) {
      const segment = catalog.routeSegments.find((item) => item.id === routeId);
      if (!segment || segment.fromDestinationId !== currentDestinationId) return false;
      currentDestinationId = segment.toDestinationId;
    }
    if (currentDestinationId !== day.destinationId) return false;
  }
  return true;
}

export function applyCanonicalCandidatePlan(trip: Trip, event: RealityEvent, plan: CandidatePlan, candidatePlans: CandidatePlan[], decisionTime = new Date().toISOString(), catalog: Catalog = mockCatalog): Trip {
  const comparedPlan = candidatePlans.find((item) => item.id === plan.id);
  if (
    !comparedPlan
    || JSON.stringify(comparedPlan) !== JSON.stringify(plan)
    || !plan.changeCommands.length
    || plan.tripId !== trip.id
    || plan.eventId !== event.id
    || plan.eventVersion !== event.version
    || plan.baseTripRevision !== trip.revision
    || plan.catalogFingerprint !== catalogSnapshotFingerprint(catalog)
    || trip.decisions.some((item) => item.eventId === event.id && item.eventVersion === event.version)
  ) return trip;
  const seenDays = new Set<string>();
  const seenRisks = new Set<string>();
  const seenBookings = new Set<string>();
  for (const command of plan.changeCommands) {
    if (command.type === "set-max-daily-driving-minutes" || command.eventId !== event.id) return trip;
    if (command.type === "REPLACE_DAY") {
      if (seenDays.has(command.dayId) || !validReplacementDay(trip, command, catalog)) return trip;
      seenDays.add(command.dayId);
    }
    if (command.type === "ADD_RISK") {
      if (command.risk.tripId !== trip.id || !command.risk.id.startsWith(`risk-${event.id}-v${event.version}-`) || seenRisks.has(command.risk.id) || trip.risks.some((item) => item.id === command.risk.id)) return trip;
      seenRisks.add(command.risk.id);
    }
    if (command.type === "REPLACE_BOOKING") {
      if (seenBookings.has(command.bookingId) || !validReplacementBooking(trip, command, catalog)) return trip;
      seenBookings.add(command.bookingId);
    }
  }

  const replacements = plan.changeCommands.filter((command): command is Extract<TripChangeCommand, { type: "REPLACE_DAY" }> => command.type === "REPLACE_DAY");
  const bookingReplacements = plan.changeCommands.filter((command): command is Extract<TripChangeCommand, { type: "REPLACE_BOOKING" }> => command.type === "REPLACE_BOOKING");
  const addedRisks = plan.changeCommands.filter((command): command is Extract<TripChangeCommand, { type: "ADD_RISK" }> => command.type === "ADD_RISK").map((command) => structuredClone(command.risk));
  const nextDays = trip.days.map((day) => structuredClone(replacements.find((command) => command.dayId === day.id)?.replacement ?? day));
  const nextBookings = trip.bookings.map((booking) => structuredClone(bookingReplacements.find((command) => command.bookingId === booking.id)?.replacement ?? booking));
  if (!validateItineraryContinuity(trip, nextDays, catalog) || !validBookingCoherence(nextDays, nextBookings, catalog)) return trip;
  const nextPrice = calculatePrice({ ...trip, days: nextDays, bookings: nextBookings }, catalog);
  const beforeMetrics = getTripMetrics(trip, catalog);
  const afterMetrics = getTripMetrics({ ...trip, days: nextDays }, catalog);
  if (plan.estimatedCostDeltaCny !== nextPrice.total - trip.price.total || plan.drivingTimeDeltaMinutes !== afterMetrics.drivingMinutes - beforeMetrics.drivingMinutes) return trip;
  const routeLabel = (ids: string[]) => ids.map((id) => {
    const segment = catalog.routeSegments.find((item) => item.id === id);
    if (!segment) return id;
    return `${catalog.destinations.find((item) => item.id === segment.fromDestinationId)?.name ?? segment.fromDestinationId} → ${catalog.destinations.find((item) => item.id === segment.toDestinationId)?.name ?? segment.toDestinationId} · ${segment.roadType}`;
  }).join(" · ") || "No required drive";
  const diffs: TripDiff[] = [];
  for (const replacement of replacements) {
    const before = trip.days.find((day) => day.id === replacement.dayId)!;
    const after = replacement.replacement;
    if (before.destinationId !== after.destinationId) diffs.push({ objectType: "TripDay", objectId: before.id, field: `Day ${before.dayNumber} destination`, before: catalog.destinations.find((item) => item.id === before.destinationId)?.name ?? before.destinationId, after: catalog.destinations.find((item) => item.id === after.destinationId)?.name ?? after.destinationId });
    if (before.routeSegmentIds.join() !== after.routeSegmentIds.join()) diffs.push({ objectType: "RouteSegment", objectId: before.id, field: `Day ${before.dayNumber} route`, before: routeLabel(before.routeSegmentIds), after: routeLabel(after.routeSegmentIds) });
    if (before.hotelId !== after.hotelId) diffs.push({ objectType: "Hotel", objectId: before.id, field: `Night ${before.dayNumber} stay`, before: catalog.hotels.find((item) => item.id === before.hotelId)?.name ?? "None", after: catalog.hotels.find((item) => item.id === after.hotelId)?.name ?? "None" });
    if (before.experienceIds.join() !== after.experienceIds.join()) diffs.push({ objectType: "Experience", objectId: before.id, field: `Day ${before.dayNumber} experience`, before: before.experienceIds.map((id) => catalog.experiences.find((item) => item.id === id)?.name ?? id).join(" · ") || "None", after: after.experienceIds.map((id) => catalog.experiences.find((item) => item.id === id)?.name ?? id).join(" · ") || "None" });
  }
  for (const replacement of bookingReplacements) {
    const before = trip.bookings.find((booking) => booking.id === replacement.bookingId)!;
    const after = replacement.replacement;
    if (before.itemId !== after.itemId) diffs.push({ objectType: "Booking", objectId: before.id, field: `${before.kind} booking`, before: before.itemId, after: after.itemId });
    if (before.scheduledAt !== after.scheduledAt) diffs.push({ objectType: "Booking", objectId: before.id, field: `${before.kind} time`, before: before.scheduledAt ?? "Not scheduled", after: after.scheduledAt ?? "Not scheduled" });
  }
  if (beforeMetrics.drivingMinutes !== afterMetrics.drivingMinutes) diffs.push({ objectType: "Trip", objectId: trip.id, field: "Driving time", before: durationLabel(beforeMetrics.drivingMinutes), after: `${durationLabel(afterMetrics.drivingMinutes)} · ${afterMetrics.drivingMinutes > beforeMetrics.drivingMinutes ? "+" : "−"}${Math.abs(afterMetrics.drivingMinutes - beforeMetrics.drivingMinutes)} min` });
  for (const risk of addedRisks) diffs.push({ objectType: "Risk", objectId: risk.id, field: "Risk level", before: `${event.severity.toLowerCase()} · unmitigated`, after: `${plan.riskLevel.toLowerCase().replace("_", "–")} · ${risk.title}` });
  if (nextPrice.total !== trip.price.total) diffs.push({ objectType: "Price", objectId: trip.id, field: "Estimated total", before: `¥${trip.price.total.toLocaleString("en-US")}`, after: `¥${nextPrice.total.toLocaleString("en-US")}` });

  const revision = trip.revision + 1;
  const changeId = `change-${event.id}-v${event.version}-r${revision}`;
  const decisionId = `decision-${event.id}-v${event.version}-r${revision}`;
  return {
    ...trip,
    status: "customized",
    revision,
    days: nextDays,
    bookings: nextBookings,
    risks: [...trip.risks.map((risk) => structuredClone(risk)), ...addedRisks],
    realityEvents: trip.realityEvents.map((item) => structuredClone(item)),
    price: nextPrice,
    changes: [...trip.changes.map((change) => structuredClone(change)), { id: changeId, tripId: trip.id, source: "reality-event", intent: `Selected candidate plan: ${plan.title}`, summary: `${event.title} · ${plan.title}`, appliedAt: decisionTime, eventId: event.id, eventVersion: event.version, decisionId, tripRevisionBefore: trip.revision, tripRevisionAfter: revision, diffs, priceDeltaCny: nextPrice.total - trip.price.total }],
    decisions: [...trip.decisions.map((decision) => structuredClone(decision)), { id: decisionId, eventId: event.id, eventVersion: event.version, impactAssessmentId: plan.impactAssessmentId, eventFingerprint: plan.eventFingerprint, catalogFingerprint: plan.catalogFingerprint, candidatePlanIds: candidatePlans.map((item) => item.id), candidatePlans: structuredClone(candidatePlans), selectedPlanId: plan.id, selectedPlan: structuredClone(plan), tripRevisionBefore: trip.revision, tripRevisionAfter: revision, tripChangeId: changeId, decisionTime }],
  };
}

const durationLabel = (minutes: number) => `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
