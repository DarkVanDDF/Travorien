import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adviseRoadTrip, validateAdvisorRecommendation } from "../app/advisor-engine.ts";
import { assessDrivingReadiness } from "../app/driving-readiness.ts";
import { knowledgeClaims, knowledgeSources, guides } from "../app/data/knowledge-catalog.ts";
import { signatureDrives } from "../app/data/product-content.ts";
import { createPlanningSessionFromSeed, generateHotelOffers, generateVehicleOffers } from "../app/planning-engine.ts";
import { canEnterSelfDriveFromReadiness, parseReadinessSession } from "../app/readiness-session.ts";

test("five Signature Drives have unique product identities and primary media", () => {
  assert.equal(signatureDrives.length, 5);
  assert.equal(new Set(signatureDrives.map((drive) => drive.id)).size, 5);
  assert.equal(new Set(signatureDrives.map((drive) => drive.slug)).size, 5);
  assert.equal(new Set(signatureDrives.map((drive) => drive.heroMedia.imageUrl)).size, 5);
  assert.ok(signatureDrives.every((drive) => drive.heroMedia.sourceUrl.startsWith("https://commons.wikimedia.org/")));
});

test("only Yunnan crosses the explicit content-to-transaction boundary", () => {
  const transactionReady = signatureDrives.filter((drive) => drive.transactionStatus === "transaction-ready-demo");
  assert.deepEqual(transactionReady.map((drive) => drive.slug), ["yunnan-hidden-china"]);
  assert.ok(transactionReady[0].routeBinding);
  assert.ok(signatureDrives.filter((drive) => drive.transactionStatus === "content-ready").every((drive) => !drive.routeBinding && drive.catalogDestinationIds.length === 0));
});

test("Yunnan is a rich ten-day product with executable variants", () => {
  const yunnan = signatureDrives.find((drive) => drive.slug === "yunnan-hidden-china");
  assert.equal(yunnan.dailyJourney.length, 10);
  assert.deepEqual(yunnan.dailyJourney.map((day) => day.dayNumber), [1,2,3,4,5,6,7,8,9,10]);
  assert.deepEqual(yunnan.alternativeVersions.map((variant) => variant.days).sort((a,b) => a-b), [7,10,12]);
  assert.ok(yunnan.alternativeVersions.every((variant) => variant.executable));
  assert.equal(yunnan.dailyJourney.reduce((sum, day) => sum + day.distanceKm, 0), yunnan.distanceKm);
  assert.equal(Math.round(yunnan.dailyJourney.reduce((sum, day) => sum + day.estimatedDrivingMinutes, 0) / 6) / 10, yunnan.estimatedDrivingHours);
});

test("every executable Yunnan variant builds a graph-valid route with its declared duration", () => {
  const yunnan = signatureDrives.find((drive) => drive.slug === "yunnan-hidden-china");
  for (const variant of yunnan.alternativeVersions) {
    const session = createPlanningSessionFromSeed({ kind: "signature-drive", driveId: yunnan.id, variantId: variant.id }, `variant-${variant.id}`);
    assert.equal(session.stage, "ROUTE_PROPOSAL", variant.id);
    assert.equal(session.routePlan.days.length, variant.days, variant.id);
    assert.deepEqual(session.routePlan.destinationIds, variant.stopIds, variant.id);
  }
});

test("policy knowledge is source-bound and date-stamped", () => {
  const sourceIds = new Set(knowledgeSources.map((source) => source.id));
  for (const claim of knowledgeClaims.filter((item) => item.status === "VERIFIED")) {
    assert.ok(claim.lastVerifiedAt);
    assert.ok(claim.sourceIds.length > 0);
    assert.ok(claim.sourceIds.every((id) => sourceIds.has(id)));
  }
  assert.ok(knowledgeSources.every((source) => source.url.startsWith("https://") && source.lastVerifiedAt === "2026-08-25"));
});

test("readiness matches the exact German-Beijing rule and fails safely elsewhere", () => {
  const beijing = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: true, arrivalCity: "Beijing", stayDays: 14 });
  assert.equal(beijing.status, "ACTION_REQUIRED");
  assert.match(beijing.headline, /likely able to apply/i);
  assert.ok(beijing.sourceIds.includes("source-beijing-german-licence-2026"));
  const noLicence = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: false, arrivalCity: "Beijing", stayDays: 14 });
  assert.equal(noLicence.status, "NOT_ELIGIBLE");
  const unmatched = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: true, arrivalCity: "Kunming", stayDays: 14 });
  assert.equal(unmatched.status, "UNKNOWN");
  const missing = assessDrivingReadiness({ nationality: "", licenceCountry: "", hasValidForeignLicence: null, arrivalCity: "", stayDays: null });
  assert.equal(missing.status, "NEEDS_INFORMATION");
});

