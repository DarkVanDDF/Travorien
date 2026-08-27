# Roadling Sprint 2 — xhigh Architecture Review

Review mode: adversarial, read-only architecture audit  
Scope: Sprint 2 Reality Event Operating Loop, supporting domain/state code, UI integration, tests, documentation, and Harness evidence  
Review baseline: repository state before any remediation described in this report  

## 1. Executive Verdict

**REQUIRES FIX BEFORE SPRINT 3**

The Sprint 2 vertical slice demonstrates the intended five-layer Reality Event loop and its Golden Path works, but the current application boundary is not safe enough to extend into Sprint 3. A candidate generated from an old Trip revision can be applied to a newer Trip; the caller controls both the selected plan and the array used to “authenticate” it; and catalog-valid route IDs can be assembled into a geographically disconnected itinerary. In addition, the supposedly reusable runtime silently applies the Tiger Leaping Gorge Day 7/8 policy to other intersecting events and ignores event time windows.

These are state-authority and scenario-containment failures, not cosmetic defects. The result is a high risk of applying an obsolete or unrelated recovery policy once additional events, asynchronous AI, or booking operations are introduced. Remediation should stay narrow: bind plans to a Trip revision and assessment, resolve canonical event/plan authority inside the operating loop, contain the Golden policy explicitly, and validate the complete prospective route chain atomically.

## 2. Architecture Findings

### HIGH — Candidate authority and revision binding are incomplete

**Problem**

`CandidatePlan` has no Trip ID, base Trip revision, assessment reference, or event version. `applyCandidatePlan` receives a selected plan plus a comparison array from the same caller and treats equality between those two caller-controlled values as authority. It also accepts an external `RealityEvent` object based only on ID/status checks instead of resolving the authoritative event snapshot from the Trip.

**Evidence**

- `app/domain.ts`: `ImpactAssessment` and `CandidatePlan` do not carry an explicit planning revision binding; `CandidatePlan` does not reference its assessment.
- `app/trip-engine.ts`: the apply path searches `candidatePlans` by ID and compares it with the supplied `selectedPlan`, but does not regenerate or resolve a trusted candidate set.
- Read-only runtime probe: a plan generated at Trip revision 1 applied successfully after an unrelated Copilot change advanced the Trip to revision 2, producing revision 3.
- Read-only runtime probe: a forged plan accompanied by a forged comparison array applied successfully. `TripDecision.selectedPlan.estimatedCostDeltaCny` stored `-99999` while the authoritative `TripChange.priceDeltaCny` was `+360`.
- Independent probe: a same-ID external event marked `RESOLVED`/`LOW` was accepted while the event embedded in the Trip remained `ACTIVE`/`HIGH`, causing false risk audit text.

**Why it matters**

Sprint 3 is expected to add more asynchronous and operational behavior. Without optimistic concurrency and a canonical authority boundary, a recommendation produced for an obsolete state can overwrite a newer itinerary, and untrusted projection/audit metadata can be persisted even when state totals are recalculated correctly. The system would have two conflicting truths: canonical Trip state and forged or stale decision evidence.

**Recommended action**

Bind every candidate to `tripId`, `baseTripRevision`, and `impactAssessmentId`. Resolve the event from the current Trip rather than trusting the passed snapshot. At the public apply boundary, regenerate or resolve the canonical candidate set from the current Trip/event/assessment and select by ID; do not let callers provide both the plan and its authority set. Recompute or verify persisted price, time, risk, and affected-object projections.

### HIGH — The Golden Path policy is exposed as a generic runtime

**Problem**

Impact assessment contains hardcoded weather/gorge language and candidate generation always targets `day-7`/`day-8`, the Tiger Leaping Gorge route, Bai Shui Tai, and fixed hotels/routes. The only meaningful gate is that an assessment requires action and the Trip contains those day IDs. Event type, affected objects, event time window, and the expected Golden baseline are not used to select a policy.

**Evidence**

