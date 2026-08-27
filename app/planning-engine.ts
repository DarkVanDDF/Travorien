import type {
  Booking,
  Catalog,
  ConversationMessage,
  ConversationTurnResult,
  HotelOffer,
  HotelSelection,
  PlanningSession,
  RoutePlan,
  Trip,
  TripDay,
  TripIntent,
  VehicleBooking,
  VehicleOffer,
  VehicleSelection,
} from "./domain.ts";
import { mockCatalog } from "./data/mock-data.ts";
import { hotelMediaFor, vehicleMediaFor } from "./data/media-catalog.ts";
import { intentToTraveler, mergeTripIntent } from "./intent-engine.ts";
import { createEmptyTripIntent } from "./intent-engine.ts";
import { calculatePrice, catalogSnapshotFingerprint } from "./trip-calculations.ts";
import { validateItineraryContinuity } from "./trip-engine.ts";
import type { PlanningSeed } from "./product-domain.ts";
import { signatureDrives } from "./data/product-content.ts";
import { prototypeDestinationFor } from "./data/prototype-map-data.ts";
import type { PrototypePlanningHandoff } from "./prototype-domain.ts";

const demo = "demo-mock" as const;
const addDays = (date: string, offset: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};
const normalizeTimestamp = (timestamp: string) => {
  const value = Date.parse(timestamp);
  return Number.isFinite(value) ? new Date(value).toISOString() : null;
};
const addMinutes = (timestamp: string, minutes: number) => new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
const isCalendarDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)
  && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
};
const unique = <T>(items: T[]) => [...new Set(items)];

export function createPlanningSession(intent: TripIntent, id = "planning-travorien-demo"): PlanningSession {
  return {
    id,
    revision: 1,
    stage: "DISCOVERY",
    plannedTripId: `trip-${stableHash(id)}`,
    intent: structuredClone(intent),
    conversation: [{ id: `${id}-hello`, role: "assistant", text: "Tell me the trip you have in mind — fragments are completely fine." }],
    routePlan: null,
    vehicleOffers: [],
    vehicleSelection: null,
    vehicleBooking: null,
    hotelDecision: "pending",
    hotelOffers: [],
    hotelSelection: null,
    provenance: demo,
  };
}

