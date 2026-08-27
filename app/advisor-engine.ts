import type { AdvisorRecommendation, SignatureDrive } from "./product-domain.ts";
import { knowledgeClaims } from "./data/knowledge-catalog.ts";
import { signatureDrives } from "./data/product-content.ts";

const byId = (id: string) => signatureDrives.find((drive) => drive.id === id);
const ids = (...slugs: string[]) => slugs.map((slug) => signatureDrives.find((drive) => drive.slug === slug)!.id);
const label = (drive: SignatureDrive) => `${drive.name} (${drive.recommendedDays} days · ${drive.drivingDifficulty})`;

const preferenceSignals = (prompt: string) => {
  const text = prompt.toLowerCase();
  return [
    /scenic|mountain|landscape|风景|山/.test(text) ? "scenery" : null,
    /not.*tourist|quiet|crowd|hidden|不游客|小众|安静/.test(text) ? "quieter places" : null,
    /kid|family|children|孩子|家庭/.test(text) ? "family pace" : null,
    /2\s*h|two hour|2小时/.test(text) ? "maximum two-hour driving days" : null,
    /october|十月/.test(text) ? "October travel" : null,
    /no hotel|without hotel|不.*酒店/.test(text) ? "self-arranged stays" : null,
    /easy|first|简单|第一次/.test(text) ? "lower driving complexity" : null,
  ].filter(Boolean) as string[];
};

