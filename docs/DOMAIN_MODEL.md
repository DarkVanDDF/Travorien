# Domain Model

## Planning aggregate

```text
PlanningSession (revision boundary)
├─ TripIntent
├─ ConversationMessage[]
├─ RoutePlan
├─ VehicleOffer[] → VehicleSelection → VehicleBooking
├─ HotelOffer[] → HotelSelection
└─ TripPlanningStage
```

`PlanningSession` is the pre-Trip source of truth. Every action is revision-bound and
immutable. Gemini contributes only a validated conversational result and catalog IDs;
pure project authorities generate routes and commercial snapshots. A ready session is
materialized directly into the existing `Trip` aggregate.

## Trip aggregate

```text
Trip
├─ Traveler
├─ Vehicle (catalog reference)
├─ PermitRequirement (catalog reference)
├─ TripDay[]
│  ├─ Destination (catalog reference)
│  ├─ RouteSegment[] (catalog references)
│  ├─ Hotel (catalog reference)
│  └─ Experience[] (catalog references)
├─ Booking[]
├─ Risk[]
├─ RealityEvent[]
├─ TripDecision[]
└─ TripChange[]
   └─ TripDiff[]
```

`Trip` is the aggregate and revision boundary. Catalog objects keep stable IDs and a
`demo-mock` provenance marker, allowing a supplier adapter to replace the current
arrays without changing the aggregate shape.

## Conversational intent

`TripIntent` is the structured, nullable intake state that exists before a `Trip`.
Each Gemini response is validated as an `IntentExtractionResult`, then deterministic
code merges only supported, non-null fields into the existing intent. Earlier facts
survive later turns unless the traveler explicitly supplies a replacement. Missing
facts remain `null` and are listed in `unresolvedFields`; they are never inferred just
to make the UI look complete.

Route planning additionally requires an exact supported arrival city and start date.
Unknown arrivals, impossible directed paths, excessive driving, and contradictory
dates fail closed; none silently become Kunming or the historical Golden fixture.

## Core objects

- `Traveler`: identity-free preference profile for this trip.
- `PlanningSession`: revisioned consumer-planning aggregate and stage authority.
- `RoutePlan`: validated, dated proposal derived from the directed route catalog.
- `VehicleOffer`: expiring contextual quote bound to catalog and query snapshots.
- `VehicleSelection`: ID-only traveler choice; it carries no trusted price fields.
- `VehicleBooking`: idempotent confirmed local demo reservation.
- `HotelOffer`: expiring quote bound to one exact route night and destination.
- `HotelSelection`: either one current offer per night or an explicit skip.
- `Trip`: persistent, revisioned state and the source of truth for the UI.
- `TripDay`: one dated slice referencing route, stay, and activities.
- `RouteSegment`: directed drive with distance, time, road type, and notes.
- `Destination`: stable geographic catalog record.
- `Vehicle`: selectable supplier-shaped inventory record.
- `Hotel`: destination-bound stay inventory.
- `Experience`: destination-bound activity inventory.
- `PermitRequirement`: nationality-scoped guidance, documents, fee, and disclaimer.
- `Booking`: selected or confirmed local demo record. No live hold, payment, or filing.
- `Risk`: assessed trip concern plus mitigation.
- `RealityEvent`: canonical world-state fact, lifecycle, evidence, area, and source.
- `RawRealitySignal`: an adapter-produced observation that is not trusted as a Trip fact.
- `ImpactAssessment`: deterministic relation between one event and one Trip revision.
- `CandidatePlan`: comparable response plus executable `TripChangeCommand[]`.
- `TripChange`: immutable intent, audit time, price delta, and object-level diffs.
- `TripDecision`: selected plan and before/after revision audit record.
- `OutcomeObservation`: sidecar comparison between the selected plan's expected
  metrics and demo-observed metrics; it never mutates or trains against the Trip.