test("the seven required advisor questions remain inside the knowledge catalog", () => {
  const prompts = [
    "Scenic, but not touristy",
    "Yunnan or Sichuan—which is easier?",
    "Maximum two hours driving per day",
    "A road trip with kids",
    "Can foreigners drive in China?",
    "Route and car, no hotels",
    "I changed my mind—Hainan",
  ];
  for (const prompt of prompts) assert.equal(validateAdvisorRecommendation(adviseRoadTrip(prompt)), true, prompt);
  assert.deepEqual(adviseRoadTrip(prompts[1]).comparedDriveIds.length, 2);
  assert.ok(!adviseRoadTrip(prompts[2]).recommendedDriveIds.includes("drive-yunnan-hidden-china"));
  assert.ok(adviseRoadTrip(prompts[4]).knowledgeClaimIdsUsed.includes("claim-provisional-permit-required"));
  assert.deepEqual(adviseRoadTrip(prompts[6]).recommendedDriveIds, ["drive-hainan-coastal-loop"]);
});

test("homepage and direct-region prompts resolve to intentional Signature Drives", () => {
  const cases = [
    ["A slow road trip through Yunnan", "drive-yunnan-hidden-china"],
    ["China's best mountain drives", "drive-western-sichuan-high-road"],
    ["10 days away from big cities", "drive-yunnan-hidden-china"],
    ["A family road trip in China", "drive-hainan-coastal-loop"],
    ["7 days on the coast", "drive-hainan-coastal-loop"],
    ["Take me to Western Sichuan", "drive-western-sichuan-high-road"],
    ["I want Xinjiang", "drive-xinjiang-open-horizon"],
    ["Show me Guangxi", "drive-guangxi-karst-country"],
  ];
  for (const [prompt, expected] of cases) {
    const recommendation = adviseRoadTrip(prompt);
    assert.equal(recommendation.recommendedDriveIds[0], expected, prompt);
    assert.equal(validateAdvisorRecommendation(recommendation), true, prompt);
  }
  assert.equal(validateAdvisorRecommendation(adviseRoadTrip("Surprise me")), true);
});

test("advisor keeps learned preferences across a destination comparison turn", () => {
  const first = adviseRoadTrip("I want somewhere scenic but not too touristy");
  const second = adviseRoadTrip("Yunnan or Sichuan—which is easier?", first);
  assert.ok(second.learnedPreferences.includes("scenery"));
  assert.ok(second.learnedPreferences.includes("quieter places"));
  assert.deepEqual(second.comparedDriveIds, ["drive-yunnan-hidden-china", "drive-western-sichuan-high-road"]);
});

test("advisor validation rejects invented Drive and policy claim IDs", () => {
  const canonical = adviseRoadTrip("A slow road trip through Yunnan");
  assert.equal(validateAdvisorRecommendation({ ...canonical, recommendedDriveIds: ["drive-invented"] }), false);
  assert.equal(validateAdvisorRecommendation({ ...canonical, knowledgeClaimIdsUsed: ["claim-invented"] }), false);
});

test("all entry seeds converge on PlanningSession authority and editorial drives cannot create a route", () => {
  const yunnan = signatureDrives.find((drive) => drive.slug === "yunnan-hidden-china");
  const seeded = createPlanningSessionFromSeed({ kind: "signature-drive", driveId: yunnan.id });
  assert.equal(seeded.stage, "ROUTE_PROPOSAL");
  assert.equal(seeded.routePlan.destinationIds[0], "kunming");
  const hainan = signatureDrives.find((drive) => drive.slug === "hainan-coastal-loop");
  const editorial = createPlanningSessionFromSeed({ kind: "signature-drive", driveId: hainan.id });
  assert.equal(editorial.stage, "DISCOVERY");
  assert.equal(editorial.routePlan, null);
});