- `app/reality-engine.ts`: `generateCandidatePlans` directly looks up `day-7` and `day-8` and emits fixed KEEP/SKIP/REROUTE replacements.
- `app/reality-engine.ts`: assessment summary/reasoning and impact types are gorge/weather-specific for every intersecting event.
- `effectiveFrom` and `effectiveUntil` exist in the domain and fixture but are not consulted by assessment or candidate generation.
- Read-only runtime probe: an active event intersecting Dali produced all three gorge plans with affected days `[7, 8]`.
- Independent probe: a January 2027 Trip was treated as actionable for the October 2026 event and received all three plans.
- `.agflow/tasks/roadling-sprint-2/review_report.json` already identifies Golden-specific candidates as a risk, but the implementation does not contain that risk.

**Why it matters**

The failure mode is worse than “unsupported”: the engine confidently proposes an unrelated itinerary mutation. Additional event types or destinations in Sprint 3 would make incorrect operations look valid because all referenced catalog IDs exist.

**Recommended action**

Make the Golden scenario an explicit registered demo policy/fixture with precise applicability conditions: event type, temporal overlap, required affected object IDs, and expected itinerary baseline. Unsupported scenarios must return no candidate plans rather than reuse the gorge policy. Future policies can implement the same small interface without pretending that a universal planner already exists.

### HIGH — Route validation does not protect whole-itinerary continuity

**Problem**

Replacement-day validation checks catalog membership and whether the last route ends at the replacement destination, but it does not validate the first route origin, multi-segment continuity, the previous day’s arrival, the next day’s departure, or the complete prospective itinerary after all commands.

**Evidence**

- `app/trip-engine.ts`: `validReplacementDay` validates destination/hotel/experience IDs and only the final route destination.
- Read-only runtime probe: the engine accepted a Trip where Day 6 ended in Lijiang, Day 7 used the existing Kunming → Chuxiong route, and Day 8 was in Shangri-La with no connection between those locations.

**Why it matters**

Catalog-valid identifiers do not imply a valid journey. Multi-command plans must be validated as one proposed final state or an individually valid replacement can break adjacent days. Booking and permit operations in Sprint 3 must not be based on a disconnected itinerary.

**Recommended action**

Build the complete prospective day array without mutating the Trip, then validate every day’s route chain and every adjacent-day boundary before constructing any new state. Reject the full plan atomically if any segment is disconnected.

### MEDIUM — Event applicability ignores temporal intersection

**Problem**

The assessment matches area/route references but not the event’s effective time window against affected Trip dates.

**Evidence**

- `RealityEvent.effectiveFrom` and `effectiveUntil` are only modeled/fixture data; they are not part of `assessRealityEvent` matching.
- A 2027 Trip was assessed against a 2026 event in an independent read-only probe.

**Why it matters**

An expired or not-yet-effective event can produce disruptive current changes. This compounds the Golden-policy containment problem.

**Recommended action**

Require date/time overlap before a day or route is considered affected and before a registered policy can generate candidates.

### MEDIUM — Duplicate risk commands within one plan are not rejected

**Problem**

Duplicate day replacements are detected with `seenDays`, but `ADD_RISK` checks only risks already present in the Trip, not earlier commands in the same candidate.

**Evidence**

- `app/trip-engine.ts`: the validation loop tracks replaced day IDs but no in-plan risk IDs.
- Independent probe: a plan with the same `ADD_RISK` command twice applied and created duplicate risk IDs.
- This contradicts the atomic/duplicate validation claims in `docs/DOMAIN_MODEL.md` and the Sprint 2 validation report.

**Why it matters**

Duplicate operational risks make the Trip internally ambiguous and show that command-set invariants are not validated as a set.

**Recommended action**

Track risk IDs during preflight validation and reject duplicate additions before constructing state.

### MEDIUM — Cross-layer audit correlation is under-specified

**Problem**

Route/hotel/experience diffs use a `TripDay` ID as `objectId`, and `TripChange` has no structured event/decision correlation. The UI selects the latest reality-event change rather than the change associated with a displayed decision. Mitigation text is derived from plan-ID strings rather than `CandidatePlan.kind`.

