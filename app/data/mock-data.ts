import type { Catalog, Destination, Experience, Hotel, RealityEvent, RouteSegment, Vehicle } from "../domain.ts";

const demo = "demo-mock" as const;

export const destinations: Destination[] = [
  ["kunming", "Kunming", 1890, "Lake city, flower markets and an easy first landing."],
  ["chuxiong", "Chuxiong", 1770, "A relaxed Yi-culture stop between Kunming and Dali."],
  ["dali", "Dali", 1975, "Bai heritage, old lanes and Erhai lakeshore."],
  ["shaxi", "Shaxi", 2100, "A restored Tea Horse Road market town."],
  ["lijiang", "Lijiang", 2400, "Naxi courtyards beneath Jade Dragon Snow Mountain."],
  ["tiger-gorge", "Tiger Leaping Gorge", 1800, "A dramatic Jinsha River canyon and hiking base."],
  ["shangri-la", "Shangri-La", 3200, "Tibetan plateau culture, wetlands and monasteries."],
  ["baishuitai", "Bai Shui Tai", 2380, "White mineral terraces on a scenic mountain detour."],
  ["weishan", "Weishan", 1720, "Quiet Ming-era streets south of Dali."],
  ["puzhehei", "Puzhehei", 1450, "Karst lakes and rural trails in southeast Yunnan."],
].map(([id, name, elevationMeters, summary]) => ({ id: String(id), name: String(name), province: "Yunnan", elevationMeters: Number(elevationMeters), summary: String(summary), provenance: demo }));

export const vehicles: Vehicle[] = [
  ["vehicle-haval-h6", "Haval H6", "Comfort SUV", 520, 5, 3, 5, "petrol"],
  ["vehicle-vw-tayron", "Volkswagen Tayron", "Premium SUV", 690, 5, 3, 5, "petrol"],
  ["vehicle-toyota-rav4", "Toyota RAV4", "Comfort SUV", 620, 5, 3, 5, "hybrid"],
  ["vehicle-byd-song", "BYD Song Plus", "Hybrid SUV", 590, 5, 3, 5, "plug-in-hybrid"],
  ["vehicle-vw-golf", "Volkswagen Golf", "Compact", 360, 5, 2, 5, "petrol"],
  ["vehicle-toyota-corolla", "Toyota Corolla", "Sedan", 420, 5, 3, 4, "hybrid"],
  ["vehicle-volvo-xc40", "Volvo XC40", "Luxury SUV", 920, 5, 3, 5, "petrol"],
  ["vehicle-toyota-camry", "Toyota Camry", "Premium Sedan", 560, 5, 3, 4, "hybrid"],
  ["vehicle-tank300", "Tank 300", "Adventure SUV", 780, 5, 3, 5, "petrol"],
  ["vehicle-buick-gl8", "Buick GL8", "Premium MPV", 850, 7, 5, 5, "petrol"],
].map(([id, name, category, dailyPriceCny, seats, luggage, doors, fuelType]) => ({ id: String(id), name: String(name), category: String(category), transmission: "automatic", dailyPriceCny: Number(dailyPriceCny), seats: Number(seats), luggage: Number(luggage), doors: Number(doors), fuelType: fuelType as Vehicle["fuelType"], highlights: ["English pickup briefing", "Unlimited mileage", "24/7 road support"], provenance: demo }));

