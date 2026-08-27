import type { DrivingReadinessAssessment, DrivingReadinessInput, KnowledgeClaim } from "./product-domain.ts";
import { knowledgeClaims } from "./data/knowledge-catalog.ts";

const claim = <T>(id: string) => knowledgeClaims.find((item) => item.id === id) as KnowledgeClaim<T> | undefined;
const documentClaims = (): Array<KnowledgeClaim<string>> => {
  const documents = claim<string[]>("claim-short-term-documents");
  return (documents?.value ?? []).map((value, index) => ({
    id: `readiness-document-${index + 1}`,
    value,
    status: documents?.status ?? "UNKNOWN",
    sourceIds: documents?.sourceIds ?? [],
    lastVerifiedAt: documents?.lastVerifiedAt,
    caveat: documents?.caveat,
  }));
};

export function assessDrivingReadiness(input: DrivingReadinessInput, now = "2026-08-25T00:00:00.000Z"): DrivingReadinessAssessment {
  const unknowns: string[] = [];
  if (!input.nationality.trim()) unknowns.push("nationality");
  if (!input.licenceCountry.trim()) unknowns.push("licence country");
  if (input.hasValidForeignLicence === null) unknowns.push("foreign licence validity");
  if (!input.arrivalCity.trim()) unknowns.push("arrival city");
  if (input.stayDays === null || input.stayDays < 1) unknowns.push("length of stay");
  if (unknowns.length) return {
    status: "NEEDS_INFORMATION",
    headline: "A few details are still needed.",
    explanation: "Travorien will not infer eligibility from incomplete personal or arrival details.",
    requiredDocuments: [], nextSteps: ["Complete the missing answers below."], unknowns, sourceIds: [], assessedAt: now,
    authorityNote: "Readiness guidance only. The issuing traffic authority makes the decision.",
  };
  if (input.hasValidForeignLicence === false) return {
    status: "NOT_ELIGIBLE", headline: "A valid overseas driving licence is required.",
    explanation: "The official short-term procedure is based on holding a valid overseas driving licence. This checker cannot provide a self-drive path without one.",
    requiredDocuments: documentClaims(), nextSteps: ["Consider a chauffeur-led road trip or update the answer if a valid licence is available."], unknowns: [],
    sourceIds: ["source-state-council-expat-guide-2025"], assessedAt: now,
    authorityNote: "Readiness guidance only. The issuing traffic authority makes the decision.",
  };
  const city = input.arrivalCity.trim().toLowerCase();
  const licence = input.licenceCountry.trim().toLowerCase();
  if (city === "beijing" && licence === "germany") return {
    status: "ACTION_REQUIRED", headline: "You are likely able to apply in Beijing—before you drive.",
    explanation: "Beijing's January 2026 official FAQ gives an in-person provisional-permit path for holders of a valid German licence. It is an application path, not guaranteed approval.",
    requiredDocuments: documentClaims(),
    nextSteps: ["Prepare the original licence and a qualified Chinese translation.", "Choose an official Beijing vehicle-management or airport service point.", "Wait for issuance before vehicle pickup or driving."],
    unknowns: [], sourceIds: ["source-beijing-german-licence-2026", "source-beijing-overseas-licence"], assessedAt: now,
    authorityNote: "Travorien cannot issue or guarantee a permit. Confirm opening hours, translator requirements and current acceptance with the issuing office.",
  };
  if (city === "shanghai") return {
    status: "ACTION_REQUIRED", headline: "Shanghai publishes a short-term provisional-permit procedure.",
    explanation: "The city publishes an official application path for eligible visitors. Your exact licence, translation and stay details still need local confirmation.",
    requiredDocuments: documentClaims(), nextSteps: ["Review the Shanghai Traffic Police guide.", "Confirm an accepted translation and service location.", "Carry the issued permit with the overseas licence and translation."],
    unknowns: [], sourceIds: ["source-shanghai-temporary-permit-2026"], assessedAt: now,
    authorityNote: "Travorien cannot issue or guarantee a permit. Local authority guidance prevails.",
  };
  return {
    status: "UNKNOWN", headline: "We do not have a verified city-specific match for this combination.",
    explanation: "National guidance indicates that eligible short-term visitors can apply, but this demo will not convert general guidance into a local eligibility decision.",
    requiredDocuments: documentClaims(), nextSteps: ["Check the traffic-management authority for the arrival city.", "Confirm accepted translation providers and the in-person process before booking a car."],
    unknowns: ["city-specific issuing procedure"], sourceIds: ["source-state-council-expat-guide-2025"], assessedAt: now,
    authorityNote: "Unknown is intentional: Travorien does not guess where current local rules are not verified.",
  };
}
