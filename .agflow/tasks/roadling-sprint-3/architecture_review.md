# Sprint 3 Architecture Review

Review mode: xhigh pre-implementation review of the remediated Sprint 2 baseline.

## 1. What is already genuinely generic

- `Trip` is the structured source of truth. Successful changes are immutable and create one revision, one `TripChange`, and one `TripDecision`.
- `TripChangeCommand` preflight validation happens before state construction. Catalog-backed day replacements, duplicate-risk rejection, price recalculation, and full-itinerary route continuity are reusable mutation invariants.
- `CandidatePlan` is bound to Trip ID, base revision, assessment ID, and event fingerprint. The public apply boundary re-assesses the current canonical event and regenerates the authoritative candidate set before comparing the selected plan.
- Price and driving metrics are pure selectors outside the UI. The UI does not own catalog records.
- Reality Event lifecycle is distinct from Trip impact mitigation, and the deterministic loop operates without Gemini.

These mechanisms should be preserved. Sprint 3 does not need a new state engine or transaction model.

## 2. What is still weather/Golden specific

- `assessRealityEvent` is one area/time matcher with weather-oriented experience semantics. It cannot target a specific hotel or flight/vehicle booking without overmatching nearby objects.
- `generateCandidatePlans` contains only one fixed Tiger Leaping Gorge Day 7/8 policy, even though the fixture is now honestly isolated.
- `RealityEvent.type` lacks `HOTEL_UNAVAILABLE` and `FLIGHT_DELAY`, and carries no event version, update link, structured object references, or delay facts.
- `TripDecision` lacks event version and assessment correlation; `TripChange` lacks decision/event correlation.
- Trip Engine supports day and risk commands but not deterministic booking replacement.
- `TripView` selects the first active event, the Operations modal is singular, and user-facing copy/iconography assumes rainfall and exactly three gorge choices.

## 3. Required extension points

### Reality Signal Adapter

A minimal contract converts a source-specific input into `RawRealitySignal`. Three explicit adapters are sufficient: manual text, named mock scenario, and local static feed. Adapters do not create impacts or mutate a Trip.

### Event Compiler registry

An ordered `EventCompiler[]` chooses one compiler by `supports(signal)` and returns a validated canonical `RealityEvent`. Type-specific validation belongs here. A shared normalizer handles common metadata and version fields. This is a registry, not a plugin platform.

### Impact Rule registry

An ordered `ImpactRule[]` maps an event plus Trip/Catalog to one shared assessment body. Stable orchestration adds Trip/revision/event bindings and mitigation state. Rules own the differences between area/route exposure, a specific unavailable hotel/booking, and arrival-delay booking/day effects.

### Candidate Plan Policy registry

An ordered `CandidatePlanPolicy[]` generates the common `CandidatePlan[]` shape. The existing gorge rain policy remains an explicit `demo-mock` fixture. Road closure policy discovers an alternative catalog route with matching endpoints; hotel policy discovers same-destination alternatives and authoritative prices; arrival-delay policy edits Day 1 and affected bookings. Stable binding/projection helpers prevent four copied candidate envelopes.

### Version and operating record

The canonical event carries `version`, optional `supersedesVersion`, `updatedAt`, signal reference, structured references, and typed numeric facts such as delay minutes. Event upsert replaces an older canonical version with the same ID and rejects stale or non-linear updates; it does not increment the itinerary revision.

`RealityRuntimeState` stores received signals, outcome observations, and user-readable timeline entries outside authoritative itinerary state. Outcomes link event version, assessment/decision, and Trip revision, but adding an outcome must return the exact same Trip reference.

## 4. Abstractions deliberately not introduced

- No runtime-loaded plugins, dependency injection container, event bus, workflow engine, rule DSL, repository layer, or generic data-access abstraction.
- No new Arrival or VehiclePickup aggregate in this Sprint. `Booking`, `TripDay`, and `Experience` are sufficient for the executable arrival-delay slice; a dedicated aggregate should wait for real supplier semantics.
- No event sourcing: only the current canonical event version is stored on the Trip, with update provenance represented by version fields and timeline entries.
- No combined multi-event plans or optimization. Events are assessed and decided independently.
- No automatic outcome-to-policy feedback. Outcome is observation-only shadow data.

## 5. Primary implementation risks

- Applying an event v1 plan after v2 is ingested unless event version joins every binding and replay check.
- A hotel rule matching by location instead of exact hotel/booking reference and accidentally changing routes.
- A flight policy changing UI text but not executable TripDay/Booking objects.
- Booking prices or candidate display deltas being trusted instead of catalog/Trip derivation.
- Event-specific conditions leaking back into `reality-engine.ts` or `trip-engine.ts` as a type switch.
- Two active events sharing the latest generic `TripChange` in the UI rather than using decision/change correlation.
- Outcome recording incrementing Trip revision or altering policies.