export function createPlanningSessionFromSeed(seed: PlanningSeed | PrototypePlanningHandoff, id = "planning-travorien-demo"): PlanningSession {
  if (seed.kind === "prototype-journey") {
    const readinessBlocked = seed.readiness && !["LIKELY_ELIGIBLE", "ACTION_REQUIRED"].includes(seed.readiness.status);
    const routeBlocked = !["Straightforward", "Preparation needed"].includes(seed.routeInsight.feasibility.level);
    const supportedDestinationIds = seed.destinationIds.filter((destinationId) => mockCatalog.destinations.some((destination) => destination.id === destinationId));
    const allDestinationsSupported = supportedDestinationIds.length === seed.destinationIds.length;
    const first = prototypeDestinationFor(seed.destinationIds[0]);
    const startDate = seed.readinessContext?.arrivalDate || "2026-10-10";
    const durationDays = seed.readinessContext?.stayDays ?? Math.max(5, seed.destinationIds.length * 2 + 1);
    const intent: TripIntent = {
      ...createEmptyTripIntent(),
      originCountry: seed.readinessContext?.nationality || null,
      travelers: 2,
      travelerType: null,
      arrivalCity: first?.name ?? null,
      destinationRegion: [...new Set(seed.destinationIds.map((destinationId) => prototypeDestinationFor(destinationId)?.region).filter(Boolean))].join(" · ") || null,
      startDate,
      endDate: addDays(startDate, durationDays - 1),
      durationDays,
      interests: [...new Set([...seed.interests, ...(seed.jobToBeDone ? [seed.jobToBeDone] : []), `planning:${seed.planningBehavior}`, ...(seed.season ? [`season:${seed.season}`] : [])])],
      budget: "mid-to-premium",
      travelPace: seed.planningBehavior === "detailed-planner" ? "balanced" : "relaxed",
      drivingPreference: "self-drive",
      vehiclePreference: "undecided",
      luggageCount: 2,
      crowdPreference: seed.interests.includes("quiet") ? "quiet" : "balanced",
      maxDailyDrivingMinutes: seed.maxDailyDrivingMinutes ?? 270,
      drivingLicenceStatus: seed.readinessContext?.hasValidForeignLicence === false ? "no-licence" : seed.readinessContext?.hasValidForeignLicence === true ? "valid-foreign-licence" : "unknown",
      accommodationPreference: null,
      unresolvedFields: ["travelerType", "vehiclePreference", "accommodationPreference"],
    };
    const session = createPlanningSession(intent, id);
    const routeNames = seed.destinationIds.map((destinationId) => prototypeDestinationFor(destinationId)?.name ?? destinationId).join(" → ");
    if (readinessBlocked || routeBlocked || !allDestinationsSupported) {
      const reason = readinessBlocked ? "driving readiness is unresolved" : routeBlocked ? "route feasibility is unresolved" : "this exact map route does not yet have transaction-ready demo inventory";
      return { ...session, conversation: [{ id: `${id}-hello`, role: "assistant", text: `I kept your exact ${routeNames} journey, your ${seed.planningBehavior.replaceAll("-", " ")} rhythm and daily-driving limit. I won’t substitute a Signature Drive or open inventory because ${reason}. We can keep refining it as an editorial journey.` }] };
    }
    const plan = planRoute(intent, seed.destinationIds);
    if (!plan) return { ...session, conversation: [{ id: `${id}-hello`, role: "assistant", text: `I kept your exact ${routeNames} journey and constraints, but the deterministic demo router cannot materialize it without breaking the daily-driving limit. I have not replaced it with another route.` }] };
    const proposed = applyPlanningAction(session, { type: "PROPOSE_ROUTE", baseRevision: session.revision, routePlan: { ...plan, rationale: [`Shared map anchors: ${routeNames}`, `Planning behavior: ${seed.planningBehavior.replaceAll("-", " ")}`, ...plan.rationale] } });
    return { ...proposed, conversation: [{ id: `${id}-hello`, role: "assistant", text: `Your shared ${routeNames} journey is now the planning authority. I kept the ${seed.planningBehavior.replaceAll("-", " ")} rhythm${seed.maxDailyDrivingMinutes ? ` and ${seed.maxDailyDrivingMinutes}-minute daily limit` : ""}; any operational intermediate stop is shown explicitly rather than silently replacing your map anchors.` }] };
  }
  if (seed.kind === "readiness" && !["LIKELY_ELIGIBLE", "ACTION_REQUIRED"].includes(seed.assessment.status)) {
    const session = createPlanningSession({ ...createEmptyTripIntent(), drivingLicenceStatus: seed.assessment.status === "NOT_ELIGIBLE" ? "no-licence" : "unknown" }, id);
    return { ...session, conversation: [{ id: `${id}-hello`, role: "assistant", text: `${seed.assessment.headline} I can keep exploring roads as inspiration, but I won’t create a self-drive route or booking journey until driving readiness is resolved.` }] };
  }
  const seededDriveId = seed.kind === "signature-drive" ? seed.driveId : seed.kind === "readiness" ? seed.selectedDriveId : undefined;
  if (!seededDriveId) {
    const session = createPlanningSession(createEmptyTripIntent(), id);
    if (seed.kind === "readiness") return { ...session, conversation: [{ id: `${id}-hello`, role: "assistant", text: `${seed.assessment.headline} I’ll carry that readiness context into route discovery without treating it as a permit approval.` }] };
    return session;
  }
  const drive = signatureDrives.find((item) => item.id === seededDriveId);
  if (!drive?.routeBinding || drive.transactionStatus !== "transaction-ready-demo") {
    const session = createPlanningSession(createEmptyTripIntent(), id);
    return { ...session, conversation: [{ id: `${id}-hello`, role: "assistant", text: "This Signature Drive is content-ready, but it has no transaction-ready route binding. I can discuss it without generating inventory." }] };
  }
  const variantId = seed.kind === "signature-drive" || seed.kind === "readiness" ? seed.variantId : undefined;
  const variant = variantId ? drive.alternativeVersions.find((item) => item.id === variantId && item.executable) : undefined;
  const durationDays = variant?.days ?? drive.recommendedDays;
  const requestedDestinationIds = variant?.stopIds ?? drive.routeBinding.destinationIds;
  const intent: TripIntent = {
    ...createEmptyTripIntent(), originCountry: "Germany", travelers: 2, travelerType: "couple", arrivalCity: "Kunming", destinationRegion: drive.region,
    startDate: "2026-10-10", endDate: addDays("2026-10-10", durationDays - 1), durationDays,
    interests: ["local culture", "food", "mountain scenery", "quiet villages"], budget: "mid-to-premium", travelPace: "relaxed",
    drivingPreference: "self-drive", vehiclePreference: "undecided", luggageCount: 2, crowdPreference: "quiet", maxDailyDrivingMinutes: 270,
    drivingLicenceStatus: "valid-foreign-licence", accommodationPreference: null, unresolvedFields: ["vehiclePreference", "accommodationPreference"],
  };
  const session = createPlanningSession(intent, id);
  const plan = planRoute(intent, requestedDestinationIds);
  if (!plan) return session;
  const proposed = applyPlanningAction(session, { type: "PROPOSE_ROUTE", baseRevision: session.revision, routePlan: plan });
  const readinessContext = seed.kind === "readiness" ? ` Your readiness result is carried with this plan: ${seed.assessment.headline} It remains guidance, not permit approval.` : "";
  return { ...proposed, conversation: [{ id: `${id}-hello`, role: "assistant", text: `I’ve opened the ${drive.name} ${variant ? `${variant.name} variant` : "signature route"} as a customizable ${durationDays}-day demo starting 10 October 2026. The route is structured; dates, pace, party and hotel choice can still change.${readinessContext}` }] };
}

export function retainPlanningSessionOnAiFailure(session: PlanningSession): PlanningSession {
  return session;
}

export function isCurrentPlanningResponse(current: PlanningSession, requested: PlanningSession) {
  return current.id === requested.id && current.revision === requested.revision;
}

export function resolveArrivalDestination(intent: TripIntent, catalog: Catalog = mockCatalog) {
  if (!intent.arrivalCity) return null;
  const normalized = intent.arrivalCity.trim().toLowerCase().replaceAll(" ", "-");
  return catalog.destinations.find((item) => item.id === normalized || item.name.toLowerCase() === intent.arrivalCity!.trim().toLowerCase()) ?? null;
}

const defaultWaypoints = (intent: TripIntent, arrivalId: string) => {
  const duration = intent.durationDays ?? 0;
  if (arrivalId === "kunming") {
    if (duration <= 5) return ["kunming", "chuxiong", "dali"];
    if (duration <= 7) return ["kunming", "dali", "shaxi", "lijiang"];
    return intent.crowdPreference === "quiet"
      ? ["kunming", "dali", "shaxi", "lijiang", "baishuitai", "shangri-la"]
      : ["kunming", "dali", "shaxi", "lijiang", "tiger-gorge", "shangri-la"];
  }
  if (arrivalId === "dali") return duration <= 5 ? ["dali", "shaxi", "lijiang"] : ["dali", "shaxi", "lijiang", "tiger-gorge", "shangri-la"];
  if (arrivalId === "shaxi") return ["shaxi", "lijiang", "tiger-gorge", "shangri-la"];
  if (arrivalId === "lijiang") return duration <= 4 ? ["lijiang", "shangri-la"] : ["lijiang", "tiger-gorge", "shangri-la"];
  return [arrivalId];
};

