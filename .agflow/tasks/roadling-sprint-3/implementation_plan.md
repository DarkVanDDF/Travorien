# Sprint 3 Implementation Plan

## Phase A — Domain and correlation

1. Add `RawRealitySignal`, signal source markers, `RealitySignalAdapter`, versioned event references/facts, `OutcomeObservation`, `OperationsTimelineEntry`, and `RealityRuntimeState`.
2. Add event version/assessment correlation to candidates and decisions, and event/decision/revision correlation to changes. Add typed event scope rather than overloading destination area IDs.
3. Add a minimal `REPLACE_BOOKING` command plus booking scheduling/day metadata; seed only the bookings required by the executable demos.

## Phase B — Signal and compilation

1. Add named mock and manual adapters as pure functions.
2. Add a local structured static feed and adapter.
3. Implement four small compilers behind one registry and stable `compileRealitySignal` orchestration.
4. Add an optional server-only Gemini manual interpreter whose output is revalidated by the same compiler registry; preserve `AI_NOT_CONFIGURED` behavior.

## Phase C — Rules and policies

1. Replace monolithic assessment with a stable wrapper plus weather, road-closure, hotel-availability, and flight-delay rules.
2. Replace single-policy generation with a stable wrapper plus registered policies. Candidate drafts carry commands and presentation intent; one projector derives authoritative itinerary price/drive deltas and typed expected outcomes.
3. Reuse shared candidate binding, day materialization, booking replacement, and catalog-derived projection helpers.
4. Keep the Tiger Gorge alternatives in their existing named demo fixture; make road/hotel/flight policies operate on event references and current catalog state rather than event IDs.

## Phase D — Authoritative application and event updates

1. Extend Trip Engine preflight to validate booking commands and complete prospective days/bookings before state construction. Trip Engine must not import event rules or policies.
2. Put decision orchestration in the stable Reality Runtime. Accept event ID/version/plan ID plus preview revision/assessment, rebuild candidates using trusted registries, then pass canonical commands to Trip Engine.
3. Persist correlated decision/change records and keep replay protection scoped to event ID plus version.
4. Add immutable canonical event upsert with linear version protection and China local-day time matching.

## Phase E — Multi-event operations experience

1. Replace the single-event assumption with explicit event selection and active-event count.
2. Add a light “Simulate / report an issue” entry, manual input, scenario buttons, and static-feed loading with honest source labels.
3. Generalize affected-object, plan, decision, and change copy.
4. Add a consumer timeline for signal, compile, impact, plans, decision, revision, outcome, and event update/resolution.
5. Add a deterministic demo outcome action; outcome storage must not mutate the Trip.

## Phase F — Evidence and delivery

1. Preserve all Sprint 2 regression tests and add compiler/adapter/rule/policy/version/multi-event/outcome/authority tests.
2. Add an architecture-boundary test demonstrating a registered test event/rule/policy can use stable orchestration without editing Trip Engine or the runtime wrapper.
3. Update `DOMAIN_MODEL.md`, `ARCHITECTURE.md`, `DEMO_SCENARIO.md`, and `DECISIONS.md`.
4. Run an independent xhigh architecture review against the implementation, repair confirmed blocker/high issues, and run `npm run harness:full`.

## Completion

All phases are complete. The independent review's initial high findings and one
follow-up lifecycle inconsistency were remediated, regression-tested, and re-reviewed.
Final independent verdict: `PASS`.
