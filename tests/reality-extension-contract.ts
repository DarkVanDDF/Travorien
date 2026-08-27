import type { RawRealitySignal, RealityEvent } from "../app/domain.ts";
import type { EventCompiler } from "../app/reality-compilers.ts";
import type { ImpactRule } from "../app/reality-impact-rules.ts";
import type { CandidatePlanPolicy } from "../app/reality-policies.ts";

const extensionType = "EXT:EXPERIENCE_CLOSED" as const;

export const typedExtensionCompiler: EventCompiler = {
  id: "compiler-typed-extension",
  eventType: extensionType,
  supports(signal) {
    return (signal.payload as { eventType?: unknown } | null)?.eventType === extensionType;
  },
  compile(signal: RawRealitySignal): RealityEvent {
    return {
      id: "event-typed-extension",
      version: 1,
      updatedAt: signal.observedAt,
      sourceSignalId: signal.id,
      type: extensionType,
      title: "Experience unavailable",
      description: "Type-checked extension fixture.",
      source: signal.source,
      sourceType: signal.sourceType,
      confidence: 1,
      severity: "LOW",
      status: "ACTIVE",
      location: { label: "Kunming", destinationId: "kunming" },
      scope: { destinationIds: ["kunming"], routeSegmentIds: [], hotelIds: [], bookingIds: [], externalReferences: [] },
      details: { kind: extensionType, experienceId: "exp-kunming-market" },
      effectiveFrom: "2026-10-10T00:00:00+08:00",
      effectiveUntil: "2026-10-11T00:00:00+08:00",
      observedAt: signal.observedAt,
      evidence: ["Typed architecture fixture"],
      tags: ["extension-test"],
      provenance: "demo-mock",
    };
  },
};

export const typedExtensionRule: ImpactRule = {
  id: "rule-typed-extension",
  eventType: extensionType,
  supports: (event) => event.type === extensionType,
  assess: () => ({
    affectedObjects: [{ objectType: "Experience", objectId: "exp-kunming-market", label: "Market walk", reason: "Typed extension fixture." }],
    impactTypes: ["EXPERIENCE"],
    summary: "One experience is unavailable.",
    reasoning: ["The extension rule matched an exact experience."],
  }),
};

export const typedExtensionPolicy: CandidatePlanPolicy = {
  id: "policy-typed-extension",
  eventType: extensionType,
  supports: (event) => event.type === extensionType,
  propose: (event, _assessment, trip) => [{
    idSuffix: "drop",
    kind: "CHANGE_DAY",
    responseEffect: "MITIGATED",
    title: "Drop the unavailable experience",
    description: "Type-checked architecture fixture.",
    changeCommands: [{ type: "REPLACE_DAY", eventId: event.id, dayId: trip.days[0].id, replacement: { ...trip.days[0], experienceIds: [] } }],
    riskLevel: "LOW",
    experienceOutcome: "Remove the unavailable experience",
    tradeoffs: ["No Runtime or Trip Engine edits"],
  }],
};
