import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyPrototypeMapAction,
  calculateRouteInsight,
  canContinuePrototypeSelfDrive,
  createJourneyPrototypeState,
  interpretPrototypePrompt,
  prototypeHandoffPrompt,
  recommendSurpriseDestinations,
  surpriseSelectionAction,
} from "../app/prototype-engine.ts";
import { assessDrivingReadiness } from "../app/driving-readiness.ts";
import { presentReadiness } from "../app/readiness-presentation.ts";
import { createPlanningSessionFromSeed } from "../app/planning-engine.ts";

test("the prototype map is immutable and supports add, remove, reorder, clear, and undo", () => {
  const empty = createJourneyPrototypeState();
  const guangzhou = applyPrototypeMapAction(empty, { type: "add", destinationId: "guangzhou" });
  const route = applyPrototypeMapAction(guangzhou, { type: "add", destinationId: "guilin" });
  assert.deepEqual(empty.destinationIds, []);
  assert.deepEqual(route.destinationIds, ["guangzhou", "guilin"]);
  const reordered = applyPrototypeMapAction(route, { type: "reorder", fromIndex: 1, toIndex: 0 });
  assert.deepEqual(reordered.destinationIds, ["guilin", "guangzhou"]);
  const removed = applyPrototypeMapAction(reordered, { type: "remove", destinationId: "guangzhou" });
  assert.deepEqual(removed.destinationIds, ["guilin"]);
  assert.deepEqual(applyPrototypeMapAction(removed, { type: "undo" }).destinationIds, ["guilin", "guangzhou"]);
  const cleared = applyPrototypeMapAction(route, { type: "clear" });
  assert.deepEqual(cleared.destinationIds, []);
  assert.deepEqual(applyPrototypeMapAction(cleared, { type: "undo" }).destinationIds, ["guangzhou", "guilin"]);
});

test("Guangzhou to Shenzhen is easy, straightforward, and low-wow", () => {
  const insight = calculateRouteInsight(["guangzhou", "shenzhen"]);
  assert.equal(insight?.feasibility.level, "Straightforward");
  assert.equal(insight?.difficulty.level, "Easy");
  assert.equal(insight?.wow.level, "Low");
  assert.match(insight?.wow.reason ?? "", /urban|expressway/i);
  assert.equal(insight?.provenance, "demo-mock");
  assert.equal(insight?.metricsStatus, "demo-known");
});

test("a Yunnan to Tibet to Sichuan route fails to special requirements first", () => {
  const insight = calculateRouteInsight(["dali", "lhasa", "chengdu"]);
  assert.equal(insight?.feasibility.level, "Special requirements");
  assert.equal(insight?.difficulty.level, "Extreme");
  assert.equal(insight?.wow.level, "Exceptional");
  assert.match(insight?.feasibility.reason ?? "", /additional travel requirements/i);
  assert.equal(canContinuePrototypeSelfDrive(createJourneyPrototypeState(), insight), false);
});

test("unknown route segments do not present prototype geometry as verified metrics", () => {
  const insight = calculateRouteInsight(["urumqi", "sanya"]);
  assert.equal(insight?.feasibility.level, "Unknown");
  assert.equal(insight?.metricsStatus, "unknown");
  assert.equal(canContinuePrototypeSelfDrive(createJourneyPrototypeState(), insight), false);
});

test("route insight reflects the traveler hard daily-driving ceiling", () => {
  const insight = calculateRouteInsight(["guangzhou", "guilin"], 120);
  assert.equal(insight?.feasibility.level, "Preparation needed");
  assert.match(insight?.feasibility.reason ?? "", /120-minute daily limit/i);
});