const findPath = (fromId: string, toId: string, maxMinutes: number, catalog: Catalog, excluded: Set<string>) => {
  const queue: Array<{ destinationId: string; routeIds: string[]; destinationIds: string[] }> = [{ destinationId: fromId, routeIds: [], destinationIds: [fromId] }];
  const visited = new Set([fromId]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.destinationId === toId) return current;
    for (const segment of catalog.routeSegments.filter((item) => item.fromDestinationId === current.destinationId && item.drivingMinutes <= maxMinutes)) {
      if (visited.has(segment.toDestinationId) || (excluded.has(segment.toDestinationId) && segment.toDestinationId !== toId)) continue;
      visited.add(segment.toDestinationId);
      queue.push({ destinationId: segment.toDestinationId, routeIds: [...current.routeIds, segment.id], destinationIds: [...current.destinationIds, segment.toDestinationId] });
    }
  }
  return null;
};

const experienceFor = (destinationId: string, interests: string[], used: Set<string>, catalog: Catalog) => {
  const normalized = interests.join(" ").toLowerCase();
  const preferredCategories = [
    /food|cook|market/.test(normalized) ? "food" : null,
    /mountain|nature|hike|lake|outdoor/.test(normalized) ? "nature" : null,
    /culture|town|history|local/.test(normalized) ? "culture" : null,
  ].filter(Boolean);
  return catalog.experiences.find((item) => item.destinationId === destinationId && !used.has(item.id) && preferredCategories.includes(item.category))
    ?? catalog.experiences.find((item) => item.destinationId === destinationId && !used.has(item.id));
};

export function planRoute(intent: TripIntent, proposedDestinationIds: string[] = [], catalog: Catalog = mockCatalog): RoutePlan | null {
  const arrival = resolveArrivalDestination(intent, catalog);
  if (!arrival || !intent.startDate || !intent.durationDays || intent.durationDays < 2) return null;
  if (!isCalendarDate(intent.startDate) || (intent.endDate !== null && !isCalendarDate(intent.endDate))) return null;
  if (intent.endDate && intent.endDate !== addDays(intent.startDate, intent.durationDays - 1)) return null;
  const maxMinutes = intent.maxDailyDrivingMinutes ?? (intent.travelPace === "relaxed" ? 180 : intent.travelPace === "fast" ? 300 : 240);
  const proposed = proposedDestinationIds.map((item) => item.trim()).filter(Boolean);
  if (proposed.length !== unique(proposed).length || proposed.some((id) => !catalog.destinations.some((item) => item.id === id))) return null;
  const waypoints = proposed.length ? (proposed[0] === arrival.id ? proposed : [arrival.id, ...proposed]) : defaultWaypoints(intent, arrival.id);
  if (waypoints.length !== unique(waypoints).length) return null;

  const destinationIds = [arrival.id];
  const routeSegmentIds: string[] = [];
  const excluded = new Set([arrival.id]);
  for (let index = 1; index < waypoints.length; index += 1) {
    const path = findPath(destinationIds.at(-1)!, waypoints[index], maxMinutes, catalog, excluded);
    if (!path) return null;
    routeSegmentIds.push(...path.routeIds);
    for (const id of path.destinationIds.slice(1)) {
      if (excluded.has(id)) return null;
      destinationIds.push(id);
      excluded.add(id);
    }
  }
  if (destinationIds.length > intent.durationDays) return null;

  const extraDays = intent.durationDays - destinationIds.length;
  const restCounts = Array.from({ length: destinationIds.length }, () => 0);
  const restOrder = intent.travelPace === "relaxed"
    ? [...destinationIds.keys()].slice(1).concat(0)
    : [...destinationIds.keys()].reverse();
  for (let index = 0; index < extraDays; index += 1) restCounts[restOrder[index % restOrder.length]] += 1;

  const days: TripDay[] = [];
  const usedExperiences = new Set<string>();
  let routeIndex = 0;
  for (let destinationIndex = 0; destinationIndex < destinationIds.length; destinationIndex += 1) {
    const destinationId = destinationIds[destinationIndex];
    const destination = catalog.destinations.find((item) => item.id === destinationId)!;
    const routeIds = destinationIndex === 0 ? [] : [routeSegmentIds[routeIndex++]];
    const experience = experienceFor(destinationId, intent.interests, usedExperiences, catalog);
    if (experience) usedExperiences.add(experience.id);
    const dayNumber = days.length + 1;
    days.push({
      id: `day-${dayNumber}`,
      dayNumber,
      date: addDays(intent.startDate, dayNumber - 1),
      destinationId,
      title: destinationIndex === 0 ? `Arrive gently in ${destination.name}` : `Open road to ${destination.name}`,
      routeSegmentIds: routeIds,
      experienceIds: experience ? [experience.id] : [],
      notes: destinationIndex === 0 ? `Vehicle pickup and an easy first look at ${destination.name}.` : catalog.routeSegments.find((item) => item.id === routeIds[0])?.notes ?? destination.summary,
    });
    for (let rest = 0; rest < restCounts[destinationIndex]; rest += 1) {
      const restExperience = experienceFor(destinationId, intent.interests, usedExperiences, catalog);
      if (restExperience) usedExperiences.add(restExperience.id);
      const restDayNumber = days.length + 1;
      days.push({
        id: `day-${restDayNumber}`,
        dayNumber: restDayNumber,
        date: addDays(intent.startDate, restDayNumber - 1),
        destinationId,
        title: `${destination.name}, without a timetable`,
        routeSegmentIds: [],
        experienceIds: restExperience ? [restExperience.id] : [],
        notes: `A keys-down day shaped around ${intent.interests.slice(0, 2).join(" and ").toLowerCase() || "local discovery"}.`,
      });
    }
  }
  const traveler = intentToTraveler(intent);
  if (!traveler || !validateItineraryContinuity({ traveler }, days, catalog)) return null;
  const segments = routeSegmentIds.map((id) => catalog.routeSegments.find((item) => item.id === id)!);
  const finalDestination = catalog.destinations.find((item) => item.id === destinationIds.at(-1))!;
  const routeFingerprint = stableHash(JSON.stringify({ intent, destinationIds, routeSegmentIds, catalog: catalogSnapshotFingerprint(catalog) }));
  return {
    id: `route-plan-${routeFingerprint}`,
    title: `${arrival.name} to ${finalDestination.name}`,
    summary: `${days.length} days across ${destinationIds.length} Yunnan stops, with every drive kept within ${Math.round(maxMinutes / 60 * 10) / 10} hours.`,
    destinationIds,
    routeSegmentIds,
    days,
    startDate: intent.startDate,
    endDate: addDays(intent.startDate, days.length - 1),
    distanceKm: segments.reduce((sum, item) => sum + item.distanceKm, 0),
    drivingMinutes: segments.reduce((sum, item) => sum + item.drivingMinutes, 0),
    longestDrivingMinutes: Math.max(0, ...segments.map((item) => item.drivingMinutes)),
    rationale: [
      proposed.length ? "Validated the AI-proposed destination sequence against the directed demo route graph." : "Selected a deterministic route shape from arrival city, duration, pace, and crowd preference.",
      `Allocated ${extraDays} keys-down day${extraDays === 1 ? "" : "s"} without inventing disconnected travel.`,
      "All distances and driving times come from the local demo catalog.",
    ],
    provenance: demo,
  };
}