**Evidence**

- `app/trip-engine.ts`: route, hotel, and experience diffs share the day ID.
- `app/domain.ts`: `TripChange` has no `eventId`, `decisionId`, `beforeRevision`, or `afterRevision` fields.
- `app/RoadTripApp.tsx`: the UI locates the latest generic reality-event change and derives selected-plan semantics from ID text.
- `app/reality-engine.ts`: impact mitigation checks whether the selected plan ID includes `"keep"`.

**Why it matters**

This works for one event with fixed plan IDs, but it becomes ambiguous with concurrent events and evolving naming. Audit evidence needs stable structured references.

**Recommended action**

Correlate changes and decisions structurally, use the selected plan kind for semantics, and identify the actual changed object IDs in diffs. This is important before multi-event work but is not, by itself, the immediate mutation-safety blocker.

### MEDIUM — Replay protection is event-ID-wide rather than event-version-aware

**Problem**

A prior decision for an event ID blocks all subsequent application and assessment for that ID. This prevents replay today but also prevents reassessment if an active event materially changes.

**Evidence**

- `app/trip-engine.ts`: any existing decision for `eventId` returns the same Trip.
- `app/reality-engine.ts`: any prior decision for the ID makes the impact non-actionable.

**Why it matters**

Reality events can evolve. Sprint 3 must distinguish a duplicate retry from a new event version.

**Recommended action**

Introduce an event revision or stable fingerprint before supporting event updates. Keep the current coarse protection until that lifecycle is explicitly modeled.

### LOW — Event risk category and user-facing window are fixture-shaped

**Problem**

Risk category selection is mostly severity-driven rather than type-driven, and the UI hardcodes “Oct 15–17” instead of rendering the event window.

**Evidence**

- `app/reality-engine.ts`: `eventRisk` maps medium severity to road and other severities to weather.
- `app/RoadTripApp.tsx`: fixed event-window text.

**Why it matters**

New event types would be mislabeled and dates could drift from the domain state.

**Recommended action**

Map categories from event type and render the modeled effective window.

### OBSERVATION — Layer separation is substantively sound

**Problem**

No structural problem was found in having `RealityEvent`, `ImpactAssessment`, `CandidatePlan`, `TripChange`, and `TripDecision` as distinct domain types. The issue is insufficient authority/version binding between them, not excessive layering.

**Evidence**

- The five types are separately modeled in `app/domain.ts`.
- Assessment and candidate generation are pure for the tested Golden input.
- The Trip Engine, not the UI, owns state mutation and revision creation.

**Why it matters**

The existing vertical slice can be repaired without a large architectural rewrite.

**Recommended action**

Preserve the layers, add explicit correlation/version fields, and keep demo policy data behind a replaceable boundary.

## 3. Hardcoding Assessment

**Does the current runtime meaningfully exceed the Tiger Leaping Gorge Golden Path? No.**

The area/object intersection logic in `assessRealityEvent` is partially reusable, and the Trip application engine can apply replacement commands to arbitrary days. However, the end-to-end operating loop is not generic: assessment language and impact categories are weather/gorge-specific, and every actionable assessment is translated into the same Day 7/8 gorge KEEP/SKIP/REROUTE policy.

More importantly, the runtime does not merely stop outside the Golden Path; it produces incorrect Golden-path changes for unrelated intersecting events. The safe Sprint 2 posture is therefore an explicitly labeled `demo-mock` Golden policy that refuses unsupported scenarios. A general policy engine may be added incrementally in Sprint 3 after event strategies and authority/version semantics are defined.

Acceptable fixture hardcoding:

- Golden Trip IDs and supplier/catalog records in `app/data/`.
- A named Golden scenario policy containing the fixed Day 7/8 recovery alternatives.
- Demo prices, routes, events, and explanatory copy clearly marked `demo-mock`.

Unacceptable runtime hardcoding:

- A generic function silently selecting Day 7/8 without confirming the event, time window, affected objects, and itinerary baseline.
- Inferring behavior from plan-ID substrings.
- Assigning weather/gorge semantics to unrelated event types.