const hotelSeed = [
  ["hotel-kunming-green-lake", "kunming", "Green Lake Courtyard", "Heritage courtyard", 880, 4.7],
  ["hotel-kunming-moon", "kunming", "Moon Gate Hotel", "Design hotel", 720, 4.6],
  ["hotel-kunming-canopy", "kunming", "Canopy South", "Urban boutique", 660, 4.5],
  ["hotel-chuxiong-pavilion", "chuxiong", "The Pavilion Chuxiong", "Garden retreat", 560, 4.6],
  ["hotel-chuxiong-yi", "chuxiong", "Yi Hearth Lodge", "Local guesthouse", 420, 4.5],
  ["hotel-dali-linden", "dali", "Linden Centre Dali", "Restored Bai mansion", 1180, 4.9],
  ["hotel-dali-erhai", "dali", "Erhai Lake House", "Lakeside boutique", 960, 4.8],
  ["hotel-dali-cangshan", "dali", "Cangshan Cloud Inn", "Mountain inn", 760, 4.6],
  ["hotel-shaxi-sunken", "shaxi", "Sunyata Shaxi", "Historic courtyard", 1080, 4.8],
  ["hotel-shaxi-horse", "shaxi", "Old Horse Inn", "Tea Horse lodge", 680, 4.7],
  ["hotel-lijiang-villafound", "lijiang", "Villafound Jade", "Naxi design retreat", 1260, 4.8],
  ["hotel-lijiang-arro", "lijiang", "Arro Khampa Lijiang", "Tibetan boutique", 980, 4.7],
  ["hotel-lijiang-garden", "lijiang", "Naxi Garden House", "Courtyard inn", 640, 4.6],
  ["hotel-gorge-tea-horse", "tiger-gorge", "Tea Horse Guesthouse", "Cliffside lodge", 620, 4.7],
  ["hotel-gorge-ridge", "tiger-gorge", "Gorge Ridge Lodge", "Mountain lodge", 760, 4.6],
  ["hotel-gorge-summit", "tiger-gorge", "Summit View Lodge", "Premium mountain lodge", 980, 4.8],
  ["hotel-shangrila-songtsam", "shangri-la", "Songtsam Shangri-La", "Tibetan lodge", 1480, 4.9],
  ["hotel-shangrila-arro", "shangri-la", "Arro Khampa Shangri-La", "Tibetan courtyard", 1080, 4.8],
  ["hotel-baishuitai-terrace", "baishuitai", "White Terrace Lodge", "Village lodge", 520, 4.5],
  ["hotel-baishuitai-cloudline", "baishuitai", "Cloudline Mountain Lodge", "Remote design lodge", 1400, 4.8],
  ["hotel-weishan-old-town", "weishan", "Weishan Old Town House", "Heritage inn", 580, 4.6],
  ["hotel-puzhehei-lake", "puzhehei", "Puzhehei Lake Retreat", "Lakeside retreat", 780, 4.6],
];
export const hotels: Hotel[] = hotelSeed.map(([id, destinationId, name, style, nightlyPriceCny, rating], index) => {
  const parkingType: Hotel["parkingType"] = index % 3 === 0 ? "on-site" : index % 3 === 1 ? "nearby-lot" : "unknown";
  const vehicleAccess: Hotel["vehicleAccess"] = parkingType === "on-site" ? "direct" : parkingType === "nearby-lot" ? "edge-of-old-town" : "unknown";
  return { id: String(id), destinationId: String(destinationId), name: String(name), style: String(style), nightlyPriceCny: Number(nightlyPriceCny), rating: Number(rating), amenities: ["Private bathroom", "Wi-Fi", "English check-in notes"], parkingType, parkingDistanceMeters: parkingType === "on-site" ? 0 : parkingType === "nearby-lot" ? 250 : null, lateArrivalSuitability: parkingType === "on-site" ? "strong" : parkingType === "nearby-lot" ? "limited" : "unknown", vehicleAccess, oldTownAccessMinutes: parkingType === "on-site" ? 12 : parkingType === "nearby-lot" ? 5 : null, routeConvenience: parkingType === "on-site" ? "high" : parkingType === "nearby-lot" ? "medium" : "unknown", provenance: demo };
});

const experienceSeed = [
  ["exp-kunming-market", "kunming", "Private Yunnan food market walk", "food", 3, 260],
  ["exp-kunming-lake", "kunming", "Green Lake slow morning", "culture", 2, 80],
  ["exp-chuxiong-yi", "chuxiong", "Yi cooking and fire-circle supper", "food", 3, 320],
  ["exp-chuxiong-museum", "chuxiong", "Yi culture museum visit", "culture", 2, 90],
  ["exp-dali-cycle", "dali", "Guided Erhai e-bike loop", "nature", 4, 360],
  ["exp-dali-bai", "dali", "Bai village tea ceremony", "culture", 2, 220],
  ["exp-dali-kitchen", "dali", "Dali courtyard cooking class", "food", 3, 320],
  ["exp-shaxi-market", "shaxi", "Shaxi market and artisan walk", "culture", 2.5, 240],
  ["exp-shaxi-horse", "shaxi", "Tea Horse trail ride", "nature", 3, 420],
  ["exp-shaxi-cheese", "shaxi", "Rushan cheese workshop", "food", 2, 180],
  ["exp-lijiang-naxi", "lijiang", "Naxi old town after-hours walk", "culture", 2.5, 280],
  ["exp-lijiang-snow", "lijiang", "Jade Dragon foothills picnic", "nature", 5, 480],
  ["exp-lijiang-music", "lijiang", "Naxi music salon", "culture", 2, 200],
  ["exp-gorge-hike", "tiger-gorge", "Tiger Leaping Gorge half-day hike", "nature", 5, 390],
  ["exp-gorge-sunrise", "tiger-gorge", "Gorge sunrise lookout", "nature", 1.5, 120],
  ["exp-shangrila-monastery", "shangri-la", "Songzanlin monastery with local host", "culture", 3, 320],
  ["exp-shangrila-wetland", "shangri-la", "Napa Lake wetland ramble", "nature", 3, 260],
  ["exp-shangrila-table", "shangri-la", "Tibetan family table", "food", 3, 360],
  ["exp-baishuitai-terraces", "baishuitai", "White Water Terraces walk", "nature", 2.5, 180],
  ["exp-weishan-noodles", "weishan", "Weishan noodle workshop", "food", 2, 160],
  ["exp-puzhehei-kayak", "puzhehei", "Karst lake sunrise kayak", "nature", 2.5, 280],
];
export const experiences: Experience[] = experienceSeed.map(([id, destinationId, name, category, durationHours, pricePerAdultCny]) => ({ id: String(id), destinationId: String(destinationId), name: String(name), category: category as Experience["category"], durationHours: Number(durationHours), pricePerAdultCny: Number(pricePerAdultCny), provenance: demo }));