const vehicleCategory = (category: string): VehicleOffer["category"] => {
  const value = category.toLowerCase();
  if (value.includes("mpv")) return "mpv";
  if (value.includes("compact")) return "compact";
  if (value.includes("sedan") && value.includes("premium")) return "premium";
  if (value.includes("sedan")) return "sedan";
  if (value.includes("premium") || value.includes("luxury")) return "premium";
  return "suv";
};

const vehicleQuery = (intent: TripIntent, routePlan: RoutePlan, catalog: Catalog) => stableHash(JSON.stringify({
  travelers: intent.travelers,
  luggage: intent.luggageCount,
  budget: intent.budget,
  preference: intent.vehiclePreference,
  routePlanId: routePlan.id,
  catalog: catalogSnapshotFingerprint(catalog),
}));

export function generateVehicleOffers(intent: TripIntent, routePlan: RoutePlan, catalog: Catalog = mockCatalog, quotedAt = new Date().toISOString()): VehicleOffer[] {
  const normalizedQuotedAt = normalizeTimestamp(quotedAt);
  if (!normalizedQuotedAt) return [];
  const queryFingerprint = vehicleQuery(intent, routePlan, catalog);
  const snapshotFingerprint = stableHash(`${queryFingerprint}:${normalizedQuotedAt}`);
  const snapshotId = `vehicle-snapshot-${snapshotFingerprint}`;
  const rentalDays = routePlan.days.length;
  const luggage = intent.luggageCount ?? Math.min(intent.travelers ?? 1, 2);
  const travelers = intent.travelers ?? 1;
  const highland = routePlan.destinationIds.some((id) => (catalog.destinations.find((item) => item.id === id)?.elevationMeters ?? 0) >= 2800);
  const budgetTarget = intent.budget === "budget" ? 420 : intent.budget === "mid-range" ? 560 : intent.budget === "premium" ? 950 : 720;
  const parkingPriority = intent.vehiclePreference === "compact" || intent.interests.some((item) => /easy parking|city|compact/i.test(item));
  const validUntil = addMinutes(normalizedQuotedAt, 30);
  const pickupDestination = catalog.destinations.find((item) => item.id === routePlan.destinationIds[0]);
  const dropoffDestination = catalog.destinations.find((item) => item.id === routePlan.destinationIds.at(-1));
  const ranked = catalog.vehicles
    .filter((item) => item.seats >= travelers && item.luggage >= luggage)
    .map((item) => {
      const category = vehicleCategory(item.category);
      const media = vehicleMediaFor(item.id)!;
      let score = 100 - Math.abs(item.dailyPriceCny - budgetTarget) / 8 + (item.luggage - luggage) * 7;
      if (intent.vehiclePreference && intent.vehiclePreference !== "undecided") score += category === intent.vehiclePreference ? 60 : -10;
      if (highland) score += category === "suv" ? 35 : category === "premium" ? 22 : category === "compact" ? -35 : 0;
      if (parkingPriority) score += category === "compact" ? 45 : category === "premium" || category === "mpv" ? -25 : 0;
      if (intent.budget === "budget") score -= Math.max(0, item.dailyPriceCny - 450) / 4;
      const recommendation = item.luggage === luggage
        ? `Fits ${luggage} bag${luggage === 1 ? "" : "s"} with no spare luggage capacity.`
        : highland && (category === "suv" || category === "premium")
          ? "Strong fit for the route’s mountain roads and elevation changes."
          : parkingPriority && category === "compact"
            ? "Best fit for easy parking and lower daily cost."
            : "Balanced passenger space, luggage capacity and demo price.";
      const recommendationReasons = [
        highland && (category === "suv" || category === "premium") ? "Higher-clearance category suits the route's highland finish." : null,
        parkingPriority && category === "compact" ? "Compact footprint supports the stated easy-parking preference." : null,
        item.luggage > luggage ? `Space for ${item.luggage - luggage} bag${item.luggage - luggage === 1 ? "" : "s"} beyond the stated luggage.` : `Exact fit for ${luggage} bag${luggage === 1 ? "" : "s"}.`,
        `${routePlan.distanceKm} km across ${routePlan.days.length} structured days.`,
      ].filter(Boolean) as string[];
      return {
        id: `vehicle-offer-${item.id}-${snapshotFingerprint}`,
        snapshotId,
        queryFingerprint,
        vehicleId: item.id,
        model: item.name,
        primaryImage: media.primaryImage,
        gallery: media.gallery,
        imageProvenance: media,
        supplierName: "Travorien Yunnan Mobility · demo supplier",
        source: "Travorien demo-mock supplier inventory",
        category,
        transmission: item.transmission,
        seats: item.seats,
        luggage: item.luggage,
        doors: item.doors,
        fuelType: item.fuelType,
        pickupLocation: `${pickupDestination?.name ?? routePlan.destinationIds[0]} arrival pickup · demo`,
        dropoffLocation: `${dropoffDestination?.name ?? routePlan.destinationIds.at(-1)} city drop-off · demo`,
        pickupDateTime: `${routePlan.startDate}T10:00:00+08:00`,
        dropoffDateTime: `${routePlan.endDate}T18:00:00+08:00`,
        currency: "CNY" as const,
        dailyPriceCny: item.dailyPriceCny,
        totalPriceCny: item.dailyPriceCny * rentalDays,
        rentalDays,
        available: true as const,
        availability: "available-demo" as const,
        validUntil,
        rank: 0,
        score: Math.round(score),
        recommendation,
        recommendationReasons,
        inclusions: ["Automatic transmission", "Unlimited demo mileage", "English pickup briefing", "24/7 demo road support"],
        terms: ["Demo-mock availability", "No payment collected", "Temporary permit approval remains external"],
        cancellationPolicy: "Free cancellation until 48 hours before demo pickup",
        mileagePolicy: "Unlimited demo mileage",
        depositCny: category === "premium" ? 4000 : category === "mpv" ? 3500 : 2000,
        basicCoverage: "Basic demo coverage included",
        provenance: demo,
      };
    })
    .sort((left, right) => right.score - left.score || left.totalPriceCny - right.totalPriceCny);
  const categoryLeaders = unique(ranked.map((item) => item.category)).map((category) => ranked.find((item) => item.category === category)!).filter(Boolean);
  const selected = unique([...categoryLeaders, ...ranked].map((item) => item.id)).map((id) => ranked.find((item) => item.id === id)!).slice(0, 6);
  return selected.map((item, index) => ({ ...item, rank: index + 1 }));
}