- `OperationsTimelineEntry`: correlated operational audit entry spanning signal,
  event, assessment, plans, decision, revision, and outcome.

## Mutation rule

`applyRelaxedDrivingChange` clones only affected days, recalculates dependent price,
increments `Trip.revision`, and appends a `TripChange`. The original trip remains
unchanged. This supports local repair rather than itinerary regeneration.

## AI command boundary

Copilot returns a narrow `TripChangeCommand`, not a replacement `Trip`. The current
supported command is `set-max-daily-driving-minutes` at 180 minutes. The Trip Engine
validates it, computes the immutable next revision and object-level diffs, and rejects
unsupported or malformed commands without changing state.

## Generalized Reality Runtime

```text
RawRealitySignal → RealitySignalAdapter → EventCompiler → versioned RealityEvent
→ ImpactRule → ImpactAssessment → CandidatePlanPolicy → CandidatePlan[]
→ traveler confirmation → canonical regeneration → Trip Engine
→ TripChange + TripDecision → new Trip revision → OutcomeObservation
```

These objects are intentionally not aliases. The invariant is:

`Signal ≠ Event ≠ Impact ≠ Plan ≠ Decision ≠ Change ≠ Outcome`.

- `RawRealitySignal` is untrusted input with source and `demo-mock` provenance.
- `RealityEvent` is what happened in the world and retains its own lifecycle.
- `ImpactAssessment` is how that event intersects a specific Trip revision.
- `CandidatePlan` is one executable choice and its projected trade-offs.
- `TripDecision` is the confirmed choice, bound to event version and assessment.
- `TripChange` is what the engine actually changed after confirmation.
- `OutcomeObservation` records what the demo later observed against the plan's
  authoritative expected metrics. It is not a reward, recommendation, or learning
  signal.

The event can remain `ACTIVE` while the Trip impact becomes `MITIGATED` or `ACCEPTED`.
Each event has a monotonically increasing `version`, optional `supersedesVersion`,
typed object scope, and effective interval. Same-signal replay is idempotent. A
substantive update must be exactly `v + 1` and supersede the current version; old,
skipped, or forged versions are rejected. The Trip stores only the current version of
an event while decisions, changes, outcomes, and timeline entries keep their original
event-version references. `RESOLVED` and `DISMISSED` are terminal; ingestion enforces
the same lifecycle as explicit transitions, while same-state DETECTED/ACTIVE updates
remain valid linear versions.

Impact rules use exact catalog and Trip references. Trip-day overlap is evaluated in
China local time (`UTC+08:00`), so a UTC timestamp near midnight cannot move an event
to the wrong travel day. Multiple events are assessed and decided independently;
after one decision changes the revision, another event's assessment and plans must be
regenerated. Joint multi-event optimization is outside Sprint 3.

The four built-in event types remain discriminated unions. A namespaced
`EXT:${string}` event/detail contract lets a typed architecture fixture add a compiler,
rule, policy, and fixture without modifying Runtime or Trip Engine and without weakening
narrowing for the built-in types.

## Reality commands

Candidate plans reuse `TripChangeCommand`: `REPLACE_DAY`, `REPLACE_BOOKING`, and
`ADD_RISK`. The Runtime accepts only a small selection envelope (event ID/version,
plan ID, Trip revision, assessment ID, catalog fingerprint), regenerates the current
canonical assessment and plan set, and passes the selected canonical plan to
`applyCanonicalCandidatePlan`.
The Trip Engine preflights every command and aggregate invariant before applying the
entire plan atomically. A failed validation returns the exact original Trip reference.

Booking changes keep the itinerary executable without introducing a new Arrival
aggregate. Flight, vehicle, and hotel selections remain explicit Booking records;
hotel policies replace both the day stay and its booking, and flight policies update
arrival-dependent bookings and Day 1 together.

There is still no outcome learning, automatic execution, event bus, workflow engine,
or DRM decision runtime.