const routeSeed = [
  ["route-kunming-dali", "kunming", "dali", 340, 255, "G56 expressway", "A long first driving day with two planned rest stops."],
  ["route-kunming-chuxiong", "kunming", "chuxiong", 165, 135, "G56 expressway", "Easy expressway drive with a service stop."],
  ["route-chuxiong-dali", "chuxiong", "dali", 180, 145, "G56 expressway", "Rolling highland scenery into the Dali basin."],
  ["route-dali-shaxi", "dali", "shaxi", 130, 140, "Provincial roads", "Scenic mountain road; daylight arrival recommended."],
  ["route-dali-shaxi-east", "dali", "shaxi", 165, 185, "Eastern valley road", "Demo alternative that avoids the closed Tea Horse corridor."],
  ["route-shaxi-lijiang", "shaxi", "lijiang", 100, 115, "Provincial roads", "Quiet valley road and a gentle arrival."],
  ["route-lijiang-gorge", "lijiang", "tiger-gorge", 85, 110, "G214", "Mountain highway with viewpoint pull-offs."],
  ["route-gorge-shangrila", "tiger-gorge", "shangri-la", 110, 150, "G214", "Steady climb onto the Tibetan plateau."],
  ["route-lijiang-shangrila-direct", "lijiang", "shangri-la", 175, 215, "G214 bypass", "Demo direct routing that avoids the Tiger Leaping Gorge stop."],
  ["route-lijiang-baishuitai", "lijiang", "baishuitai", 130, 155, "Mountain scenic road", "Demo daylight route to Bai Shui Tai, avoiding the gorge corridor."],
  ["route-gorge-baishuitai", "tiger-gorge", "baishuitai", 95, 145, "Mountain road", "Narrow scenic road; avoid after dark."],
  ["route-baishuitai-shangrila", "baishuitai", "shangri-la", 105, 135, "Mountain road", "Highland curves and open plateau views."],
  ["route-dali-weishan", "dali", "weishan", 65, 80, "Provincial road", "Relaxed heritage-town day trip."],
];
export const routeSegments: RouteSegment[] = routeSeed.map(([id, fromDestinationId, toDestinationId, distanceKm, drivingMinutes, roadType, notes]) => ({ id: String(id), fromDestinationId: String(fromDestinationId), toDestinationId: String(toDestinationId), distanceKm: Number(distanceKm), drivingMinutes: Number(drivingMinutes), roadType: String(roadType), notes: String(notes), provenance: demo }));

export const mockCatalog: Catalog = {
  destinations,
  vehicles,
  hotels,
  experiences,
  routeSegments,
  permitRequirements: [
    {
      id: "permit-germany-demo", nationality: "Germany", title: "China temporary driving permit assistance",
      status: "guidance-included", leadTimeDays: 5, feeCny: 680,
      requiredDocuments: ["Passport", "German driving licence", "Chinese translation", "Entry record", "ID photo"],
      disclaimer: "Demo guidance only. Requirements and acceptance are not live legal or authority data.", provenance: demo,
    },
    {
      id: "permit-generic-demo", nationality: "Not specified", title: "Temporary driving permit readiness review",
      status: "action-needed", leadTimeDays: 7, feeCny: 680,
      requiredDocuments: ["Passport", "Home-country driving licence", "Licence translation", "Entry record", "ID photo"],
      disclaimer: "Generic demo checklist only. Requirements vary and must be confirmed with the issuing authority.", provenance: demo,
    },
  ],
};

export const mockDataNotice = "All availability, rules, travel times and prices are demo data — not live supplier or authority information.";

export const heavyRainGorgeEvent: RealityEvent = {
  id: "event-gorge-heavy-rain-demo",
  version: 1,
  updatedAt: "2026-10-15T08:00:00Z",
  sourceSignalId: "signal-gorge-heavy-rain-demo-v1",
  type: "WEATHER_RISK",
  title: "Heavy rainfall near Tiger Leaping Gorge",
  description: "Heavy rainfall has increased travel risk around the Tiger Leaping Gorge portion of the journey.",
  source: "Travorien Golden Scenario",
  sourceType: "demo-mock",
  confidence: 0.94,
  severity: "HIGH",
  status: "ACTIVE",
  location: { label: "Tiger Leaping Gorge", destinationId: "tiger-gorge" },
  scope: {
    destinationIds: ["tiger-gorge"],
    routeSegmentIds: ["route-lijiang-gorge", "route-gorge-shangrila"],
    hotelIds: [],
    bookingIds: [],
    externalReferences: ["golden-rainfall-threshold-2026-10-15"],
  },
  details: { kind: "WEATHER_RISK", expectedOperationalDelayMinutes: 60 },
  effectiveFrom: "2026-10-15T18:00:00Z",
  effectiveUntil: "2026-10-17T12:00:00Z",
  observedAt: "2026-10-15T08:00:00Z",
  evidence: ["Demo rainfall threshold exceeded", "Demo mountain-road caution raised"],
  tags: ["rain", "mountain-road", "outdoor-experience"],
  provenance: demo,
};