test("readiness seeds carry eligible context but never upgrade unresolved or ineligible users", () => {
  const yunnan = signatureDrives.find((drive) => drive.slug === "yunnan-hidden-china");
  const actionRequired = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: true, arrivalCity: "Beijing", stayDays: 14 });
  const carried = createPlanningSessionFromSeed({ kind: "readiness", assessment: actionRequired, selectedDriveId: yunnan.id }, "readiness-action");
  assert.equal(carried.stage, "ROUTE_PROPOSAL");
  assert.match(carried.conversation[0].text, /readiness result is carried/i);
  const notEligible = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: false, arrivalCity: "Beijing", stayDays: 14 });
  const blocked = createPlanningSessionFromSeed({ kind: "readiness", assessment: notEligible, selectedDriveId: yunnan.id }, "readiness-blocked");
  assert.equal(blocked.stage, "DISCOVERY");
  assert.equal(blocked.routePlan, null);
  assert.equal(blocked.intent.drivingLicenceStatus, "no-licence");
  const unresolved = assessDrivingReadiness({ nationality: "", licenceCountry: "", hasValidForeignLicence: null, arrivalCity: "", stayDays: null });
  const unknown = createPlanningSessionFromSeed({ kind: "readiness", assessment: unresolved, selectedDriveId: yunnan.id }, "readiness-unresolved");
  assert.equal(unknown.stage, "DISCOVERY");
  assert.equal(unknown.intent.drivingLicenceStatus, "unknown");
});

test("readiness URL entry fails closed when its one-time assessment is missing or malformed", () => {
  const valid = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: true, arrivalCity: "Beijing", stayDays: 14 });
  assert.equal(canEnterSelfDriveFromReadiness(false, null), true);
  assert.equal(canEnterSelfDriveFromReadiness(true, null), false);
  assert.equal(canEnterSelfDriveFromReadiness(true, parseReadinessSession("not-json")), false);
  assert.equal(canEnterSelfDriveFromReadiness(true, valid), true);
  const blocked = assessDrivingReadiness({ nationality: "Germany", licenceCountry: "Germany", hasValidForeignLicence: false, arrivalCity: "Beijing", stayDays: 14 });
  assert.equal(canEnterSelfDriveFromReadiness(true, blocked), false);
});

test("journey context produces auditable vehicle reasons and road-fit hotel ranking", () => {
  const yunnan = signatureDrives.find((drive) => drive.slug === "yunnan-hidden-china");
  const session = createPlanningSessionFromSeed({ kind: "signature-drive", driveId: yunnan.id });
  const vehicles = generateVehicleOffers(session.intent, session.routePlan, undefined, "2026-08-25T00:00:00.000Z");
  assert.ok(vehicles.length > 0);
  assert.ok(vehicles.every((offer) => offer.recommendationReasons.some((reason) => reason.includes(`${session.routePlan.distanceKm} km`))));
  const hotels = generateHotelOffers({ ...session.intent, accommodationPreference: "local-character" }, session.routePlan, undefined, "2026-08-25T00:00:00.000Z");
  assert.ok(hotels.length > 0);
  assert.ok(hotels.filter((offer) => offer.rank === 1).every((offer) => offer.parkingType !== "unknown"));
  assert.ok(hotels.some((offer) => offer.parkingDistanceMeters !== null && offer.vehicleAccess !== "unknown"));
});

test("Guides expose SEO metadata, related products and sources", () => {
  assert.ok(guides.length >= 4);
  assert.deepEqual([...new Set(guides.map((guide) => guide.category))].sort(), ["destination", "driving", "inspiration", "road-trips"]);
  assert.equal(new Set(guides.map((guide) => guide.slug)).size, guides.length);
  assert.ok(guides.every((guide) => guide.seoTitle && guide.seoDescription && guide.relatedDriveIds.length > 0));
});

test("My Drive presents consumer road updates without Runtime console naming", async () => {
  const source = await readFile(new URL("../app/RoadTripApp.tsx", import.meta.url), "utf8");
  assert.match(source, /My Drive/);
  assert.match(source, /Road updates/);
  assert.match(source, /Fuel plan · demo/);
  assert.match(source, /Navigation note · demo/);
  assert.doesNotMatch(source, /today/i);
  for (const forbidden of ["Reality runtime", "Trip Operations", "Runtime boundary", "exercise the Runtime", "Decision recorded", "entry.detail", "sourceType}</", "mitigationStatus}</"]) assert.doesNotMatch(source, new RegExp(forbidden));
});
