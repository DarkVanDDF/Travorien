# Sprint 3 Pre-Implementation Critic

Independent mode: xhigh, read-only. No application files were edited before this critique.

## Verdict on the proposed plan

Proceed, with the following corrections incorporated before implementation.

## Required corrections

1. **Keep event-specific orchestration out of Trip Engine.** The stable Reality Runtime should accept event/version/selected plan ID plus the preview revision/assessment, rebuild the current canonical candidate, then pass validated canonical commands into the Trip Engine. Trip Engine owns mutation but must not import rule or policy registries.
2. **Use plan ID plus preview bindings, not a full client plan, at the decision boundary.** A plan ID alone prevents forged content, while expected Trip revision/assessment prevents a selection previewed before another event changed the Trip from silently applying against a new revision.
3. **Add typed event scope.** `affectedArea` cannot distinguish one route, one hotel, or one inbound booking. Canonical events need destination, route, hotel, and booking references plus a discriminated details payload.
4. **Make event version part of every authority and audit key.** Candidate, assessment, decision, change, replay checks, and timeline entries must use event ID + version/fingerprint. A v2 active update must remain actionable after a v1 decision.
5. **Seed and mutate coherent bookings.** Hotel options must atomically update `TripDay.hotelId` and its hotel booking. Flight options that claim late pickup must update a minimally scheduled vehicle booking. Booking validation must finish before state construction.
6. **Separate calculated itinerary drive delta from predicted operational delay.** The existing weather KEEP `+60 min` is a prediction, not a route mutation. Store it in typed expected outcome data so later observations compare like with like.
7. **Use China local-day overlap.** Event matching should use `Asia/Shanghai` day boundaries (fixed UTC+08:00 for this local demo), not UTC midnight.
8. **Correlate UI records structurally.** Event A must never display Event B’s latest generic change. Decisions and changes need assessment/event/version/decision IDs.
9. **Keep OutcomeObservation outside Trip.** Recording an outcome must preserve the exact Trip reference/revision/days/price and never feed policy generation.
10. **State the local authority limit honestly.** This Sprint provides deterministic local canonical regeneration, not server-owned session authority. A production server state boundary remains Sprint 4+ infrastructure work.

## Architecture traps to test

- malformed/ambiguous compiler matches and unknown catalog references produce no event;
- duplicate signal replay is idempotent and stale/non-linear event updates are rejected;
- a v1 decision does not suppress actionable v2;
- Event A revision stales Event B’s preview until it is regenerated;
- road closure affects exactly the referenced route, not nearby hotels;
- hotel disruption affects exactly the referenced hotel/booking, not routes;
- flight delay affects Day 1/arrival bookings/experience, including a China-local boundary case;
- candidate display price cannot override catalog-derived price;
- any invalid command in a booking/day batch produces a reference-equal no-op;
- outcome append preserves the Trip reference and policy output;
- a synthetic registered compiler/rule/policy can use stable orchestration without editing Runtime Core or Trip Engine.

## Over-abstractions rejected

No dynamic plugins, IoC container, event bus, workflow engine, rule DSL, repository layer, CQRS, event sourcing, combined-event planner, flight graph, or outcome-learning interface. Plain registries, small discriminated types, pure rules/policies, and one exhaustive Trip Engine command validator are sufficient.