const sameVehicleAuthority = (stored: VehicleOffer, canonical: VehicleOffer) => [
  "id", "snapshotId", "queryFingerprint", "vehicleId", "model", "primaryImage", "supplierName", "source", "category", "transmission", "seats", "luggage", "doors", "fuelType", "pickupLocation", "dropoffLocation", "pickupDateTime", "dropoffDateTime", "dailyPriceCny", "totalPriceCny", "rentalDays", "available", "availability", "currency", "validUntil", "cancellationPolicy", "mileagePolicy", "depositCny", "basicCoverage",
].every((key) => stored[key as keyof VehicleOffer] === canonical[key as keyof VehicleOffer])
  && JSON.stringify(stored.imageProvenance) === JSON.stringify(canonical.imageProvenance)
  && JSON.stringify(stored.gallery) === JSON.stringify(canonical.gallery);

export function reserveVehicle(session: PlanningSession, selection: VehicleSelection, idempotencyKey: string, now = new Date().toISOString(), catalog: Catalog = mockCatalog): VehicleBooking | null {
  if (session.vehicleBooking) return session.vehicleBooking.idempotencyKey === idempotencyKey ? session.vehicleBooking : null;
  if (session.stage !== "VEHICLE_RESERVATION" || !session.routePlan || !idempotencyKey.trim()) return null;
  const stored = session.vehicleOffers.find((item) => item.id === selection.offerId && item.snapshotId === selection.snapshotId);
  const validUntil = stored ? normalizeTimestamp(stored.validUntil) : null;
  const normalizedNow = normalizeTimestamp(now);
  if (!stored || !validUntil || !normalizedNow || Date.parse(validUntil) <= Date.parse(normalizedNow)) return null;
  const quotedAt = addMinutes(validUntil, -30);
  const canonical = generateVehicleOffers(session.intent, session.routePlan, catalog, quotedAt).find((item) => item.id === selection.offerId && item.snapshotId === selection.snapshotId);
  if (!canonical || !sameVehicleAuthority(stored, canonical)) return null;
  return {
    id: `booking-vehicle-${stableHash(`${session.plannedTripId}:${idempotencyKey}`)}`,
    tripId: session.plannedTripId,
    kind: "vehicle",
    itemId: canonical.vehicleId,
    status: "confirmed",
    amountCny: canonical.totalPriceCny,
    dayId: session.routePlan.days[0]?.id,
    scheduledAt: `${session.routePlan.startDate}T10:00:00+08:00`,
    notes: "Confirmed local demo reservation; no live supplier hold or payment.",
    provenance: demo,
    offerId: canonical.id,
    snapshotId: canonical.snapshotId,
    reservationCode: `TVR-${stableHash(canonical.id).toUpperCase()}`,
    idempotencyKey,
    reservedAt: now,
    pickupLocation: canonical.pickupLocation,
    dropoffLocation: canonical.dropoffLocation,
    pickupDateTime: canonical.pickupDateTime,
    dropoffDateTime: canonical.dropoffDateTime,
    currency: canonical.currency,
    supplierName: canonical.supplierName,
    source: canonical.source,
    cancellationPolicy: canonical.cancellationPolicy,
  };
}

const hotelQuery = (intent: TripIntent, routePlan: RoutePlan, catalog: Catalog) => stableHash(JSON.stringify({
  preference: intent.accommodationPreference,
  routePlanId: routePlan.id,
  hotels: catalog.hotels,
}));

