import { readFileSync, existsSync } from "node:fs";

const requiredDocs = ["PRODUCT", "DOMAIN_MODEL", "ARCHITECTURE", "DEMO_SCENARIO", "DECISIONS", "GEMINI_INTEGRATION"].map((name) => `docs/${name}.md`);
const requiredProject = [
  "AGENTS.md", "HARNESS.md", ".env.example", "app/domain.ts", "app/intent-engine.ts",
  "app/trip-engine.ts", "app/ai/gemini-core.ts", "app/ai/gemini-server.ts", "app/api/intent/route.ts",
  "app/api/copilot/route.ts", "app/data/mock-data.ts", "public/og.png",
  ".agflow/templates/task_spec.yaml", ".agflow/templates/work_result.json",
  ".agflow/templates/review_report.json", ".agflow/tasks/roadling-sprint-1-5/task_spec.yaml",
  ".agflow/tasks/roadling-sprint-1-5/work_result.json",
  ".agflow/tasks/roadling-sprint-1-5/review_report.json",
  ".agflow/tasks/roadling-sprint-1-5/validation_report.md",
];
const missing = [...requiredDocs, ...requiredProject].filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Harness validation missing files: ${missing.join(", ")}`);

const source = readFileSync("app/data/mock-data.ts", "utf8");
if (!source.includes('const demo = "demo-mock"')) throw new Error("Mock catalog is missing its provenance marker");
const clientSource = readFileSync("app/RoadTripApp.tsx", "utf8");
if (clientSource.includes("GEMINI_API_KEY")) throw new Error("Gemini API key name leaked into client source");
const serverSource = readFileSync("app/ai/gemini-server.ts", "utf8");
if (!serverSource.includes("process.env.GEMINI_API_KEY") || !serverSource.includes('import "server-only"')) throw new Error("Gemini adapter is missing its server-only credential boundary");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
for (const command of ["harness:doctor", "harness:validate", "harness:check", "harness:full", "test", "lint", "build"]) {
  if (!packageJson.scripts?.[command]) throw new Error(`Missing package script: ${command}`);
}
console.log(`Harness validation: ${requiredDocs.length} docs, ${requiredProject.length} contracts, and quality scripts present`);
