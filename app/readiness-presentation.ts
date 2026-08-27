import type { DrivingReadinessAssessment } from "./product-domain.ts";

export interface ReadinessPresentation {
  label: string;
  tone: "positive" | "caution" | "blocked" | "neutral";
  permit: string;
  translation: string;
  location: (arrivalCity: string) => string;
  pickup: (documentCount: number) => string;
  cta: string;
  mayContinueSelfDrive: boolean;
}

export function presentReadiness(assessment: DrivingReadinessAssessment): ReadinessPresentation {
  if (assessment.status === "LIKELY_ELIGIBLE") return { label: "GUIDANCE MATCHED", tone: "positive", permit: "Required before driving", translation: "Required", location: (city) => `Guidance available for ${city}`, pickup: (count) => `${Math.max(3, count)} things to prepare`, cta: "Add guidance to my trip", mayContinueSelfDrive: true };
  if (assessment.status === "ACTION_REQUIRED") return { label: "ACTION REQUIRED", tone: "caution", permit: "Required before driving", translation: "Required", location: (city) => `Application guidance for ${city}`, pickup: (count) => `${Math.max(3, count)} things to prepare`, cta: "Add required actions to my trip", mayContinueSelfDrive: true };
  if (assessment.status === "NOT_ELIGIBLE") return { label: "NOT ELIGIBLE", tone: "blocked", permit: "No self-drive path shown", translation: "Not assessed", location: () => "Resolve the licence requirement first", pickup: () => "Self-drive pickup blocked", cta: "Keep this status visible", mayContinueSelfDrive: false };
  if (assessment.status === "NEEDS_INFORMATION") return { label: "NEEDS INFORMATION", tone: "neutral", permit: "Cannot assess yet", translation: "Licence details needed", location: () => "Complete the missing answers", pickup: () => "Readiness not established", cta: "Keep missing actions visible", mayContinueSelfDrive: false };
  return { label: "UNKNOWN", tone: "neutral", permit: "General requirement · verify locally", translation: "Usually required · verify", location: () => "Local verification needed", pickup: (count) => count ? `${Math.max(3, count)} likely preparation items` : "Local checklist needed", cta: "Keep unknowns visible", mayContinueSelfDrive: false };
}