test("Surprise Me from Xi'an prioritizes three distinct nearby road stories", () => {
  const state = applyPrototypeMapAction(createJourneyPrototypeState(), { type: "add", destinationId: "xian" });
  const recommendations = recommendSurpriseDestinations({ ...state, planningBehavior: "wanderer" });
  assert.deepEqual(recommendations.map((item) => item.destinationId), ["luoyang", "huashan", "pingyao"]);
  assert.ok(recommendations.every((item) => item.provenance === "demo-mock"));
  const emptySelection = surpriseSelectionAction(createJourneyPrototypeState(), "luoyang");
  assert.deepEqual(emptySelection, { type: "set-route", destinationIds: ["xian", "luoyang"] });
  assert.deepEqual(applyPrototypeMapAction(createJourneyPrototypeState(), emptySelection).destinationIds, ["xian", "luoyang"]);
});

test("readiness presentation never upgrades blocked, incomplete, or unknown results", () => {
  const base = { nationality: "Germany", licenceCountry: "Germany", arrivalCity: "Beijing", stayDays: 10 };
  const action = assessDrivingReadiness({ ...base, hasValidForeignLicence: true });
  const blocked = assessDrivingReadiness({ ...base, hasValidForeignLicence: false });
  const incomplete = assessDrivingReadiness({ ...base, hasValidForeignLicence: null });
  const unknown = assessDrivingReadiness({ ...base, hasValidForeignLicence: true, arrivalCity: "Xi'an" });
  assert.deepEqual([presentReadiness(action).label, presentReadiness(blocked).label, presentReadiness(incomplete).label, presentReadiness(unknown).label], ["ACTION REQUIRED", "NOT ELIGIBLE", "NEEDS INFORMATION", "UNKNOWN"]);
  assert.equal(presentReadiness(action).mayContinueSelfDrive, true);
  assert.equal(presentReadiness(blocked).mayContinueSelfDrive, false);
  assert.equal(presentReadiness(incomplete).mayContinueSelfDrive, false);
  assert.equal(presentReadiness(unknown).mayContinueSelfDrive, false);
  const easyInsight = calculateRouteInsight(["guangzhou", "shenzhen"]);
  assert.equal(canContinuePrototypeSelfDrive({ ...createJourneyPrototypeState(), readiness: blocked }, easyInsight), false);
});

test("advisor scenarios begin with traveler jobs rather than inventory fields", () => {
  const empty = createJourneyPrototypeState();
  const readiness = interpretPrototypePrompt("Can foreigners actually drive in China?", empty);
  assert.equal(readiness.uiSurface, "readiness");
  assert.match(readiness.humanResponse, /temporary driving-permit/i);
  assert.doesNotMatch(readiness.humanResponse, /budget/i);

  const historyFood = interpretPrototypePrompt("I have 10 days in China. I love history and food, but I hate big cities.", empty);
  assert.deepEqual(historyFood.suggestedDestinationIds.slice(0, 3), ["xian", "luoyang", "pingyao"]);
  assert.match(historyFood.humanResponse, /imperial|history/i);

  const comparison = interpretPrototypePrompt("Yunnan or Sichuan—which is easier to drive?", empty);
  assert.match(comparison.humanResponse, /Yunnan is usually the more approachable/i);
  assert.equal(comparison.candidateJourneys.length, 2);

  const surprise = interpretPrototypePrompt("I hate planning. Surprise me.", empty);
  assert.equal(surprise.uiSurface, "surprise");
  assert.equal(surprise.intentPatch.planningBehavior, "wanderer");
  assert.equal(surprise.suggestedDestinationIds.length, 3);
});

test("chat proposals operate on the same map state and respect drive limits", () => {
  const empty = createJourneyPrototypeState();
  const start = interpretPrototypePrompt("Start me in Guangzhou.", empty);
  assert.deepEqual(start.mapActions, [{ type: "set-route", destinationIds: ["guangzhou"] }]);
  let route = applyPrototypeMapAction(empty, start.mapActions[0]);
  route = applyPrototypeMapAction(route, { type: "add", destinationId: "guilin" });
  const correction = interpretPrototypePrompt("Remove Guilin and take me somewhere with mountains.", route);
  assert.ok(correction.mapActions.some((action) => action.type === "remove" && action.destinationId === "guilin"));
  assert.ok(correction.suggestedDestinationIds.includes("siguniangshan"));
  const constrained = interpretPrototypePrompt("I don't want to drive more than two hours a day.", route);
  assert.equal(constrained.intentPatch.maxDailyDrivingMinutes, 120);
  assert.match(constrained.humanResponse, /hard daily-driving ceiling/i);
  const ordered = interpretPrototypePrompt("Add Lhasa and Chengdu.", empty);
  assert.deepEqual(ordered.mapActions, [{ type: "add", destinationId: "lhasa" }, { type: "add", destinationId: "chengdu" }]);
});

