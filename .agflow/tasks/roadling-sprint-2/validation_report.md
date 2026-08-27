# Sprint 2 Validation Report

## Result

Approved. `npm run harness:full` completed successfully on 25 August 2026.

## Gate evidence

| Gate | Result |
|---|---|
| Harness validation | Passed: project contracts and quality scripts present |
| Node tests | Passed: 24/24 |
| ESLint | Passed: zero warnings or errors |
| Vinext production build | Passed: `/`, `/api/intent`, and `/api/copilot` emitted |
| Local route probe | Passed: HTTP 200 |

## Sprint 2 acceptance review

- The Golden Trip contains an independent `ACTIVE`, `HIGH`, `demo-mock` rainfall event.
- Deterministic matching identifies two route segments, the gorge hike, Days 7/8,
  the gorge stay, and the connected Shangri-La arrival stay.
- KEEP, SKIP, and REROUTE each carry distinct typed command arrays and projections.
- Candidate generation is pure and leaves the original Trip deeply unchanged.
- The UI separates comparison/selection from a second explicit apply action.
- The Trip Engine validates the complete plan atomically and rejects invalid catalog
  references, duplicate operations, prior decisions, and same-ID altered plan content.
- A valid choice creates exactly one revision, `TripChange`, and `TripDecision`.
- The prior revision remains unchanged; price and drive metrics derive from catalog data.
- RealityEvent lifecycle remains separate: the event stays `ACTIVE` after mitigation.
- The full loop is deterministic and passes with `GEMINI_API_KEY` absent.
- The UI presents affected objects, risk/time/cost/experience comparisons, and readable
  route, stay, experience, driving-time, risk, and price diffs.

## Independent review repair

The first review found that selected-plan membership compared only IDs. The engine now
requires the selected plan to match the compared snapshot exactly, and `TripDecision`
persists immutable candidate and selected-plan snapshots. Regression coverage was added.

## Deferred by scope

Live signals, generalized planning for other destinations/events, supplier mutation,
automatic execution, outcome observation, and DRM learning remain outside Sprint 2.