export function generateHotelOffers(intent: TripIntent, routePlan: RoutePlan, catalog: Catalog = mockCatalog, quotedAt = new Date().toISOString()): HotelOffer[] {
  const normalizedQuotedAt = normalizeTimestamp(quotedAt);
  if (!normalizedQuotedAt) return [];
  const queryFingerprint = hotelQuery(intent, routePlan, catalog);
  const snapshotFingerprint = stableHash(`${queryFingerprint}:${normalizedQuotedAt}`);
  const snapshotId = `hotel-snapshot-${snapshotFingerprint}`;
  const validUntil = addMinutes(normalizedQuotedAt, 30);
  const roomCount = Math.max(1, Math.ceil((intent.travelers ?? 1) / 2));
  return routePlan.days.slice(0, -1).flatMap((day) => {
    const ranked = catalog.hotels.filter((item) => item.destinationId === day.destinationId).map((item) => {
      let score = item.rating * 20;
      const arrivalDriveMinutes = day.routeSegmentIds.reduce((sum, id) => sum + (catalog.routeSegments.find((segment) => segment.id === id)?.drivingMinutes ?? 0), 0);
      const style = item.style.toLowerCase();
      if (intent.accommodationPreference === "local-character" && /heritage|courtyard|local|restored|tea horse|tibetan|village/.test(style)) score += 28;
      if (intent.accommodationPreference === "premium") score += item.nightlyPriceCny / 45;
      if (intent.accommodationPreference === "budget") score -= item.nightlyPriceCny / 25;
      if (intent.accommodationPreference === "comfort") score -= Math.abs(item.nightlyPriceCny - 800) / 30;
      if (item.parkingType === "on-site") score += 24;
      else if (item.parkingType === "nearby-lot") score += 8;
      else if (item.parkingType === "unknown") score -= 18;
      if (item.routeConvenience === "high") score += 18;
      if (arrivalDriveMinutes >= 150 && item.lateArrivalSuitability === "strong") score += 26;
      if (arrivalDriveMinutes >= 150 && item.lateArrivalSuitability === "limited") score -= 12;
      if (arrivalDriveMinutes >= 150 && item.lateArrivalSuitability === "unknown") score -= 20;
      return { item, score };
    }).sort((left, right) => right.score - left.score || left.item.nightlyPriceCny - right.item.nightlyPriceCny).slice(0, 3);
    return ranked.map(({ item, score }, index) => ({
      ...(() => { const media = hotelMediaFor(item.id)!; return { primaryImage: media.primaryImage, imageProvenance: media }; })(),
      id: `hotel-offer-${day.id}-${item.id}-${snapshotFingerprint}`,
      snapshotId,
      hotelId: item.id,
      dayId: day.id,
      date: day.date,
      destinationId: day.destinationId,
      supplierName: "Travorien Stays · demo supplier",
      source: "Travorien demo-mock stay inventory",
      roomCount,
      roomType: `${roomCount} ${roomCount === 1 ? "room" : "rooms"} · double/twin demo allocation`,
      mealPlan: "Breakfast included · demo",
      cancellationPolicy: "Free cancellation until 72 hours before the demo night",
      amenities: item.amenities,
      currency: "CNY" as const,
      roomRateCny: item.nightlyPriceCny,
      nightlyPriceCny: item.nightlyPriceCny * roomCount,
      available: true as const,
      validUntil,
      rank: index + 1,
      score: Math.round(score),
      recommendation: index === 0 ? `Best ${intent.accommodationPreference?.replace("-", " ") ?? "balanced"} fit in ${catalog.destinations.find((destination) => destination.id === day.destinationId)?.name}.` : "A valid alternative for this exact destination and night.",
      parkingType: item.parkingType,
      parkingDistanceMeters: item.parkingDistanceMeters,
      lateArrivalSuitability: item.lateArrivalSuitability,
      vehicleAccess: item.vehicleAccess,
      oldTownAccessMinutes: item.oldTownAccessMinutes,
      routeConvenience: item.routeConvenience,
      terms: ["Demo-mock availability", "Selection only — no hotel reservation or payment"],
      provenance: demo,
    }));
  });
}

const sameHotelAuthority = (stored: HotelOffer, canonical: HotelOffer) => [
  "id", "snapshotId", "hotelId", "primaryImage", "dayId", "date", "destinationId", "supplierName", "source", "roomCount", "roomType", "mealPlan", "cancellationPolicy", "roomRateCny", "nightlyPriceCny", "available", "currency", "validUntil", "parkingType", "parkingDistanceMeters", "lateArrivalSuitability", "vehicleAccess", "oldTownAccessMinutes", "routeConvenience",
].every((key) => stored[key as keyof HotelOffer] === canonical[key as keyof HotelOffer])
  && JSON.stringify(stored.imageProvenance) === JSON.stringify(canonical.imageProvenance)
  && JSON.stringify(stored.amenities) === JSON.stringify(canonical.amenities);

export function validateHotelSelection(session: PlanningSession, selection: HotelSelection, now = new Date().toISOString(), catalog: Catalog = mockCatalog) {
  if (!session.routePlan) return false;
  const normalizedNow = normalizeTimestamp(now);
  if (!normalizedNow) return false;
  if (selection.decision === "skipped") return selection.selectedOfferIds.length === 0 && selection.snapshotId === null;
  const expectedNightIds = session.routePlan.days.slice(0, -1).map((day) => day.id);
  if (selection.selectedOfferIds.length !== expectedNightIds.length || new Set(selection.selectedOfferIds).size !== selection.selectedOfferIds.length) return false;
  const offers = selection.selectedOfferIds.map((id) => session.hotelOffers.find((offer) => offer.id === id));
  if (offers.some((offer) => {
    if (!offer || offer.snapshotId !== selection.snapshotId) return true;
    const validUntil = normalizeTimestamp(offer.validUntil);
    return !validUntil || Date.parse(validUntil) <= Date.parse(normalizedNow);
  })) return false;
  if (new Set(offers.map((offer) => offer!.dayId)).size !== expectedNightIds.length || !expectedNightIds.every((id) => offers.some((offer) => offer!.dayId === id))) return false;
  return offers.every((offer) => {
    const validUntil = normalizeTimestamp(offer!.validUntil);
    if (!validUntil) return false;
    const quotedAt = addMinutes(validUntil, -30);
    const canonical = generateHotelOffers(session.intent, session.routePlan!, catalog, quotedAt).find((item) => item.id === offer!.id && item.snapshotId === offer!.snapshotId);
    return Boolean(canonical && sameHotelAuthority(offer!, canonical));
  });
}

