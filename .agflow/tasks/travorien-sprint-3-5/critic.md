# Sprint 3.5 Pre-Implementation Critic

Independent mode: xhigh, read-only. Existing baseline verification: 48 tests pass.

## Verdict

Proceed only with a revisioned `PlanningSession` and separate route, vehicle-commerce, and
hotel authorities. Do not add more commerce/stage conditionals to `RoadTripApp.tsx`, and do
not treat the Golden fixture as a route-planning fallback.

## Blocking corrections incorporated into the plan

1. Send bounded conversation history and stage to Gemini; preserve its validated natural
   assistant response instead of reducing every turn to a patch plus canned question.
2. Replace `createGoldenTrip` as the consumer build path. Route and Trip UI must derive every
   destination, duration, image, vehicle, stay, and price from structured state.
3. Stop silently mapping all arrivals to Kunming or inventing Golden dates, SUV preference,
   and interests. Resolve supported catalog destinations exactly and normalize facts visibly.
4. Treat the route graph as directed and sparse. Reject or bridge only through known edges;
   never repair an invalid AI route by substituting Golden.
5. Separate vehicle product, offer, selection, and booking. Reconstruct current offers before
   reservation, ignore client price/model/availability, and enforce idempotency.
6. Bind hotel offers to a destination, night, date, and snapshot; make skip a valid decision
   and materialize coherent day/booking records when stays are selected.
7. Feed the actual final consumer Trip to Reality Runtime and manual compilation. The current
   compile route's internal Golden Trip is not a reusable bridge.
8. Move media and provenance out of the component and eliminate unrelated alternating images.
9. Use the planning revision to reject a slow Gemini response based on stale state.
10. State the local demo authority honestly: deterministic canonical regeneration is strong
    local correctness, not a production server-owned booking session.

## Required adversarial evidence

- stale conversation response; unknown arrival; repeated, disconnected, reverse-only, and
  over-limit route proposals;
- two distinct user cases producing distinct routes;
- luggage demoting compact and budget/parking preference demoting premium SUV;
- forged, stale, expired, or unknown offer; duplicate reservation idempotency;
- hotel night mismatch, duplicate or missing night, snapshot drift, and explicit skip;
- final Trip rejected before confirmed vehicle/hotel decision;
- non-Golden road closure or hotel disruption producing one Runtime revision/diff;
- AI failure retaining the exact planning state;
- brand scan excluding historical evidence but rejecting current user-visible Roadling.

## Over-abstractions rejected

No workflow engine, event bus, CQRS, agent loop, arbitrary geographic optimizer, live map
abstraction, per-field provider interface, Trip revision per chat turn, duplicate booking
source of truth, payment aggregate, or rewrite of historical task evidence.
