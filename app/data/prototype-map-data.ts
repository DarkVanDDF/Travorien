import type { PrototypeDestination } from "../prototype-domain.ts";

export const prototypeDestinations: PrototypeDestination[] = [
  { id: "beijing", name: "Beijing", region: "Beijing", x: 69, y: 28, tags: "Imperial City · Great Wall Gateways", story: "China’s most legible arrival point for imperial history, with rewarding drives beginning beyond the urban ring roads.", interestKeys: ["history", "food", "imperial"], terrain: "urban", provenance: "demo-mock" },
  { id: "xian", name: "Xi’an", region: "Shaanxi", x: 54, y: 43, tags: "Emperors · Walls · Ancient China", story: "An imperial starting point with enough depth to reward slow days before the road opens east or west.", interestKeys: ["history", "food", "imperial"], terrain: "historic", provenance: "demo-mock" },
  { id: "luoyang", name: "Luoyang", region: "Henan", x: 61, y: 46, tags: "Emperors · Palaces · Ancient China", story: "Ancient capitals, grottoes and old dynasties without making the journey about modern megacities.", interestKeys: ["history", "food", "imperial"], terrain: "historic", provenance: "demo-mock" },
  { id: "huashan", name: "Huashan", region: "Shaanxi", x: 58, y: 42, tags: "Cliffs · Hiking · Epic Views", story: "A short, high-impact mountain turn from Xi’an for travelers who want drama without a multi-day transfer.", interestKeys: ["mountains", "hiking", "views"], terrain: "alpine", provenance: "demo-mock" },
  { id: "pingyao", name: "Pingyao", region: "Shanxi", x: 57, y: 34, tags: "Walled City · Merchant China · Old Streets", story: "A slower encounter with merchant China inside one of the country’s most atmospheric walled towns.", interestKeys: ["history", "food", "quiet"], terrain: "historic", provenance: "demo-mock" },
  { id: "kaifeng", name: "Kaifeng", region: "Henan", x: 65, y: 48, tags: "Song Dynasty · Night Markets", story: "History becomes lived-in and edible here: old capital traces, market food and a less polished rhythm.", interestKeys: ["history", "food"], terrain: "historic", provenance: "demo-mock" },
  { id: "dunhuang", name: "Dunhuang", region: "Gansu", x: 33, y: 34, tags: "Desert Roads · Silk Road Caves", story: "A cinematic desert base where Silk Road history meets huge horizons and longer, more deliberate driving days.", interestKeys: ["desert", "history", "views"], terrain: "desert", provenance: "demo-mock" },
  { id: "chengdu", name: "Chengdu", region: "Sichuan", x: 43, y: 51, tags: "Teahouses · Sichuan Flavour", story: "The practical gateway to western Sichuan, with a food culture worth pausing for before the mountain roads.", interestKeys: ["food", "culture"], terrain: "urban", provenance: "demo-mock" },
  { id: "siguniangshan", name: "Siguniangshan", region: "Sichuan", x: 39, y: 48, tags: "Alpine Valleys · Four Sisters", story: "A high-alpine destination with bigger road demands, altitude exposure and a serious scenery payoff.", interestKeys: ["mountains", "hiking", "views"], terrain: "alpine", provenance: "demo-mock" },
  { id: "kangding", name: "Kangding", region: "Sichuan", x: 38, y: 54, tags: "Mountain Passes · Tibetan Edge", story: "A cultural and geographic threshold where driving becomes slower, higher and more weather-sensitive.", interestKeys: ["mountains", "culture", "views"], terrain: "highland", provenance: "demo-mock" },
  { id: "kunming", name: "Kunming", region: "Yunnan", x: 45, y: 67, tags: "Highland Food · Open Skies", story: "An easy logistics gateway into Yunnan’s richer village and mountain road stories.", interestKeys: ["food", "culture"], terrain: "highland", provenance: "demo-mock" },
  { id: "dali", name: "Dali", region: "Yunnan", x: 42, y: 69, tags: "Erhai Roads · Bai Villages", story: "Lakeside roads, Bai villages and enough room to make the car useful without rushing onward.", interestKeys: ["villages", "food", "mountains"], terrain: "highland", provenance: "demo-mock" },
  { id: "shaxi", name: "Shaxi", region: "Yunnan", x: 41, y: 64, tags: "Tea Horse Road · Market Town", story: "The place that slows a Yunnan journey down: valley walks, courtyards and a true keys-down day.", interestKeys: ["villages", "history", "quiet"], terrain: "highland", provenance: "demo-mock" },
  { id: "lijiang", name: "Lijiang", region: "Yunnan", x: 40, y: 62, tags: "Naxi Culture · Snow Mountains", story: "Use the car to reach villages and mountain edges beyond the busy old-town core.", interestKeys: ["mountains", "culture", "food"], terrain: "highland", provenance: "demo-mock" },
  { id: "shangri-la", name: "Shangri-La", region: "Yunnan", x: 38, y: 57, tags: "Tibetan Highlands · Mountain Passes", story: "A dramatic highland finish that rewards gradual acclimatization and conservative driving days.", interestKeys: ["mountains", "culture", "views"], terrain: "alpine", provenance: "demo-mock" },
  { id: "lhasa", name: "Lhasa", region: "Tibet Autonomous Region", x: 27, y: 57, tags: "High Plateau · Additional Requirements", story: "A culturally extraordinary destination with additional travel requirements for international visitors.", interestKeys: ["mountains", "culture", "history"], terrain: "alpine", provenance: "demo-mock" },
  { id: "guilin", name: "Guilin", region: "Guangxi", x: 59, y: 70, tags: "Karst Peaks · Rivers", story: "A highly legible first taste of rural south China, with dramatic forms and manageable access.", interestKeys: ["mountains", "views", "food"], terrain: "karst", provenance: "demo-mock" },
  { id: "yangshuo", name: "Yangshuo", region: "Guangxi", x: 60, y: 72, tags: "Rice Fields · Karst Backroads", story: "Short rural drives make it easy to trade the busy center for villages, rivers and limestone country.", interestKeys: ["villages", "views", "cycling"], terrain: "karst", provenance: "demo-mock" },
  { id: "guangzhou", name: "Guangzhou", region: "Guangdong", x: 65, y: 76, tags: "Cantonese Food · Southern Gateway", story: "A well-connected southern starting point whose best road-trip value begins beyond the expressway belt.", interestKeys: ["food", "culture"], terrain: "urban", provenance: "demo-mock" },
  { id: "shenzhen", name: "Shenzhen", region: "Guangdong", x: 69, y: 78, tags: "Coastal City · Easy Connections", story: "Straightforward urban driving, but more practical connector than great road-trip story.", interestKeys: ["coast", "modern"], terrain: "urban", provenance: "demo-mock" },
  { id: "xiamen", name: "Xiamen", region: "Fujian", x: 75, y: 70, tags: "Island Streets · Fujian Coast", story: "A relaxed coastal anchor for food, island atmosphere and drives toward Fujian’s mountain villages.", interestKeys: ["coast", "food", "villages"], terrain: "coastal", provenance: "demo-mock" },
  { id: "haikou", name: "Haikou", region: "Hainan", x: 62, y: 87, tags: "Volcanic Villages · Island Gateway", story: "A lower-stress gateway to coastal freedom, frequent services and an easy-going island rhythm.", interestKeys: ["coast", "food", "villages"], terrain: "coastal", provenance: "demo-mock" },
  { id: "sanya", name: "Sanya", region: "Hainan", x: 64, y: 94, tags: "Beaches · Seafood · Coastal Roads", story: "A warm-water finish for travelers who value easy services and unhurried coast days.", interestKeys: ["coast", "food", "beaches"], terrain: "coastal", provenance: "demo-mock" },
  { id: "urumqi", name: "Urumqi", region: "Xinjiang", x: 19, y: 25, tags: "Desert Roads · Silk Road Horizons", story: "A launch point for huge distances, remote services and some of China’s most cinematic open roads.", interestKeys: ["desert", "history", "views"], terrain: "desert", provenance: "demo-mock" },
];