type PlanningAction =
  | { type: "ADD_USER_MESSAGE"; message: ConversationMessage }
  | { type: "APPLY_CONVERSATION_RESULT"; baseRevision: number; result: ConversationTurnResult; assistantMessage: ConversationMessage }
  | { type: "PROPOSE_ROUTE"; baseRevision: number; routePlan: RoutePlan }
  | { type: "CONFIRM_ROUTE"; baseRevision: number; offers: VehicleOffer[] }
  | { type: "REFRESH_VEHICLE_OFFERS"; baseRevision: number; offers: VehicleOffer[] }
  | { type: "RETURN_TO_VEHICLE_SELECTION"; baseRevision: number; offers: VehicleOffer[] }
  | { type: "SELECT_VEHICLE"; baseRevision: number; selection: VehicleSelection }
  | { type: "CONFIRM_VEHICLE_BOOKING"; baseRevision: number; booking: VehicleBooking }
  | { type: "CHOOSE_HOTELS"; baseRevision: number; decision: "yes" | "skip"; offers?: HotelOffer[] }
  | { type: "REFRESH_HOTEL_OFFERS"; baseRevision: number; offers: HotelOffer[] }
  | { type: "COMPLETE_HOTELS"; baseRevision: number; selection: HotelSelection };

const conversationalPatchForStage = (stage: PlanningSession["stage"], patch: Partial<TripIntent>): Partial<TripIntent> => {
  if (stage === "VEHICLE_SELECTION") {
    return {
      vehiclePreference: patch.vehiclePreference,
      luggageCount: patch.luggageCount,
      budget: patch.budget,
      interests: patch.interests,
    };
  }
  if (stage === "HOTEL_SELECTION") return { accommodationPreference: patch.accommodationPreference };
  return patch;
};

export function applyPlanningAction(session: PlanningSession, action: PlanningAction): PlanningSession {
  if ("baseRevision" in action && action.baseRevision !== session.revision) return session;
  if (action.type === "ADD_USER_MESSAGE") {
    if (!["DISCOVERY", "ROUTE_PROPOSAL", "VEHICLE_SELECTION", "HOTEL_SELECTION"].includes(session.stage) || action.message.role !== "user") return session;
    return { ...session, revision: session.revision + 1, conversation: [...session.conversation, structuredClone(action.message)] };
  }
  if (action.type === "APPLY_CONVERSATION_RESULT") {
    if (!["DISCOVERY", "ROUTE_PROPOSAL", "VEHICLE_SELECTION", "HOTEL_SELECTION"].includes(session.stage) || action.assistantMessage.role !== "assistant") return session;
    const patch = conversationalPatchForStage(session.stage, action.result.extractedFields);
    return { ...session, revision: session.revision + 1, intent: mergeTripIntent(session.intent, patch), conversation: [...session.conversation, structuredClone(action.assistantMessage)] };
  }
  if (action.type === "PROPOSE_ROUTE") {
    if (session.stage !== "DISCOVERY" && session.stage !== "ROUTE_PROPOSAL") return session;
    return { ...session, revision: session.revision + 1, stage: "ROUTE_PROPOSAL", routePlan: structuredClone(action.routePlan), vehicleOffers: [], vehicleSelection: null, vehicleBooking: null, hotelDecision: "pending", hotelOffers: [], hotelSelection: null };
  }
  if (action.type === "CONFIRM_ROUTE") {
    if (session.stage !== "ROUTE_PROPOSAL" || !session.routePlan || !action.offers.length) return session;
    return { ...session, revision: session.revision + 1, stage: "VEHICLE_SELECTION", vehicleOffers: structuredClone(action.offers) };
  }
  if (action.type === "REFRESH_VEHICLE_OFFERS") {
    if (session.stage !== "VEHICLE_SELECTION" || !session.routePlan) return session;
    return { ...session, revision: session.revision + 1, vehicleOffers: structuredClone(action.offers), vehicleSelection: null };
  }
  if (action.type === "RETURN_TO_VEHICLE_SELECTION") {
    if (session.stage !== "VEHICLE_RESERVATION" || !session.routePlan || !action.offers.length) return session;
    return { ...session, revision: session.revision + 1, stage: "VEHICLE_SELECTION", vehicleOffers: structuredClone(action.offers), vehicleSelection: null };
  }
  if (action.type === "SELECT_VEHICLE") {
    if (session.stage !== "VEHICLE_SELECTION" || !session.vehicleOffers.some((offer) => offer.id === action.selection.offerId && offer.snapshotId === action.selection.snapshotId)) return session;
    return { ...session, revision: session.revision + 1, stage: "VEHICLE_RESERVATION", vehicleSelection: structuredClone(action.selection) };
  }
  if (action.type === "CONFIRM_VEHICLE_BOOKING") {
    if (session.stage !== "VEHICLE_RESERVATION" || !session.vehicleSelection || action.booking.offerId !== session.vehicleSelection.offerId || action.booking.snapshotId !== session.vehicleSelection.snapshotId || action.booking.tripId !== session.plannedTripId) return session;
    return { ...session, revision: session.revision + 1, stage: "HOTEL_UPSELL", vehicleBooking: structuredClone(action.booking) };
  }
  if (action.type === "CHOOSE_HOTELS") {
    if (session.stage !== "HOTEL_UPSELL" || !session.vehicleBooking) return session;
    if (action.decision === "skip") return { ...session, revision: session.revision + 1, stage: "TRIP_READY", hotelDecision: "skip", hotelOffers: [], hotelSelection: { decision: "skipped", selectedOfferIds: [], snapshotId: null } };
    return { ...session, revision: session.revision + 1, stage: "HOTEL_SELECTION", hotelDecision: "yes", hotelOffers: structuredClone(action.offers ?? []) };
  }
  if (action.type === "REFRESH_HOTEL_OFFERS") {
    if (session.stage !== "HOTEL_SELECTION" || !session.routePlan || !action.offers.length) return session;
    return { ...session, revision: session.revision + 1, hotelOffers: structuredClone(action.offers), hotelSelection: null };
  }
  if (action.type === "COMPLETE_HOTELS") {
    if (session.stage !== "HOTEL_SELECTION" || action.selection.decision !== "selected" || !validateHotelSelection(session, action.selection)) return session;
    return { ...session, revision: session.revision + 1, stage: "TRIP_READY", hotelSelection: structuredClone(action.selection) };
  }
  return session;
}

