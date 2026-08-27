import { existsSync } from "node:fs";
import process from "node:process";

const required = ["AGENTS.md", "HARNESS.md", ".agflow/role_policies.yaml", ".agflow/gate_profiles.yaml", "docs/PRODUCT.md", "app/domain.ts", "app/trip-engine.ts"];
const missing = required.filter((file) => !existsSync(file));
console.log(`Node ${process.version}`);
console.log(`Platform ${process.platform} ${process.arch}`);
console.log(`Harness files ${required.length - missing.length}/${required.length}`);
if (missing.length) {
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}
console.log("Harness doctor: ready");
