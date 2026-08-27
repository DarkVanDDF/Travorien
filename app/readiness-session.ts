import type { DrivingReadinessAssessment } from "./product-domain.ts";

export const readinessSessionKey = "travorien-driving-readiness-v2";
const validStatuses = new Set(["LIKELY_ELIGIBLE", "ACTION_REQUIRED", "NOT_ELIGIBLE", "NEEDS_INFORMATION", "UNKNOWN"]);

export function parseReadinessSession(value: string | null): DrivingReadinessAssessment | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DrivingReadinessAssessment;
    if (!parsed || !validStatuses.has(parsed.status) || typeof parsed.headline !== "string" || !Array.isArray(parsed.sourceIds) || !Array.isArray(parsed.nextSteps)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function canEnterSelfDriveFromReadiness(readinessEntry: boolean, assessment: DrivingReadinessAssessment | null) {
  if (!readinessEntry) return true;
  return assessment !== null && (assessment.status === "LIKELY_ELIGIBLE" || assessment.status === "ACTION_REQUIRED");
}
