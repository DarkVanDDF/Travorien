# Sprint 3 Independent xhigh Architecture Review

Review mode: independent, xhigh, read-only. The reviewer did not implement Sprint 3
and was asked to inspect actual code, tests, docs, and Harness evidence.

## Initial verdict

`REQUIRES FIX BEFORE SPRINT 4`

The first pass confirmed that registry-driven Runtime orchestration, authoritative
candidate regeneration, event/revision bindings, multi-event correlation, and the
Outcome identity chain were structurally real. It found these high-confidence gaps:

1. A `FLIGHT_DELAY` could affect Day 1 before proving that the event targeted the
   Trip's arrival city and an actual scoped inbound-flight booking.
2. `RawRealitySignal` adapter provenance widened to `string`, so strict TypeScript did
   not accept the declared adapter contract. The JavaScript-only synthetic extension
   test also did not prove a type-safe new event family.
3. Catalog changes between preview and apply could silently regenerate a differently
   priced plan under the same plan ID.
4. `OutcomeObservation` accepted empty observed metrics, caller-inconsistent status,
   impossible chronology, and unvalidated source/provenance.
5. Canonical compilation/upsert accepted invalid observation chronology.

## Remediation

| Finding | Repair | Regression evidence |
|---|---|---|
| Unrelated flight impact | Require arrival-city scope plus a scoped Trip flight booking before adding Day 1 dependencies. | Different destination/booking produces no affected objects. |
| Type contract | Preserve literal provenance; add a namespaced `EXT:*` event/detail seam and strict TypeScript extension fixture. | `npm run typecheck` passes; runtime extension still applies through unchanged Runtime/Trip Engine. |
| Catalog drift | Bind a deterministic catalog fingerprint through assessment, candidate, selection, Trip Engine, and decision. | Changed alternative-hotel price rejects the old preview; a newly confirmed preview applies the new price. |
| Outcome semantics | Require authoritative expected metrics, non-empty typed observed metrics, derived status, post-decision time, and valid source/provenance. | Empty, time-reversed, false-MATCHED, and untrusted observations are reference-equal no-ops. |
| Invalid chronology | Validate signal timestamps in compilers and event timestamps/version order in upsert. | Invalid compiler time and invalid v3 update are rejected. |

A remediation audit found one additional medium inconsistency: explicit lifecycle
transitions made `RESOLVED`/`DISMISSED` terminal, but ingestion could reopen a terminal
event. Upsert now enforces the same transition table while allowing linear same-state
updates for non-terminal events. An ingestion regression proves `RESOLVED v3 → ACTIVE
v4` is rejected.

## Required questions

### 1. Is Runtime genuinely multi-event-type?

Yes. Runtime and engine wrappers perform stable compile, assess, generate, regenerate,
and apply orchestration with exactly-one registry selection and no event-type branch.
Weather remains an explicit Golden policy; road, hotel, and flight differences are in
their compilers, impact rules, and policies. The typed `EXT:*` fixture demonstrates a
new simple family without Runtime or Trip Engine edits.

### 2. Can Sprint 4 connect real providers without rewriting Runtime?

Runtime does not need rewriting, but provider signal adapters alone are insufficient.
Real ID mapping, availability, quotes, booking state, provenance, durable storage, and
concurrency belong at the Catalog/live-snapshot boundary. The Sprint 3 fingerprint
binding proves changed supplier state invalidates a preview; Sprint 4 may replace the
local full-catalog fingerprint with durable provider quote/snapshot identity.

### 3. Is Prediction/Plan → Decision → Observed Reality traceable?

Yes. The decision snapshots event/version/fingerprint, catalog, assessment, candidates,
selected plan, change, and before/after revision. Outcome validates that exact chain,
compares against authoritative expected metrics, and records typed observed facts with
time/source/provenance without mutating Trip.

### 4. Is it ready for non-authoritative DRM Shadow Mode?

Yes at the data-contract level. Outcomes remain sidecar observations; no impact rule or
candidate policy consumes them, and recording an outcome preserves the exact Trip
reference. Persistence and real observation provenance remain Sprint 4+ work. DRM is
not an authoritative decision-maker.

## Final verdict

`PASS`

No remaining high-confidence BLOCKER, HIGH, MEDIUM, or LOW findings.
