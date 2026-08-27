import type { Guide, KnowledgeClaim, RoadTripKnowledgeCatalog, SourceProvenance } from "../product-domain.ts";
import { signatureDrives } from "./product-content.ts";

export const knowledgeSources: SourceProvenance[] = [
  {
    id: "source-state-council-expat-guide-2025",
    name: "2025 Guide to Working and Living in China",
    url: "https://english.www.gov.cn/2025special/bizexpatsinchina2025",
    publisher: "State Council of the People's Republic of China",
    lastVerifiedAt: "2026-08-25",
    status: "VERIFIED",
    note: "Official English-language guide covering temporary driving permission and rental preparation for visitors.",
  },
  {
    id: "source-beijing-german-licence-2026",
    name: "Can I drive in Beijing with a German driver's license?",
    url: "https://english.beijing.gov.cn/specials/beijinginboundtour/faqs/202601/t20260119_4446163.html",
    publisher: "Beijing Municipal Government",
    lastVerifiedAt: "2026-08-25",
    status: "VERIFIED",
    note: "Official Beijing FAQ updated January 19, 2026; location-specific and not a nationwide eligibility guarantee.",
  },
  {
    id: "source-beijing-overseas-licence",
    name: "Overseas Motor Vehicle Driving Licence Services",
    url: "https://english.bjsjs.gov.cn/services/servicesdrivinglicense/yhx1/",
    publisher: "Beijing Municipal Government",
    lastVerifiedAt: "2026-08-25",
    status: "VERIFIED",
    note: "Official Beijing service page stating that International Driving Permit applications are not accepted.",
  },
  {
    id: "source-shanghai-temporary-permit-2026",
    name: "How to apply for a temporary driving permit",
    url: "https://english.shanghai.gov.cn/en-Transportation/20241212/bd0bcbb71e234bf1807d808490a5fa4a.html",
    publisher: "Shanghai Municipal Government / Traffic Police Corps",
    lastVerifiedAt: "2026-08-25",
    status: "VERIFIED",
    note: "Official English guide updated January 14, 2026. Procedures and locations are Shanghai-specific.",
  },
  {
    id: "source-road-traffic-law",
    name: "Road Traffic Safety Law of the People's Republic of China",
    url: "https://www.samr.gov.cn/zljds/zcfg/art/2023/art_18130867b0fd4e07a3d98c451497ea19.html",
    publisher: "State Administration for Market Regulation",
    lastVerifiedAt: "2026-08-25",
    status: "VERIFIED",
    note: "Official Chinese text used only for stable core road-law principles in this demo.",
  },
  {
    id: "source-mfa-traffic-safety",
    name: "Overseas travel traffic safety guidance",
    url: "https://www.fmprc.gov.cn/web/lbfw_673061/lbzn_673063/202201/t20220114_10495538.shtml",
    publisher: "Ministry of Foreign Affairs of the People's Republic of China",
    lastVerifiedAt: "2026-08-25",
    status: "VERIFIED",
    note: "Official safety guidance, including the 122 road-traffic police number.",
  },
];

export const knowledgeClaims: Array<KnowledgeClaim<unknown>> = [
  { id: "claim-provisional-permit-required", value: "A valid home-country licence alone is not sufficient; a provisional Chinese motor-vehicle driving permit is required for eligible short-term visitors.", status: "VERIFIED", sourceIds: ["source-state-council-expat-guide-2025"], lastVerifiedAt: "2026-08-25" },
  { id: "claim-short-term-documents", value: ["Passport and entry documents", "Valid overseas driving licence", "Chinese translation of the licence", "ID photos"], status: "VERIFIED", sourceIds: ["source-state-council-expat-guide-2025", "source-beijing-german-licence-2026", "source-shanghai-temporary-permit-2026"], lastVerifiedAt: "2026-08-25", caveat: "Exact translation providers, forms, locations and extra documents vary by issuing city." },
  { id: "claim-german-beijing-can-apply", value: "A visitor holding a valid German driving licence can apply in person in Beijing using the documents listed by the city authority.", status: "VERIFIED", sourceIds: ["source-beijing-german-licence-2026"], lastVerifiedAt: "2026-08-25", caveat: "This means likely able to apply, not guaranteed issuance or permission to drive before approval." },
  { id: "claim-idp-not-accepted-beijing", value: "Beijing does not accept an International Driving Permit as the driving-permit application itself.", status: "VERIFIED", sourceIds: ["source-beijing-overseas-licence"], lastVerifiedAt: "2026-08-25", caveat: "Carry the original overseas licence and follow the local provisional-permit procedure." },
  { id: "claim-keep-permit-documents", value: "Shanghai guidance says travelers should carry the provisional permit together with the overseas licence and Chinese translation.", status: "VERIFIED", sourceIds: ["source-shanghai-temporary-permit-2026"], lastVerifiedAt: "2026-08-25", caveat: "The cited procedure is Shanghai-specific; confirm local practice at the issuing office." },
  { id: "claim-drive-right", value: "Road traffic in mainland China keeps to the right and drivers must obey traffic signals and posted controls.", status: "VERIFIED", sourceIds: ["source-road-traffic-law"], lastVerifiedAt: "2026-08-25" },
  { id: "claim-seatbelts", value: "Drivers and passengers must use seat belts where the vehicle is equipped with them.", status: "VERIFIED", sourceIds: ["source-road-traffic-law"], lastVerifiedAt: "2026-08-25" },
  { id: "claim-traffic-police-122", value: "Call 122 for road-traffic police in an accident and preserve the scene unless urgent safety requires otherwise.", status: "VERIFIED", sourceIds: ["source-mfa-traffic-safety"], lastVerifiedAt: "2026-08-25" },
];

