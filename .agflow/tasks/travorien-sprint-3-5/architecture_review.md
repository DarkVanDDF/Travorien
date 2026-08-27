# Sprint 3.5 Architecture Review

Review mode: xhigh pre-implementation review of the completed Sprint 3 baseline.

## Verdict

Preserve the Trip and Reality cores. Add a revisioned pre-Trip planning aggregate and
three small deterministic authorities above them. Do not turn the consumer journey into
component conditionals, a workflow engine, or a second Trip mutation system.

## Reusable baseline

- Server-only Gemini access, structured response validation, and immutable intent merge.
- Stable catalog IDs, project-local `demo-mock` supplier boundaries, and pure selectors.
- Catalog-backed itinerary continuity and authoritative price calculation.
- Immutable Trip revisions, canonical command regeneration, atomic Trip changes, and diffs.
- Reality compiler/rule/policy registries, version bindings, exact-reference matching,
  outcome sidecar, and multi-event isolation.

## Current structural gaps

1. The conversation sends only the latest turn and current intent. It does not provide
   history or stage, and canned project copy replaces Gemini's conversational response.
2. Every successful build calls `createGoldenTrip`; non-Yunnan generation is disabled,
   and the Trip view hardcodes Golden destinations, duration, imagery, and vehicle copy.
3. Intent projection silently converts every arrival to Kunming and invents Golden dates,
   vehicle preference, and interests when facts are missing.
4. The graph is directed and sparse. Puzhehei is isolated and Weishan is a terminal branch;
   planners must exclude or honestly reject unreachable proposals.
5. Vehicle catalog identity, contextual offer, user selection, and confirmed booking are
   currently conflated. There is no immutable quote snapshot or idempotent reservation.
6. The manual Reality compile API constructs a Golden Trip internally, so that bridge is not
   yet compatible with a conversation-built Trip.
7. Destination URLs live in the component, images repeat across unrelated stops, vehicle art
   is CSS-only, and no media provenance contract exists.

## Selected contracts

`PlanningSession` is the source of truth before a Trip exists:

```text
PlanningSession
  id, revision, stage, plannedTripId
  intent, conversation
  routePlan?
  vehicleOffers?, vehicleSelection?, vehicleBooking?
  hotelDecision?, hotelOffers?, hotelSelection?
```

The closed stage set is:

```text
DISCOVERY → ROUTE_PROPOSAL → VEHICLE_SELECTION → VEHICLE_RESERVATION
          → HOTEL_UPSELL → HOTEL_SELECTION → TRIP_READY
```

A pure reducer accepts typed actions, rejects out-of-stage actions, and increments one
planning revision per accepted transition. The Trip revision does not change for chat turns.

One stage-aware conversation API receives the current planning revision, stage, intent, and
bounded recent history. Gemini may return conversational copy, a typed intent patch, optional
catalog destination IDs, and explanation. Deterministic code merges intent, validates the
graph, derives offers, and chooses the next stage. A response based on an old planning
revision is rejected.

`RoutePlan` contains validated destination and route-segment IDs, dates, distance, driving
minutes, and stationary-day allocation. A pure planner may bridge proposed waypoints only by
bounded search over directed catalog edges, then must pass itinerary continuity validation.

`Vehicle` remains catalog identity. `VehicleOffer` is a contextual immutable quote bound to
intent, route, price, availability, and a catalog snapshot. `VehicleSelection` carries IDs.
Reservation regenerates the canonical offer from `offerId + snapshotId + context`, rejects
client data, and uses a deterministic idempotency key to create one confirmed demo booking.

`HotelOffer` is bound to one route night, date, destination, and catalog snapshot.
`HotelSelection` chooses stays but does not claim a production hotel transaction. Skipping
hotels is valid and produces days with no hotel booking. Selection materialization creates
coherent Trip day and generic booking records for existing Runtime compatibility.

Only the Trip Engine materializes a final `Trip`, after validating route continuity, dates,
offer/booking identity, hotel coverage, catalog references, and total price. Reality Runtime
receives that exact Trip and never a regenerated Golden fixture.

## Explicitly avoided abstractions

- No workflow engine, event bus, CQRS, agent loop, provider container, or tool-calling planner.
- No geographic optimizer or live map layer beyond the project catalog graph.
- No duplicated vehicle booking sources of truth and no payment or HotelBooking aggregate.
- No automatic Golden repair for unsupported route proposals.
- No rewrite of historical `.agflow/tasks/roadling-*` evidence.

## Main risks and hard gates

- stale Gemini response overwriting a later interaction;
- silent arrival or date fabrication;
- disconnected/reverse-only/repeated routes;
- compact vehicle ranked above luggage capacity;
- forged price, availability, snapshot, or model reaching a booking;
- duplicate reservation appending a second record;
- hotel offer/night mismatch or snapshot drift;
- Trip ready before a confirmed vehicle or hotel decision;
- manual Reality compilation using a different Trip than the consumer session;
- user-visible brand residue and mismatched media.