export interface PrototypeRouteFact {
  from: string;
  to: string;
  distanceKm: number;
  drivingMinutes: number;
  feasibility: "straightforward" | "preparation" | "special" | "unknown";
  difficultyScore: number;
  wowScore: number;
  reason: string;
}

export const prototypeRouteFacts: PrototypeRouteFact[] = [
  { from: "guangzhou", to: "shenzhen", distanceKm: 142, drivingMinutes: 150, feasibility: "straightforward", difficultyScore: 1, wowScore: 1, reason: "Dense expressway network, frequent service facilities and many vehicle return options; scenery is mostly urban and expressway." },
  { from: "guangzhou", to: "guilin", distanceKm: 475, drivingMinutes: 355, feasibility: "straightforward", difficultyScore: 2, wowScore: 4, reason: "A long but legible expressway-led transition into karst country; split it if short days matter." },
  { from: "guilin", to: "yangshuo", distanceKm: 82, drivingMinutes: 95, feasibility: "straightforward", difficultyScore: 1, wowScore: 4, reason: "Short rural access with frequent services and a strong karst scenery payoff." },
  { from: "xian", to: "luoyang", distanceKm: 380, drivingMinutes: 260, feasibility: "straightforward", difficultyScore: 1, wowScore: 3, reason: "A straightforward expressway connection between two imperial-history anchors." },
  { from: "xian", to: "huashan", distanceKm: 124, drivingMinutes: 105, feasibility: "straightforward", difficultyScore: 1, wowScore: 4, reason: "A short expressway-led mountain outing with an exceptional cliffs-and-views payoff." },
  { from: "xian", to: "pingyao", distanceKm: 515, drivingMinutes: 310, feasibility: "straightforward", difficultyScore: 2, wowScore: 3, reason: "A longer northbound transfer that works best as a deliberate historic-road day." },
  { from: "kunming", to: "dali", distanceKm: 340, drivingMinutes: 265, feasibility: "straightforward", difficultyScore: 2, wowScore: 3, reason: "A well-used highland corridor; time and distance are demo estimates and should be verified." },
  { from: "dali", to: "shaxi", distanceKm: 130, drivingMinutes: 165, feasibility: "preparation", difficultyScore: 2, wowScore: 4, reason: "Paved mountain roads and a daylight arrival make this rewarding; route conditions need pre-drive checking." },
  { from: "shaxi", to: "lijiang", distanceKm: 105, drivingMinutes: 145, feasibility: "preparation", difficultyScore: 2, wowScore: 4, reason: "A compact mountain transfer with village scenery; old-town parking needs advance planning." },
  { from: "lijiang", to: "shangri-la", distanceKm: 175, drivingMinutes: 230, feasibility: "preparation", difficultyScore: 4, wowScore: 5, reason: "High-altitude mountain driving with major scenery; acclimatization, weather and daylight buffers matter." },
  { from: "chengdu", to: "siguniangshan", distanceKm: 220, drivingMinutes: 260, feasibility: "preparation", difficultyScore: 4, wowScore: 5, reason: "Mountain roads, altitude and changing conditions demand preparation despite the manageable distance." },
  { from: "chengdu", to: "kangding", distanceKm: 270, drivingMinutes: 285, feasibility: "preparation", difficultyScore: 4, wowScore: 5, reason: "Expressway and mountain sections climb quickly toward high altitude; weather and fatigue need conservative planning." },
  { from: "dali", to: "lhasa", distanceKm: 1850, drivingMinutes: 2400, feasibility: "special", difficultyScore: 5, wowScore: 5, reason: "This crosses an area with additional travel requirements for international visitors and cannot be treated as an ordinary self-drive route." },
  { from: "lhasa", to: "chengdu", distanceKm: 2000, drivingMinutes: 2700, feasibility: "special", difficultyScore: 5, wowScore: 5, reason: "Extreme distance, altitude and road complexity combine with additional international-visitor requirements." },
  { from: "haikou", to: "sanya", distanceKm: 285, drivingMinutes: 225, feasibility: "straightforward", difficultyScore: 1, wowScore: 3, reason: "Frequent services and approachable coastal roads make this one of the easier demo drives." },
];

export const prototypeDestinationFor = (id: string) => prototypeDestinations.find((destination) => destination.id === id);