export function adviseRoadTrip(prompt: string, previous?: AdvisorRecommendation | null): AdvisorRecommendation {
  const text = prompt.trim().toLowerCase();
  let recommendedDriveIds: string[];
  let comparedDriveIds: string[] = [];
  let answer: string;
  let knowledgeClaimIdsUsed: string[] = [];
  let nextQuestion = "Which trade-off matters most: easier driving, quieter places, or bigger scenery?";

  if (/changed my mind|switch.*hainan|hainan|海南|改主意/.test(text)) {
    recommendedDriveIds = ids("hainan-coastal-loop");
    answer = "Hainan is the cleaner reset: it is the easiest drive in this collection, with frequent towns, coastal roads and a relaxed seven-day rhythm. It is content-ready in this demo, so I can reshape the journey and explain the trade-offs, but I will not fabricate bookable vehicle or hotel inventory.";
    nextQuestion = "Do you want surf-town energy, quieter coves, or the easiest family pace?";
  } else if (/yunnan.*sichuan|sichuan.*yunnan|云南.*四川/.test(text)) {
    recommendedDriveIds = ids("yunnan-hidden-china");
    comparedDriveIds = ids("yunnan-hidden-china", "western-sichuan-high-road");
    answer = "Yunnan is the easier of the two: moderate rather than challenging, with more mixed services and a gentler ten-day progression. Western Sichuan delivers bigger alpine drama, but adds high-altitude exposure, longer mountain days and more remote stretches. For a first China road trip, I would start with Yunnan.";
    nextQuestion = "Would you trade some alpine scale for slower village and food days?";
  } else if (/best.*mountain|mountain drives|山地.*路线|山路/.test(text)) {
    recommendedDriveIds = ids("western-sichuan-high-road", "yunnan-hidden-china", "xinjiang-open-horizon");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "Western Sichuan is the strongest pure mountain drive, with the biggest alpine drama and the most demanding road profile. Yunnan is the more approachable mountain-and-culture journey. Xinjiang delivers the largest scale and longest remote stages. Only Yunnan is connected to transaction-ready demo inventory.";
    nextQuestion = "Do you want the biggest alpine road, the easier cultural journey, or the widest horizons?";
  } else if (/2\s*h|two hour|2小时|120 minute/.test(text)) {
    recommendedDriveIds = ids("hainan-coastal-loop", "guangxi-karst-country");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "A hard two-hour daily limit does not fit the standard Yunnan or Western Sichuan drives. Hainan is the strongest match; Guangxi is the more rural alternative, though individual timings still require route verification. Both are content-ready here, so I can design the shape without pretending current inventory exists.";
    nextQuestion = "Would you rather follow the coast or move through karst countryside?";
  } else if (/kid|family|children|孩子|家庭/.test(text)) {
    recommendedDriveIds = ids("hainan-coastal-loop", "guangxi-karst-country", "yunnan-hidden-china");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "For children, Hainan has the lowest-stress road profile and frequent stops; Guangxi pairs shorter stages with countryside; Yunnan works when you choose the family variant and accept the gradual highland finish. I would not lead with Western Sichuan or Xinjiang for a first family drive.";
    nextQuestion = "How old are the children, and is altitude a concern for your family?";
  } else if (/foreigner|foreign.*drive|licen[cs]e|permit|外国|驾照|驾驶/.test(text)) {
    recommendedDriveIds = ids("hainan-coastal-loop", "yunnan-hidden-china");
    knowledgeClaimIdsUsed = ["claim-provisional-permit-required", "claim-short-term-documents"];
    answer = "Eligible foreign visitors generally need a provisional Chinese motor-vehicle driving permit; a home-country licence alone is not enough. The usual official checklist includes a passport, valid overseas licence, Chinese translation and ID photos, but city procedures vary. Use the readiness checker before treating any road trip as driveable.";
    nextQuestion = "Which country issued your licence, where will you arrive, and is the licence currently valid?";
  } else if (/no hotel|without hotel|skip hotel|不.*酒店|不要酒店/.test(text)) {
    recommendedDriveIds = ids("yunnan-hidden-china");
    answer = "Yes. On the Yunnan transaction-ready demo path, hotels are optional: you can keep the structured route and vehicle, skip stay selection, and still create a Trip that My Drive can operate. I will keep editorial stay ideas separate from anything you choose to book.";
    nextQuestion = "Would you like the ten-day Yunnan route with vehicle recommendations only?";
  } else if (/october|十月/.test(text) && (/scenic|mountain|landscape|风景|山/.test(text) || /big cit|城市/.test(text))) {
    recommendedDriveIds = ids("yunnan-hidden-china", "western-sichuan-high-road");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "For ten October days away from big cities, I would compare Yunnan and Western Sichuan. Yunnan combines villages, food and mountain scenery with a moderate road profile; Western Sichuan is more dramatic but challenging, high-altitude and less forgiving. Yunnan is the better first recommendation; Sichuan is the bolder alternative.";
    nextQuestion = "Is easier driving more important than the biggest alpine landscapes?";
  } else if (/10\s*days?.*(away|no|without).*(big cit)|10\s*天.*(城市|大城市)/.test(text)) {
    recommendedDriveIds = ids("yunnan-hidden-china", "western-sichuan-high-road", "xinjiang-open-horizon");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "For ten days away from big cities, Yunnan is the most balanced choice: villages, food and mountains with a moderate road profile. Western Sichuan is the high-alpine alternative; Xinjiang is the long-distance epic. The travel month will decide which seasonal windows actually fit.";
    nextQuestion = "Which month are you traveling, and how long is your maximum comfortable driving day?";
  } else if (/7\s*days?.*(coast|sea|beach)|coastal road trip|七天.*(海|海岸)/.test(text)) {
    recommendedDriveIds = ids("hainan-coastal-loop");
    answer = "Hainan is the clear seven-day coastal match: Haikou to Sanya through Wenchang, Wanning and Lingshui, with the collection's easiest road profile and frequent services. It is content-ready, so no vehicle or hotel inventory will be fabricated.";
    nextQuestion = "Do you prefer surf-town energy, quieter coves, or a family-first pace?";
  } else if (/sichuan|四川/.test(text)) {
    recommendedDriveIds = ids("western-sichuan-high-road");
    answer = "Western Sichuan is the high-alpine choice: Chengdu to Kangding, Xinduqiao and Siguniangshan, with challenging mountain driving, high altitude and remote stretches. It is content-ready in this demo, not transaction-ready.";
    nextQuestion = "Are you comfortable with five-hour mountain days and high-altitude exposure?";
  } else if (/xinjiang|新疆/.test(text)) {
    recommendedDriveIds = ids("xinjiang-open-horizon");
    answer = "Xinjiang is the long-distance epic: Urumqi to Dushanzi, Sayram Lake and Yining across 1,280 demo-content kilometres. It suits experienced road trippers who accept remote services and long stages; it is content-ready only.";
    nextQuestion = "Which summer month are you considering, and how comfortable are you with remote service stretches?";
  } else if (/guangxi|guilin|yangshuo|广西|桂林|阳朔/.test(text)) {
    recommendedDriveIds = ids("guangxi-karst-country");
    answer = "Guangxi is the gentler rural-south journey: Guilin, Yangshuo, Longji and Liuzhou through karst valleys and shorter driving days. It is an easy-to-moderate, family-friendly content-ready route without connected inventory.";
    nextQuestion = "Do you want the route optimized for family pace, food stops, or the quietest countryside?";
  } else if (/easy|first road trip|first.*china|简单|第一次/.test(text)) {
    recommendedDriveIds = ids("hainan-coastal-loop", "guangxi-karst-country", "yunnan-hidden-china");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "For an easy first China road trip, Hainan has the lowest-stress road profile and most frequent services. Guangxi adds rural karst scenery with shorter stages. Yunnan is a moderate step up, but it is the only route connected to the transaction-ready demo and has a family-paced variant.";
    nextQuestion = "Would you choose the easiest coast, rural scenery, or a richer mountain-and-culture journey?";
  } else if (/not.*tourist|quiet|hidden|crowd|小众|安静|不游客/.test(text)) {
    recommendedDriveIds = ids("yunnan-hidden-china", "guangxi-karst-country");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "Start with Yunnan for Shaxi, Bai villages and the long cultural reveal toward Shangri-La; choose Guangxi for shorter countryside stages among karst valleys. Both move beyond big-city China, but only Yunnan is transaction-ready in this demo.";
    nextQuestion = "Do you want mountain culture or a gentler rural south?";
  } else if (/yunnan|云南/.test(text)) {
    recommendedDriveIds = ids("yunnan-hidden-china");
    answer = "Yunnan is the collection's richest first road-trip product: a moderate ten-day progression through food, villages and mountain landscapes, ending at high altitude. It is also the only Signature Drive connected to the validated route and demo commerce path.";
    nextQuestion = "Would you prefer the essential seven, the ten-day signature journey, the family pace, or the slower twelve-day version?";
  } else {
    recommendedDriveIds = ids("yunnan-hidden-china", "hainan-coastal-loop", "guangxi-karst-country");
    comparedDriveIds = [...recommendedDriveIds];
    answer = "I would begin with three distinct road-trip rhythms: Yunnan for culture and mountains, Hainan for easy coastal freedom, and Guangxi for short rural stages. Tell me the month, trip length and maximum comfortable driving time and I will narrow them without inventing route facts.";
  }

  return {
    prompt,
    answer,
    recommendedDriveIds,
    comparedDriveIds,
    knowledgeClaimIdsUsed,
    learnedPreferences: [...new Set([...(previous?.learnedPreferences ?? []), ...preferenceSignals(prompt)])],
    nextQuestion,
  };
}

export function validateAdvisorRecommendation(result: AdvisorRecommendation, allowedDriveIds = signatureDrives.map((drive) => drive.id), allowedClaimIds = knowledgeClaims.map((claim) => claim.id)) {
  const driveIds = [...result.recommendedDriveIds, ...result.comparedDriveIds];
  return driveIds.every((id) => allowedDriveIds.includes(id) && Boolean(byId(id)))
    && result.knowledgeClaimIdsUsed.every((id) => allowedClaimIds.includes(id));
}

export function advisorDriveLabels(result: AdvisorRecommendation) {
  return result.recommendedDriveIds.map((id) => byId(id)).filter((drive): drive is SignatureDrive => Boolean(drive)).map(label);
}
