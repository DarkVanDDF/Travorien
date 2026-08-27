import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const currentProductFiles = [
  "app/layout.tsx",
  "app/PlanningExperience.tsx",
  "app/RoadTripApp.tsx",
  "docs/PRODUCT.md",
  "docs/ARCHITECTURE.md",
  "docs/DOMAIN_MODEL.md",
  "docs/GEMINI_INTEGRATION.md",
  "docs/DEMO_SCENARIO.md",
  "HARNESS.md",
];

test("current product surfaces consistently use the Travorien brand", async () => {
  const text = (await Promise.all(currentProductFiles.map((file) => readFile(file, "utf8")))).join("\n");
  assert.match(text, /Travorien/);
  assert.doesNotMatch(text, new RegExp(["Road", "ling"].join(""), "i"));
});

test("the generated Travorien social image is present and non-empty", async () => {
  const social = await stat("public/og.png");
  assert.ok(social.isFile());
  assert.ok(social.size > 10_000);
});