const mediaFor = (driveId: string) => signatureDrives.find((drive) => drive.id === driveId)!.heroMedia;

export const guides: Guide[] = [
  {
    id: "guide-foreigners-driving-china", slug: "can-foreigners-drive-in-china", category: "driving",
    title: "Can foreigners drive in China?", standfirst: "Usually, eligible visitors need a provisional Chinese permit before taking the keys. Here is the verified part—and what still depends on the issuing city.", readingMinutes: 6,
    sections: [
      { id: "guide-drive-answer", heading: "The short answer", body: ["A foreign licence by itself is not enough for mainland China. Eligible short-term visitors can apply for a provisional Chinese motor-vehicle driving permit.", "Treat approval as a pre-drive task, never as something the rental desk can improvise after pickup."], claimIds: ["claim-provisional-permit-required"] },
      { id: "guide-drive-documents", heading: "What to prepare", body: ["Official guides consistently list a passport, valid overseas licence, Chinese translation and ID photos. Local issuing offices may add forms or specify accepted translation providers.", "An IDP is not a substitute for Beijing's provisional-permit process."], claimIds: ["claim-short-term-documents", "claim-idp-not-accepted-beijing"] },
      { id: "guide-drive-boundary", heading: "What Travorien can—and cannot—say", body: ["Our checker can match your answers to a current, cited city rule. It cannot issue a permit, guarantee approval or replace the local traffic authority.", "If we do not have a verified rule for your arrival city and licence combination, the result is Unknown—not a guess."], claimIds: [] },
    ],
    relatedDriveIds: ["drive-yunnan-hidden-china", "drive-hainan-coastal-loop"], relatedGuideIds: ["guide-first-road-trip-china"], seoTitle: "Can Foreigners Drive in China? | Verified Visitor Guide", seoDescription: "A source-bound guide to provisional driving permits, documents and the limits of foreign licences in mainland China.", heroMedia: mediaFor("drive-yunnan-hidden-china"), sourceIds: ["source-state-council-expat-guide-2025", "source-beijing-german-licence-2026", "source-beijing-overseas-licence", "source-shanghai-temporary-permit-2026"], provenance: "demo-content",
  },
  {
    id: "guide-first-road-trip-china", slug: "first-road-trip-in-china", category: "road-trips",
    title: "Your first road trip in China", standfirst: "Choose a forgiving rhythm before you choose a famous place: daylight arrivals, short stages and parking you can understand.", readingMinutes: 7,
    sections: [
      { id: "guide-first-route", heading: "Start with the road, not the checklist", body: ["Hainan is the gentlest route in this demo collection; Guangxi keeps stages shorter; Yunnan offers the richest content-to-transaction path but finishes at altitude.", "Western Sichuan and Xinjiang reward experienced road trippers who accept longer, more remote days."], claimIds: [] },
      { id: "guide-first-parking", heading: "Treat parking as part of the stay", body: ["A beautiful old-town hotel can be a poor road-trip hotel if the car stops far away or late arrival is difficult. Travorien ranks those attributes separately from generic hotel style."], claimIds: [] },
      { id: "guide-first-road-law", heading: "Stable road basics", body: ["Mainland China drives on the right. Follow signals and posted controls, use seat belts and keep the official traffic-police number 122 in your road notes."], claimIds: ["claim-drive-right", "claim-seatbelts", "claim-traffic-police-122"] },
    ],
    relatedDriveIds: ["drive-hainan-coastal-loop", "drive-guangxi-karst-country", "drive-yunnan-hidden-china"], relatedGuideIds: ["guide-foreigners-driving-china"], seoTitle: "First Road Trip in China | Route, Parking and Driving Guide", seoDescription: "How to select a lower-stress China self-drive route and plan daylight arrivals, parking and road basics.", heroMedia: mediaFor("drive-hainan-coastal-loop"), sourceIds: ["source-road-traffic-law", "source-mfa-traffic-safety"], provenance: "demo-content",
  },
  {
    id: "guide-yunnan-hidden", slug: "yunnan-beyond-the-old-towns", category: "inspiration",
    title: "Yunnan beyond the old towns", standfirst: "The famous stops frame the route; the freedom lives in village mornings, highland food and the open road between them.", readingMinutes: 5,
    sections: [
      { id: "guide-yunnan-pace", heading: "Why ten days works", body: ["Ten days leaves room for two keys-down days and a gradual northward progression from Kunming to Shangri-La.", "The route metrics, suggested stays and timings in this demo are structured editorial content—not live road or supplier data."], claimIds: [] },
      { id: "guide-yunnan-between", heading: "The places between", body: ["Shaxi changes the emotional pace of the journey. Baisha and the villages around Erhai make the car useful without turning every day into a transfer."], claimIds: [] },
    ],
    relatedDriveIds: ["drive-yunnan-hidden-china"], relatedGuideIds: ["guide-first-road-trip-china"], seoTitle: "Yunnan Beyond the Old Towns | Travorien Guide", seoDescription: "A slower editorial guide to the villages, food and road-trip rhythm between Kunming and Shangri-La.", heroMedia: mediaFor("drive-yunnan-hidden-china"), sourceIds: [], provenance: "demo-content",
  },
  {
    id: "guide-shaxi-road-trippers", slug: "shaxi-for-road-trippers", category: "destination",
    title: "Shaxi for road trippers", standfirst: "Arrive in daylight, leave the car at the edge of Sideng and let a Tea Horse Road town turn one transfer into two slower days.", readingMinutes: 6,
    sections: [
      { id: "guide-shaxi-why", heading: "Why stop here", body: ["Shaxi is where the Yunnan drive changes pace. The old market square, valley paths and village workshops reward a full keys-down day rather than a rushed lunch stop.", "Two nights create room for a daylight arrival, one unhurried local day and a calm departure toward Lijiang."], claimIds: [] },
      { id: "guide-shaxi-arrival", heading: "Route in and arrival rhythm", body: ["The demo route approaches from Dali on paved provincial mountain roads. Leave in the morning and keep buffer for viewpoints and a daylight arrival.", "Do not follow an unverified narrow shortcut simply because a navigation app suggests it. Current road access must be checked before travel."], claimIds: [] },
      { id: "guide-shaxi-parking", heading: "Parking and staying with a car", body: ["Sideng's historic core is best treated as pedestrian. Choose a stay that can name the overnight lot, walking distance and luggage-transfer arrangement before arrival.", "The most atmospheric courtyard is not automatically the best road-trip stay; reliable edge-of-town vehicle access and late-arrival handling matter."], claimIds: [] },
      { id: "guide-shaxi-nearby", heading: "Nearby drives and practical stops", body: ["Shibao Mountain and the surrounding valley make better optional excursions than adding another long transfer. Start the next leg with sufficient fuel and keep the car parked during the market-town day.", "All route, parking, crowd and stay notes on this page are demo editorial guidance and require verification before travel."], claimIds: [] },
    ],
    relatedDriveIds: ["drive-yunnan-hidden-china"], relatedGuideIds: ["guide-yunnan-hidden", "guide-first-road-trip-china"], seoTitle: "Shaxi for Road Trippers | Parking, Arrival and Nearby Drives", seoDescription: "A road-tripper's guide to Shaxi: how long to stay, where to park, when to arrive and how it fits the Yunnan drive.", heroMedia: signatureDrives.find((drive) => drive.id === "drive-yunnan-hidden-china")!.gallery[0], sourceIds: [], provenance: "demo-content",
  },
];

export const roadTripKnowledgeCatalog: RoadTripKnowledgeCatalog = {
  version: "consumer-v2.0",
  snapshotId: "road-trip-knowledge-2026-08-25",
  drives: signatureDrives,
  guides,
  claims: knowledgeClaims,
  sources: knowledgeSources,
};

export const sourceFor = (id: string) => knowledgeSources.find((source) => source.id === id);
export const guideFor = (slug: string) => guides.find((guide) => guide.slug === slug);