test("live advisor context is broad and fallback remains an explicit user action", () => {
  const api = readFileSync(new URL("../app/api/advisor/route.ts", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../app/PrototypeFirstScreen.tsx", import.meta.url), "utf8");
  for (const expected of ["COMPLETE PROTOTYPE CONVERSATION", "CURRENT SHARED JOURNEY STATE", "CURRENT ROUTE INSIGHT", "CURRENT AUTHORITATIVE TRIP CONTEXT", "BOUNDED DEMO DESTINATION KNOWLEDGE", "VERIFIED POLICY FACTS"]) assert.match(api, new RegExp(expected));
  assert.match(api, /humanResponse/);
  assert.match(api, /mapActions/);
  assert.match(ui, /Use clearly labeled demo guidance/);
  assert.match(ui, /No demo answer was substituted/);
  assert.doesNotMatch(ui, /catch\([^)]*\)\s*\{[^}]*applyProposal\([^}]*demo-guidance/s);
});

test("the typed prototype handoff preserves route, job, behavior, constraints, and insight", () => {
  const insight = calculateRouteInsight(["kunming", "dali"]);
  assert.ok(insight);
  const handoff = { kind: "prototype-journey", destinationIds: ["kunming", "dali"], jobToBeDone: "I want food and villages, not a group tour", interests: ["food", "villages"], planningBehavior: "flexible-explorer", maxDailyDrivingMinutes: 180, season: "October", readiness: null, readinessContext: null, routeInsight: insight };
  const prompt = prototypeHandoffPrompt(handoff);
  assert.match(prompt, /Kunming → Dali/);
  assert.match(prompt, /food and villages, not a group tour/);
  assert.match(prompt, /flexible explorer/);
  assert.match(prompt, /180 minutes/);
  assert.match(prompt, /Straightforward/);
  const app = readFileSync(new URL("../app/RoadTripApp.tsx", import.meta.url), "utf8");
  assert.match(app, /prototypeHandoffPrompt\(planningEntry\)/);
  assert.match(app, /prototypeHandoff=\{planningEntry\}/);
  const session = createPlanningSessionFromSeed(handoff, "prototype-handoff-test");
  assert.equal(session.intent.arrivalCity, "Kunming");
  assert.equal(session.intent.destinationRegion, "Yunnan");
  assert.equal(session.intent.maxDailyDrivingMinutes, 180);
  assert.equal(session.intent.travelPace, "relaxed");
  assert.ok(session.intent.interests.includes("I want food and villages, not a group tour"));
  assert.ok(session.intent.interests.includes("planning:flexible-explorer"));
  assert.ok(session.routePlan);
  assert.ok(session.routePlan.rationale.includes("Shared map anchors: Kunming → Dali"));
  assert.equal(session.routePlan.longestDrivingMinutes <= 180, true);
  assert.deepEqual(session.routePlan.destinationIds, ["kunming", "chuxiong", "dali"], "the only added stop is an explicit operational split that preserves the map anchors and drive limit");
  assert.match(session.conversation[0].text, /shared Kunming → Dali journey is now the planning authority/i);
});

test("season is an explicit input to Surprise Me ranking", () => {
  const base = { ...createJourneyPrototypeState(), destinationIds: ["haikou"], interests: ["mountains"], planningBehavior: "wanderer" };
  const winter = recommendSurpriseDestinations({ ...base, season: "winter" });
  const summer = recommendSurpriseDestinations({ ...base, season: "summer" });
  assert.notDeepEqual(winter.map((item) => item.destinationId), summer.map((item) => item.destinationId));
});
