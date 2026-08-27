import type { Trip } from "../../../domain.ts";
import { GeminiServiceError, requestGeminiStructuredOutput } from "../../../ai/gemini-server";
import { manualRealitySignalAdapter } from "../../../reality-adapters.ts";
import { compileRealitySignal } from "../../../reality-engine.ts";
import { mockCatalog } from "../../../data/mock-data.ts";

const nextDate = (date: string) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
};

const isDemoTrip = (value: unknown): value is Trip => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const trip = value as Partial<Trip>;
  if (typeof trip.id !== "string" || !Number.isInteger(trip.revision) || !trip.traveler || !Array.isArray(trip.days) || !Array.isArray(trip.bookings)) return false;
  if (trip.provenance !== "demo-mock" || !trip.days.length) return false;
  if (!trip.days.every((day) => typeof day.id === "string" && typeof day.date === "string" && mockCatalog.destinations.some((item) => item.id === day.destinationId) && day.routeSegmentIds.every((id) => mockCatalog.routeSegments.some((item) => item.id === id)) && (!day.hotelId || mockCatalog.hotels.some((item) => item.id === day.hotelId)))) return false;
  return trip.bookings.every((booking) => booking.tripId === trip.id && booking.provenance === "demo-mock");
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: unknown; observedAt?: unknown; trip?: unknown };
    if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000) return Response.json({ error: { code: "INVALID_REQUEST", message: "Please report one short travel issue." } }, { status: 400 });
    if (!isDemoTrip(body.trip)) return Response.json({ error: { code: "INVALID_REQUEST", message: "A valid current demo Trip is required." } }, { status: 400 });
    const trip = body.trip;
    const observedAt = typeof body.observedAt === "string" && Number.isFinite(Date.parse(body.observedAt)) ? body.observedAt : new Date().toISOString();
    const routeIds = [...new Set(trip.days.flatMap((day) => day.routeSegmentIds))];
    const destinationIds = [...new Set(trip.days.map((day) => day.destinationId))];
    const hotelIds = [...new Set(trip.days.map((day) => day.hotelId).filter((id): id is string => Boolean(id)))];
    const flightBookingIds = trip.bookings.filter((item) => item.kind === "flight").map((item) => item.id);
    const targetIds = [...new Set([...destinationIds, ...routeIds, ...hotelIds, ...flightBookingIds])];
    if (!targetIds.length) return Response.json({ error: { code: "INVALID_REQUEST", message: "This Trip has no supported Reality targets." } }, { status: 400 });
    const manualEventSchema = {
      type: "object",
      additionalProperties: false,
      properties: {
        eventType: { type: "string", enum: ["WEATHER_RISK", "ROAD_CLOSURE", "HOTEL_UNAVAILABLE", "FLIGHT_DELAY"] },
        targetId: { type: "string", enum: targetIds },
        title: { type: "string" },
        description: { type: "string" },
        severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        delayMinutes: { type: ["integer", "null"], minimum: 1, maximum: 1440 },
      },
      required: ["eventType", "targetId", "title", "description", "severity", "confidence", "delayMinutes"],
    };
    const prompt = `Interpret one manual demo reality signal for Travorien's CURRENT structured Trip.
Return only the requested schema. Choose exactly one target ID from the supplied Trip:
- WEATHER_RISK => a destination ID
- ROAD_CLOSURE => a route segment ID
- HOTEL_UNAVAILABLE => a hotel ID
- FLIGHT_DELAY => a flight booking ID
For flight delay, extract delayMinutes; otherwise return null. Do not determine affected objects, candidate plans, prices, or mutations.

TRIP TARGETS:
destinations: ${destinationIds.join(", ") || "none"}
routes: ${routeIds.join(", ") || "none"}
hotels: ${hotelIds.join(", ") || "none"}
flight bookings: ${flightBookingIds.join(", ") || "none"}

MANUAL REPORT:
${body.message.trim()}`;
    const raw = await requestGeminiStructuredOutput(prompt, manualEventSchema);
    if (!raw || typeof raw !== "object") throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI returned an invalid reality signal.", true);
    const value = raw as Record<string, unknown>;
    const targetId = typeof value.targetId === "string" ? value.targetId : "";
    const eventType = value.eventType;
    const targetDestination = mockCatalog.destinations.find((item) => item.id === targetId && destinationIds.includes(item.id));
    const targetRoute = mockCatalog.routeSegments.find((item) => item.id === targetId && routeIds.includes(item.id));
    const targetHotel = mockCatalog.hotels.find((item) => item.id === targetId && hotelIds.includes(item.id));
    const targetFlight = trip.bookings.find((item) => item.id === targetId && item.kind === "flight");
    const validTarget = eventType === "WEATHER_RISK" && Boolean(targetDestination)
      || eventType === "ROAD_CLOSURE" && Boolean(targetRoute)
      || eventType === "HOTEL_UNAVAILABLE" && Boolean(targetHotel)
      || eventType === "FLIGHT_DELAY" && Boolean(targetFlight?.scheduledAt);
    if (!validTarget) throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien AI could not map that report to a compatible object in this Trip.", true);

    const day = targetRoute ? trip.days.find((item) => item.routeSegmentIds.includes(targetRoute.id))
      : targetHotel ? trip.days.find((item) => item.hotelId === targetHotel.id)
        : targetFlight?.dayId ? trip.days.find((item) => item.id === targetFlight.dayId)
          : trip.days.find((item) => item.destinationId === targetDestination?.id);
    if (!day) throw new GeminiServiceError("AI_INVALID_RESPONSE", "The selected target is not scheduled in this Trip.", true);
    const signal = manualRealitySignalAdapter.adapt({ text: body.message, observedAt })[0];
    const delayMinutes = eventType === "FLIGHT_DELAY" && typeof value.delayMinutes === "number" ? value.delayMinutes : 0;
    const targetHotelBooking = targetHotel ? trip.bookings.find((item) => item.kind === "hotel" && item.itemId === targetHotel.id && item.dayId === day.id) : undefined;
    const vehicleBooking = eventType === "FLIGHT_DELAY" ? trip.bookings.find((item) => item.kind === "vehicle") : undefined;
    const scheduledArrivalAt = targetFlight?.scheduledAt;
    signal.payload = {
      eventId: `event-${signal.id}`,
      eventType,
      version: 1,
      title: value.title,
      description: value.description,
      confidence: value.confidence,
      severity: value.severity,
      status: "ACTIVE",
      locationLabel: targetDestination?.name ?? targetHotel?.name ?? (targetRoute ? `${targetRoute.fromDestinationId}–${targetRoute.toDestinationId}` : "Trip arrival"),
      destinationId: targetDestination?.id ?? targetHotel?.destinationId ?? (targetFlight ? trip.traveler.arrivalCityId : undefined),
      destinationIds: targetDestination ? [targetDestination.id] : targetHotel ? [targetHotel.destinationId] : targetFlight ? [trip.traveler.arrivalCityId] : [],
      routeSegmentIds: targetRoute ? [targetRoute.id] : [],
      hotelIds: targetHotel ? [targetHotel.id] : [],
      bookingIds: targetHotelBooking ? [targetHotelBooking.id] : targetFlight ? [targetFlight.id, vehicleBooking?.id].filter(Boolean) : [],
      effectiveFrom: `${day.date}T00:00:00+08:00`,
      effectiveUntil: `${nextDate(day.date)}T00:00:00+08:00`,
      evidence: ["Manual demo report interpreted by Gemini"],
      tags: [String(eventType).toLowerCase(), "manual-demo"],
      ...(eventType === "WEATHER_RISK" ? { expectedOperationalDelayMinutes: 60 } : {}),
      ...(eventType === "ROAD_CLOSURE" ? { closureStatus: "CLOSED", expectedOperationalDelayMinutes: 45 } : {}),
      ...(eventType === "HOTEL_UNAVAILABLE" ? { reason: "Manual demo supplier cancellation" } : {}),
      ...(eventType === "FLIGHT_DELAY" && scheduledArrivalAt ? { delayMinutes, scheduledArrivalAt, estimatedArrivalAt: new Date(Date.parse(scheduledArrivalAt) + delayMinutes * 60_000).toISOString() } : {}),
    };
    const event = compileRealitySignal(signal);
    if (!event) throw new GeminiServiceError("AI_INVALID_RESPONSE", "Travorien rejected the interpreted signal during deterministic validation.", true);
    return Response.json({ signal, event });
  } catch (error) {
    if (error instanceof GeminiServiceError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.code === "AI_NOT_CONFIGURED" ? 503 : 502 });
    return Response.json({ error: { code: "AI_UPSTREAM_ERROR", message: "Travorien AI hit a temporary problem. No event was created.", retryable: true } }, { status: 502 });
  }
}
