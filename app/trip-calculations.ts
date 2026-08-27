import type { Catalog, Trip, TripPrice } from "./domain.ts";
import { mockCatalog } from "./data/mock-data.ts";

export function catalogSnapshotFingerprint(catalog: Catalog = mockCatalog): string {
  const byId = <T extends { id: string }>(items: T[]) => items.slice().sort((left, right) => left.id.localeCompare(right.id));
  return JSON.stringify({
    destinations: byId(catalog.destinations),
    routeSegments: byId(catalog.routeSegments),
    vehicles: byId(catalog.vehicles),
    hotels: byId(catalog.hotels),
    experiences: byId(catalog.experiences),
    permitRequirements: byId(catalog.permitRequirements),
  });
}

export function calculatePrice(trip: Pick<Trip, "vehicleId" | "days" | "traveler" | "permitRequirementId"> & Partial<Pick<Trip, "bookings">>, catalog: Catalog = mockCatalog): TripPrice {
  const vehicle = catalog.vehicles.find((item) => item.id === trip.vehicleId);
  const permit = catalog.permitRequirements.find((item) => item.id === trip.permitRequirementId);
  const confirmedVehicle = trip.bookings?.find((item) => item.kind === "vehicle" && item.itemId === trip.vehicleId && item.status === "confirmed");
  const hotels = trip.days.reduce((sum, item) => {
    const booking = trip.bookings?.find((candidate) => candidate.kind === "hotel" && candidate.dayId === item.id && candidate.itemId === item.hotelId);
    return sum + (booking?.amountCny ?? catalog.hotels.find((hotel) => hotel.id === item.hotelId)?.nightlyPriceCny ?? 0);
  }, 0);
  const uniqueExperiences = [...new Set(trip.days.flatMap((item) => item.experienceIds))];
  const experiences = uniqueExperiences.reduce((sum, id) => sum + (catalog.experiences.find((item) => item.id === id)?.pricePerAdultCny ?? 0) * trip.traveler.adults, 0);
  const price = { currency: "CNY" as const, vehicle: confirmedVehicle?.amountCny ?? (vehicle?.dailyPriceCny ?? 0) * trip.days.length, hotels, experiences, permitAssistance: permit?.feeCny ?? 0, roadSupport: 399, total: 0 };
  price.total = price.vehicle + price.hotels + price.experiences + price.permitAssistance + price.roadSupport;
  return price;
}

export function getTripMetrics(trip: Trip, catalog: Catalog = mockCatalog) {
  const routes = trip.days.flatMap((item) => item.routeSegmentIds).map((id) => catalog.routeSegments.find((route) => route.id === id)).filter(Boolean);
  return {
    distanceKm: routes.reduce((sum, route) => sum + (route?.distanceKm ?? 0), 0),
    drivingMinutes: routes.reduce((sum, route) => sum + (route?.drivingMinutes ?? 0), 0),
    longestDrivingMinutes: Math.max(0, ...trip.days.map((item) => item.routeSegmentIds.reduce((sum, id) => sum + (catalog.routeSegments.find((route) => route.id === id)?.drivingMinutes ?? 0), 0))),
  };
}
