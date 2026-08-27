import type { DriveMedia, SignatureDrive, SourceProvenance } from "../product-domain.ts";

const commonsImage = (fileName: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=2200`;
const commonsSource = (fileName: string) => `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${fileName}`)}`;
const media = (fileName: string, author: string, licenseNote: string, alt: string): DriveMedia => ({
  imageUrl: commonsImage(fileName), sourceUrl: commonsSource(fileName), sourceName: "Wikimedia Commons",
  author, licenseNote, alt, provenance: "public-source",
});
const editorialSource: SourceProvenance = {
  id: "travorien-editorial-demo", name: "Travorien structured editorial layer", url: "#demo-content",
  publisher: "Travorien", lastVerifiedAt: "2026-08-25", status: "DEMO",
  note: "Editorial route metrics and notes are demo-content, not live navigation or road authority data.",
};

const blankDetails = {
  dailyJourney: [], permitNotes: ["Temporary Chinese driving permission must be confirmed before pickup."],
  parkingNotes: ["Parking conditions vary by stop; verify with the selected stay."],
  fuelNotes: ["Keep at least half a tank before remote or mountain sections."],
  chargingNotes: ["EV charging coverage is not verified for this demo route."],
  navigationNotes: ["Use a China-compatible navigation service and keep route notes available offline."],
  roadRiskNotes: ["Seasonal closures and local restrictions require verification before travel."],
  recommendedHotels: [], recommendedExperiences: [], alternativeVersions: [], source: [editorialSource], provenance: "demo-content" as const,
};

export const signatureDrives: SignatureDrive[] = [
  {
    id: "drive-yunnan-hidden-china", slug: "yunnan-hidden-china", name: "Yunnan Hidden China", region: "Yunnan",
    tagline: "Old towns, open valleys and the road into the Tibetan highlands.",
    start: "Kunming", end: "Shangri-La", stops: ["Kunming", "Dali", "Shaxi", "Lijiang", "Shangri-La"],
    catalogDestinationIds: ["kunming", "dali", "shaxi", "lijiang", "shangri-la"], recommendedDays: 10, distanceKm: 885, estimatedDrivingHours: 16.1,
    routeBinding: { destinationIds: ["kunming", "dali", "shaxi", "lijiang", "shangri-la"], capability: "transaction-ready-demo" },
    bestSeasons: ["March–May", "September–November"], drivingDifficulty: "moderate",
    suitability: { difficulty: "moderate", altitudeExposure: "high", parkingDifficulty: "mixed", roadSurface: "mountain-paved", serviceConfidence: "mixed", longestDrivingMinutes: 255 },
    roadCharacteristics: ["Mountain valleys", "Old-town approaches", "Highland finish"], recommendedVehicleTypes: ["suv", "premium", "sedan"],
    themes: ["Culture", "Food", "Villages", "Mountains"], travelerFit: ["First China road trip", "Couples", "Slow travelers"],
    heroMedia: media("Shangri-La County rural road and mountains.jpg", "Jason Zhang", "CC BY-SA 3.0", "An open rural road crossing farms beneath mountains outside Shangri-La"),
    summary: "China's most approachable first great drive: manageable days, brilliant food and a steady reveal from subtropical Yunnan to Tibetan highlands.",
    story: "The freedom is in the space between the famous names — Bai villages, Tea Horse Road valleys, roadside kitchens and unhurried mornings that tour itineraries rarely leave room for.",
    seoTitle: "Yunnan Hidden China Road Trip | Travorien", seoDescription: "A ten-day self-drive journey from Kunming to Shangri-La through Dali, Shaxi and Lijiang.", transactionStatus: "transaction-ready-demo", ...blankDetails,
    gallery: [
      media("Tiger leaping gorge, Yunnan, China - 虎跳峡，云南，中国 (10225898195).jpg", "Romain Pontida", "CC BY-SA 2.0", "Tiger Leaping Gorge and the Jinsha River in Yunnan"),
      media("Yunnan China Tiger-Leaping-Gorge-11.jpg", "CEphoto, Uwe Aranas", "CC BY-SA 3.0", "A mountain road carved through Tiger Leaping Gorge"),
      media("Shangri-La, Yunnan (21184063182).jpg", "Luca Casartelli", "CC BY-SA 2.0", "Wide highland landscape near Shangri-La"),
    ],
    dailyJourney: [
      { dayNumber: 1, destination: "Kunming", distanceKm: 0, estimatedDrivingMinutes: 0, title: "Land softly in the Spring City", roadStory: "Collect the car after the driving-permit handoff and keep the first day intentionally light.", stops: ["Green Lake", "Yunnan food market"], scenery: ["Lake gardens", "Jacaranda-lined streets"], food: ["Crossing-the-bridge noodles"], parking: "Use the selected hotel's verified parking and explore the center on foot.", bestDepartureTime: "No road departure", suggestedStay: "Green Lake Courtyard · demo recommendation", experience: "Market walk and an early night", practicalNotes: ["Do not drive until the temporary permit is issued", "Complete a vehicle handover and controls briefing"] },
      { dayNumber: 2, destination: "Dali", distanceKm: 340, estimatedDrivingMinutes: 255, title: "Across the highland to Dali", roadStory: "A long but straightforward expressway day opens into the Cangshan–Erhai basin.", stops: ["Chuxiong service area", "Erhai viewpoint"], scenery: ["Highland farms", "Cangshan skyline"], food: ["Yi-style lunch", "Bai courtyard dinner"], parking: "Stay outside the pedestrian old town or use a hotel-arranged parking transfer.", bestDepartureTime: "08:00", suggestedStay: "Linden Centre Dali · demo recommendation", experience: "Sunset in Xizhou", practicalNotes: ["Plan two rest stops", "Avoid an after-dark old-town arrival"] },
      { dayNumber: 3, destination: "Dali", distanceKm: 45, estimatedDrivingMinutes: 75, title: "Villages around Erhai", roadStory: "Keep the main road behind and use the car for a loose loop through Bai villages.", stops: ["Xizhou", "Zhoucheng"], scenery: ["Erhai lakeshore", "Cangshan foothills"], food: ["Bai three-course tea", "Rushan cheese"], parking: "Use signed village lots; lanes inside historic cores are unsuitable for visitor cars.", bestDepartureTime: "09:00", suggestedStay: "Linden Centre Dali · demo recommendation", experience: "Bai textile and tea visit", practicalNotes: ["Confirm local access restrictions", "Leave luggage at the hotel"] },
      { dayNumber: 4, destination: "Shaxi", distanceKm: 130, estimatedDrivingMinutes: 140, title: "The road to the Tea Horse valley", roadStory: "A measured mountain drive trades the lake basin for terraces, orchards and Shaxi's quiet valley.", stops: ["Shibao Mountain turn-off", "Sideng Square"], scenery: ["Mountain valleys", "Terraced farms"], food: ["Clay-pot rice", "Local mushroom dishes"], parking: "Park at the edge of Sideng; arrange luggage help for a courtyard stay.", bestDepartureTime: "09:00", suggestedStay: "Sunyata Shaxi · demo recommendation", experience: "Golden-hour village walk", practicalNotes: ["Daylight arrival recommended", "Do not follow narrow shortcut suggestions blindly"] },
      { dayNumber: 5, destination: "Shaxi", distanceKm: 0, estimatedDrivingMinutes: 0, title: "A keys-down Tea Horse day", roadStory: "Leave the car parked and let the old market town shrink the pace of the trip.", stops: ["Sideng market", "Aofeng village walk"], scenery: ["Courtyard lanes", "Valley fields"], food: ["Shaxi cheese", "Wild herb dishes"], parking: "Keep the vehicle at the verified overnight lot.", bestDepartureTime: "Keys down", suggestedStay: "Sunyata Shaxi · demo recommendation", experience: "Artisan workshop and market", practicalNotes: ["Market day varies", "Carry cashless payment plus a backup method"] },
      { dayNumber: 6, destination: "Lijiang", distanceKm: 100, estimatedDrivingMinutes: 115, title: "North through quiet valleys", roadStory: "An easy-to-read valley road leads toward Jade Dragon Snow Mountain without rushing the arrival.", stops: ["Jianchuan", "Baisha"], scenery: ["Open valleys", "Snow-mountain views"], food: ["Naxi hotpot"], parking: "Choose a stay with vehicle access outside Lijiang's pedestrian core.", bestDepartureTime: "09:30", suggestedStay: "Villafound Jade · demo recommendation", experience: "Baisha village before the crowds", practicalNotes: ["Use an outer-town parking location", "Confirm hotel approach before arrival"] },
      { dayNumber: 7, destination: "Lijiang", distanceKm: 55, estimatedDrivingMinutes: 90, title: "Foothills, not queues", roadStory: "Use the car to reach the quieter villages beneath Jade Dragon, then slow down on foot.", stops: ["Yuhu", "Baisha"], scenery: ["Snow-mountain foothills", "Naxi villages"], food: ["Chickpea jelly", "Local cured pork"], parking: "Use official visitor lots and avoid driving into village cores.", bestDepartureTime: "08:00", suggestedStay: "Villafound Jade · demo recommendation", experience: "Naxi-hosted foothills walk", practicalNotes: ["Mountain attraction access can change", "Verify ticket and access rules"] },
      { dayNumber: 8, destination: "Shangri-La", distanceKm: 175, estimatedDrivingMinutes: 215, title: "Climb to the Tibetan highlands", roadStory: "The landscape opens dramatically as the route follows G214 toward the plateau.", stops: ["Tiger Leaping Gorge viewpoint", "Jinsha River bend"], scenery: ["Deep gorge", "Highland grassland"], food: ["Yak hotpot", "Butter tea"], parking: "Book a highland stay with on-site parking and late-arrival support.", bestDepartureTime: "08:00", suggestedStay: "Songtsam Shangri-La · demo recommendation", experience: "Gentle Dukezong evening", practicalNotes: ["Ascend gradually and keep the first evening light", "Weather and gorge access require same-week verification"] },
      { dayNumber: 9, destination: "Shangri-La", distanceKm: 40, estimatedDrivingMinutes: 75, title: "A light day at altitude", roadStory: "Keep distances small while the body adjusts; the plateau rewards patience.", stops: ["Songzanlin", "Napa Lake edge"], scenery: ["Wetland", "Monastery roofs"], food: ["Tibetan family table"], parking: "Use official attraction lots; avoid informal wetland tracks.", bestDepartureTime: "09:30", suggestedStay: "Songtsam Shangri-La · demo recommendation", experience: "Local-host monastery visit", practicalNotes: ["This is not medical advice", "Reduce exertion if anyone feels unwell"] },
      { dayNumber: 10, destination: "Shangri-La", distanceKm: 0, estimatedDrivingMinutes: 0, title: "Return the keys, keep the horizon", roadStory: "A deliberately unhurried final morning leaves room for the vehicle return process.", stops: ["Dukezong", "Airport drop-off"], scenery: ["Plateau morning"], food: ["Highland breakfast"], parking: "Follow the demo supplier's exact drop-off instructions.", bestDepartureTime: "No through-drive", suggestedStay: "Departure day", experience: "Final old-town walk", practicalNotes: ["Allow buffer for inspection and drop-off", "No live flight or supplier data is connected"] },
    ],
    recommendedHotels: ["Green Lake Courtyard", "Linden Centre Dali", "Sunyata Shaxi", "Villafound Jade", "Songtsam Shangri-La"],
    recommendedExperiences: ["Kunming food market", "Bai village tea", "Shaxi artisan walk", "Naxi foothills", "Songzanlin with a local host"],
    alternativeVersions: [
      { id: "yunnan-7-day", name: "The essential seven", days: 7, description: "A tighter Kunming–Dali–Shaxi–Lijiang journey for travelers who prefer fewer highland days.", stopIds: ["kunming", "dali", "shaxi", "lijiang"], travelerFit: ["One-week trips", "First-time visitors"], executable: true },
      { id: "yunnan-12-day", name: "The slow road north", days: 12, description: "Add village days and a softer ascent before Shangri-La.", stopIds: ["kunming", "chuxiong", "dali", "shaxi", "lijiang", "tiger-gorge", "shangri-la"], travelerFit: ["Slow travel", "Food and culture"], executable: true },
      { id: "yunnan-family", name: "Family pace", days: 10, description: "Shorter activity windows, more keys-down time and fewer late arrivals.", stopIds: ["kunming", "dali", "shaxi", "lijiang", "shangri-la"], travelerFit: ["Families", "Multi-generation"], executable: true },
    ],
  },
  {
    id: "drive-western-sichuan-high-road", slug: "western-sichuan-high-road", name: "Western Sichuan High Road", region: "Western Sichuan",
    tagline: "Big alpine drama, photography roads and high-altitude horizons.",
    start: "Chengdu", end: "Siguniangshan", stops: ["Chengdu", "Kangding", "Xinduqiao", "Siguniangshan"], catalogDestinationIds: [],
    recommendedDays: 9, distanceKm: 910, estimatedDrivingHours: 20, bestSeasons: ["May–June", "September–October"], drivingDifficulty: "challenging",
    suitability: { difficulty: "challenging", altitudeExposure: "high", parkingDifficulty: "mixed", roadSurface: "mountain-paved", serviceConfidence: "remote-stretches", longestDrivingMinutes: 300 },
    roadCharacteristics: ["High mountain passes", "Long climbs", "Rapid weather changes"], recommendedVehicleTypes: ["suv", "premium"],
    themes: ["Alpine", "Adventure", "Photography", "High altitude"], travelerFit: ["Experienced mountain drivers", "Photographers"],
    heroMedia: media("318国道新都桥段 - National Highway 318 - 2012.10 - panoramio.jpg", "rheins", "CC BY 3.0", "National Highway 318 winding through the high valley near Xinduqiao"), gallery: [],
    summary: "The spectacular choice when the road itself matters as much as the destination — with altitude and longer mountain days that demand more preparation.",
    story: "Leave the Sichuan Basin and climb into a world of prayer flags, grasslands and switchbacks where every hour changes the scale of the landscape.",
    seoTitle: "Western Sichuan High Road | Travorien", seoDescription: "A high-altitude self-drive route from Chengdu through Kangding and Xinduqiao.", transactionStatus: "content-ready", ...blankDetails,
  },
  {
    id: "drive-guangxi-karst-country", slug: "guangxi-karst-country", name: "Guangxi Karst Country", region: "Guangxi",
    tagline: "Quiet lanes, limestone peaks and food worth taking the long way for.",
    start: "Guilin", end: "Liuzhou", stops: ["Guilin", "Yangshuo", "Longji", "Liuzhou"], catalogDestinationIds: [],
    recommendedDays: 7, distanceKm: 520, estimatedDrivingHours: 11, bestSeasons: ["March–May", "October–November"], drivingDifficulty: "easy-to-moderate",
    suitability: { difficulty: "easy-to-moderate", altitudeExposure: "moderate", parkingDifficulty: "mixed", roadSurface: "mixed-paved", serviceConfidence: "frequent", longestDrivingMinutes: 150 },
    roadCharacteristics: ["Country lanes", "Karst valleys", "Shorter driving days"], recommendedVehicleTypes: ["compact", "sedan", "suv"],
    themes: ["Karst", "Countryside", "Food", "Easy driving"], travelerFit: ["Families", "First-time drivers", "Food travelers"],
    heroMedia: media("1 yangshuo farm karst 2011.jpg", "Chensiyuan", "CC BY-SA 4.0 / 3.0 / 2.5 / 2.0 / 1.0", "Farm tracks and dramatic karst peaks in Yangshuo County"), gallery: [],
    summary: "A gentler southern drive shaped by small roads, rice terraces and the freedom to stop whenever the karst landscape opens up.",
    story: "This is a route for windows down, market lunches and turning off the main road when a limestone valley catches your eye.",
    seoTitle: "Guangxi Karst Country Road Trip | Travorien", seoDescription: "Drive Guilin, Yangshuo, Longji and Liuzhou through Guangxi's karst countryside.", transactionStatus: "content-ready", ...blankDetails,
  },
  {
    id: "drive-hainan-coastal-loop", slug: "hainan-coastal-loop", name: "Hainan Coastal Road", region: "Hainan",
    tagline: "Sea air, coconut roads and the easiest rhythm in the collection.",
    start: "Haikou", end: "Sanya", stops: ["Haikou", "Wenchang", "Wanning", "Lingshui", "Sanya"], catalogDestinationIds: [],
    recommendedDays: 7, distanceKm: 640, estimatedDrivingHours: 12, bestSeasons: ["November–March"], drivingDifficulty: "easy",
    suitability: { difficulty: "easy", altitudeExposure: "low", parkingDifficulty: "easy", roadSurface: "mostly-expressway", serviceConfidence: "frequent", longestDrivingMinutes: 150 },
    roadCharacteristics: ["Coastal scenic highway", "Warm-weather driving", "Frequent towns"], recommendedVehicleTypes: ["compact", "sedan", "suv"],
    themes: ["Coast", "Food", "Relaxed", "Easy driving"], travelerFit: ["Families", "Winter sun", "Low-stress first drive"],
    heroMedia: media("国家海岸1号风景道.jpg", "重庆轨交18", "CC BY-SA 4.0", "A palm-lined section of Hainan Coastal Scenic Highway"), gallery: [],
    summary: "China's low-stress coastal answer: warm weather, forgiving distances and enough seafood stops to make the road the itinerary.",
    story: "Follow the island's eastern edge from arcaded Haikou streets to surf towns and tropical coves, with room to change plans whenever the coast looks better than the schedule.",
    seoTitle: "Hainan Coastal Road | Travorien", seoDescription: "A relaxed seven-day drive from Haikou to Sanya along Hainan's eastern coast.", transactionStatus: "content-ready", ...blankDetails,
  },
  {
    id: "drive-xinjiang-open-horizon", slug: "xinjiang-open-horizon", name: "Xinjiang Open Horizon", region: "Xinjiang",
    tagline: "Continental scale, long-road freedom and landscapes that reset your sense of distance.",
    start: "Urumqi", end: "Yining", stops: ["Urumqi", "Dushanzi", "Sayram Lake", "Yining"], catalogDestinationIds: [],
    recommendedDays: 10, distanceKm: 1280, estimatedDrivingHours: 24, bestSeasons: ["June–September"], drivingDifficulty: "challenging",
    suitability: { difficulty: "challenging", altitudeExposure: "high", parkingDifficulty: "easy", roadSurface: "mountain-paved", serviceConfidence: "remote-stretches", longestDrivingMinutes: 330 },
    roadCharacteristics: ["Long-distance stages", "Mountain bends", "Remote services"], recommendedVehicleTypes: ["suv", "premium"],
    themes: ["Epic scenery", "Long distance", "Adventure"], travelerFit: ["Experienced road trippers", "Landscape travelers"],
    heroMedia: media("Exit 138 (Sayram Lake) of G30 Highway of China.jpg", "Unravel17", "CC BY-SA 4.0", "The G30 highway exit toward Sayram Lake beneath Xinjiang mountains"), gallery: [],
    summary: "The epic one: huge skies, high passes and the kind of distances that turn preparation into part of the adventure.",
    story: "This route sells no shortcuts. It is about watching terrain change for hours, planning fuel carefully and arriving at Sayram Lake with the road still humming in your head.",
    seoTitle: "Xinjiang Open Horizon Road Trip | Travorien", seoDescription: "A long-distance northern Xinjiang drive from Urumqi to Sayram Lake and Yining.", transactionStatus: "content-ready", ...blankDetails,
  },
];

export const signatureDriveFor = (slug: string) => signatureDrives.find((drive) => drive.slug === slug);