Post-remediation note: the runtime still intentionally does not claim to exceed the
Golden Path. The difference is that the fixed Day 7/8 content now lives in the named
`demo-policy-gorge-rain-v1` fixture and is selected only after canonical event,
time-window, affected-object, and itinerary-baseline checks. Unsupported scenarios
return no candidates.

## 4. State Integrity

### Atomicity

The current apply path validates all commands before constructing the returned Trip, so ordinary invalid catalog references do not partially mutate the source state. Immediate invalid-plan tests are reference-equal no-ops. This is a genuine strength.

Atomicity is incomplete at the aggregate-invariant level: commands are validated mostly in isolation, so a fully applied set can still create duplicate risks or a disconnected final route. The repair must precompute and validate the entire prospective aggregate before one revision is created.

### Immutability

Successful application constructs new days, risks, decisions, changes, price, and metrics; original Golden state remains unchanged in existing tests. Candidate and selected-plan snapshots are cloned before persistence. Structural sharing of unaffected values is acceptable for this local immutable model.

### Revision discipline

Successful Golden application increments the Trip exactly once. The critical failure is that a candidate has no base revision and the apply path does not require current revision equality. The observed stale-plan application demonstrates that revision numbers currently record history but do not enforce optimistic concurrency.

### Idempotency and replay

After a decision is persisted for an event ID, applying again to the returned Trip is a no-op. This provides coarse in-memory replay protection. It is not a durable idempotency protocol and it cannot distinguish an updated version of the same event. Explicit regression coverage is missing for duplicate apply, rapid repeated actions, and event-version semantics.

### Stale protection

Stale protection fails. A revision-1 plan can be applied to revision 2. This is a Sprint 3 blocker because asynchronous generation, UI delay, or another Copilot change can invalidate the plan between preview and apply.

### Price and reference integrity

Authoritative Trip price is recalculated from catalog IDs after application, which prevented a forged candidate cost projection from changing the actual total. Catalog existence checks also reject unknown route/hotel/experience IDs.

The remaining integrity gaps are material: valid route IDs may be composed discontinuously; candidate cost/time/risk projections are persisted without reconciliation; diff object references are ambiguous; and no catalog uniqueness/version invariant is established. The immediate blockers are full route continuity and canonical projection/plan authority.

## 5. AI Boundary

The Sprint 2 Reality Event loop is deterministic and does not depend on Gemini. Candidate generation and application do not call the AI route, and the existing no-environment-variable test confirms the deterministic engine still runs. This satisfies the intended boundary for the current local demo.

The important future boundary is not “AI versus non-AI” alone; it is “proposal versus authority.” Any future AI may draft or explain candidates, but it must not supply authoritative object references, revision bindings, price totals, or an authentication set. Those values must be resolved and validated deterministically from current Trip state, the registered policy/supplier boundary, and the catalog before application.

## 6. Test Quality

All existing tests passed during the review, and they provide useful Golden coverage:

- Golden impact matching and one unrelated Beijing non-match.
- Three distinct candidates and pure deterministic generation.
- Successful selected-plan application, one revision increment, old-state immutability, catalog-derived reroute price, event lifecycle, and no Gemini dependency.
- Unknown route rejection and rejection of a same-ID altered plan when compared with the original caller array.

The suite is not yet adversarial or generic enough to support the prior “approved” conclusion. Important missing tests include:

- Candidate generated at revision N applied at revision N+1.
- Caller-forged selected plan plus caller-forged comparison set.
- Passed event snapshot differs from the Trip’s event.
- Intersecting non-Golden destination/event type.
- Non-overlapping event time window.
- Full route-chain and adjacent-day continuity using only valid catalog IDs.
- Duplicate `ADD_RISK` commands in one candidate.
- Explicit replay/double-apply behavior and evolving same-ID events.
- Partial-invalid multi-command candidate proving reference-equal atomic rejection.
- Candidate projection versus authoritative TripChange reconciliation.
- Multi-event UI/audit association.