export function materializePlanningTrip(session: PlanningSession, catalog: Catalog = mockCatalog): Trip | null {
  if (session.stage !== "TRIP_READY" || !session.routePlan || !session.vehicleBooking || !session.hotelSelection) return null;
  const traveler = intentToTraveler(session.intent);
  const vehicle = catalog.vehicles.find((item) => item.id === session.vehicleBooking!.itemId);
  if (!traveler || !vehicle || session.vehicleBooking.amountCny !== vehicle.dailyPriceCny * session.routePlan.days.length) return null;
  const expectedEndDate = addDays(session.routePlan.startDate, session.routePlan.days.length - 1);
  const calendarCoherent = traveler.startDate === session.routePlan.startDate
    && traveler.endDate === session.routePlan.endDate
    && session.routePlan.endDate === expectedEndDate
    && session.routePlan.days.every((day, index) => day.dayNumber === index + 1 && day.date === addDays(session.routePlan!.startDate, index))
    && traveler.arrivalCityId === session.routePlan.destinationIds[0]
    && session.vehicleBooking.pickupDateTime.startsWith(`${session.routePlan.startDate}T`)
    && session.vehicleBooking.dropoffDateTime.startsWith(`${session.routePlan.endDate}T`)
    && session.vehicleBooking.scheduledAt === session.vehicleBooking.pickupDateTime;
  if (!calendarCoherent) return null;
  if (!validateItineraryContinuity({ traveler }, session.routePlan.days, catalog)) return null;
  const selectedHotelOffers = session.hotelSelection.decision === "selected"
    ? session.hotelSelection.selectedOfferIds.map((id) => session.hotelOffers.find((offer) => offer.id === id))
    : [];
  if (selectedHotelOffers.some((offer) => !offer)) return null;
  const days = session.routePlan.days.map((day) => {
    const offer = selectedHotelOffers.find((item) => item?.dayId === day.id);
    return { ...structuredClone(day), ...(offer ? { hotelId: offer.hotelId } : {}) };
  });
  const hotelBookings: Booking[] = selectedHotelOffers.map((offer) => ({
    id: `booking-hotel-${offer!.dayId}`,
    tripId: session.plannedTripId,
    kind: "hotel",
    itemId: offer!.hotelId,
    status: "selected",
    amountCny: offer!.nightlyPriceCny,
    dayId: offer!.dayId,
    notes: "Selected demo stay; no live supplier reservation or payment.",
    provenance: demo,
  }));
  const permitRequirementId = traveler.nationality.toLowerCase() === "germany" ? "permit-germany-demo" : "permit-generic-demo";
  const arrivalBooking: Booking = {
    id: "booking-arrival-flight",
    tripId: session.plannedTripId,
    kind: "flight",
    itemId: `flight-arrival-${traveler.arrivalCityId}-demo`,
    status: "selected",
    amountCny: 0,
    dayId: days[0].id,
    scheduledAt: `${traveler.startDate}T08:30:00+08:00`,
    notes: "Demo arrival reference; no live flight data.",
    provenance: demo,
  };
  const trip: Trip = {
    id: session.plannedTripId,
    title: session.routePlan.title,
    status: "ready",
    revision: 1,
    traveler: structuredClone(traveler),
    vehicleId: vehicle.id,
    vehicleBookingId: session.vehicleBooking.id,
    planningSessionId: session.id,
    permitRequirementId,
    days,
    bookings: [arrivalBooking, structuredClone(session.vehicleBooking), ...hotelBookings],
    risks: [
      ...(session.routePlan.destinationIds.some((id) => (catalog.destinations.find((item) => item.id === id)?.elevationMeters ?? 0) >= 3000) ? [{ id: `risk-altitude-${session.plannedTripId}`, tripId: session.plannedTripId, severity: "medium" as const, category: "altitude" as const, title: "Highland elevation", mitigation: "Gradual ascent, hydration reminders and a light first evening at altitude." }] : []),
      { id: `risk-permit-${session.plannedTripId}`, tripId: session.plannedTripId, severity: "low", category: "permit", title: "Temporary permit required", mitigation: "Document checklist and in-person handoff guidance included." },
    ],
    realityEvents: [],
    decisions: [],
    changes: [],
    price: { currency: "CNY", vehicle: 0, hotels: 0, experiences: 0, permitAssistance: 0, roadSupport: 0, total: 0 },
    provenance: demo,
  };
  trip.price = calculatePrice(trip, catalog);
  return trip;
}