The prior Sprint 2 review and validation artifacts are largely self-attestation. They correctly warned that candidate plans were Golden-specific, but did not convert that warning into an applicability invariant or test. The tamper test proves only that one altered object differs from an unchanged caller array; it does not test the actual trust boundary where the caller controls both values.

Harness assessment: `npm run harness:full` executes the repository test suite, but `scripts/harness-validate.mjs` still requires Sprint 1.5 artifacts and does not require `app/reality-engine.ts` or the Sprint 2 task/review/work/validation artifacts. Its semantic checks do not cover revision binding, canonical plan authority, temporal applicability, aggregate route continuity, or multi-event correlation. Harness Core must not be changed in this review; this is recorded as an evidence-coverage gap for project-local follow-up.

## 7. Sprint 3 Readiness

**Ready after fixes.**

At review time, Sprint 3 was not ready to build booking operations, more event types, or asynchronous AI planning on the apply boundary. The following minimum readiness conditions were then implemented and regression-tested:

1. Candidates are bound to the current Trip, revision, event, and impact assessment.
2. The public apply path resolves a canonical candidate rather than trusting caller-provided plan content/comparison arrays.
3. The Golden policy is explicitly contained and unsupported/time-disjoint events return no plans.
4. The complete prospective itinerary is validated for route continuity before atomic application.
5. Regression tests demonstrate stale rejection, authority protection, scenario containment, and aggregate route integrity.

## Remediation Status

Status at report creation: **PENDING**  
Final status: **COMPLETED — HIGH findings remediated**

Per the review protocol, no application, test, documentation, or Harness files were modified before this complete report and verdict were written. The `REQUIRES FIX BEFORE SPRINT 3` verdict then authorized the narrow remediation recorded below. MEDIUM/LOW findings were changed only where required to make the HIGH repairs correct; the remaining items stay documented as follow-up.

### Implemented remediation

- Added `tripId`, `baseTripRevision`, `impactAssessmentId`, and `eventFingerprint` bindings to every candidate, with matching assessment revision/fingerprint fields.
- Changed the public Trip Engine apply boundary to resolve the authoritative active event, rebuild the current impact and canonical candidate set, reject stale/altered selections, and persist only canonical plan projections.
- Moved price/metric selectors to a pure calculation module so the Trip Engine can own the canonical apply boundary without a module cycle.
- Moved the fixed gorge alternatives into `app/data/reality-plan-fixtures.ts` as the explicitly named `demo-policy-gorge-rain-v1`; policy applicability now requires the Golden event/type/area, affected-object set, time overlap, and expected Day 7/8 baseline.
- Made impact matching require event-window overlap. An intersecting Dali supplier event and a time-disjoint gorge event now return no gorge candidates.
- Added complete prospective-itinerary continuity validation from traveler arrival through every route segment and no-drive day before state construction.
- Added in-plan duplicate-risk validation as a direct aggregate-preflight safeguard.
- Replaced plan-ID-string mitigation inference with structured `selectedPlan.kind` and made risk category derive from event type.

### Regression and delivery evidence

- Added adversarial tests for stale revisions, canonical authority/forged projections, event fingerprint mismatch, non-Golden intersecting events, time-disjoint events, valid-ID route disconnection, and duplicate application.
- Test suite after remediation: **31 passed, 0 failed**.
- `npm run harness:full`: **PASSED** (Harness validation, all tests, ESLint, and Vinext production build).
- Harness Core and `scripts/harness-validate.mjs` were not modified. The Sprint 2 artifact/semantic coverage limitation remains a documented non-blocking Harness finding.

### Residual non-blocking follow-up

- Add structured `eventId`/`decisionId` correlation to `TripChange` before a multi-event UI is introduced.
- Introduce explicit event revisions before the same external event ID can evolve and be reassessed.
- Replace the single-active-event UI assumption when Sprint 3 introduces concurrent events.
- Expand project-local Harness evidence for Sprint 2 contracts without modifying reusable Harness Core.
