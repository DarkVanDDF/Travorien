# Consumer Experience V2 — xhigh architecture critique

## Verdict

**REQUIRES PRODUCT REFRAME, not infrastructure rework.**

Sprint 3.5's planning and commerce authority are credible, but the consumer experience is still a linear Yunnan booking funnel. The new product layer must remain separate from the stable Trip, Commerce Catalog, offer, booking, and Reality Runtime contracts.

## Required architecture

- Add a read-only road-trip knowledge catalog for `SignatureDrive`, guides, readiness rules, knowledge claims, and sources.
- Keep editorial content out of the Commerce `Catalog`; editorial updates must not invalidate offer or Runtime fingerprints.
- Give accuracy-sensitive claims claim-level provenance: `VERIFIED`, `DEMO`, or `UNKNOWN`, source IDs, and verification dates.
- Use one typed `PlanningSeed` path for inspiration-first, AI-first, and readiness-first journeys so all three converge on the same planning and commerce engine.
- Only Yunnan may bind to the existing deterministic route graph and transaction-ready demo inventory. Other drives are honestly content-ready.

## Travel Advisor boundary

Deterministically retrieve and score known Signature Drives, assemble a bounded advisor context, let Gemini explain only that context, then validate returned Drive and claim IDs. Gemini may compare, explain, learn preferences, and suggest a known next step. It may not invent route facts or policy, promote an editorial drive to an executable plan, or create offers/bookings/Trip changes.

Driving readiness is deterministic and computed before any AI explanation. Missing, conflicting, expired, city-mismatched, or date-mismatched rules must fail safely to `UNKNOWN` or `NEEDS_INFORMATION`.

## Content-to-transaction boundary

`SignatureDrive -> DriveVariant / JourneyCandidate -> optional routeBinding -> deterministic RoutePlan -> VehicleOffer / HotelOffer -> Trip`

Editorial stays and experiences are recommendations, not bookable offer IDs. A destination change after confirmed booking must preserve the booking and require explicit reconciliation.

## Journey-aware commerce

- Vehicle recommendations need typed journey suitability inputs and structured score reasons.
- Hotel ranking needs parking type/distance, vehicle access, late-arrival suitability, route convenience, and old-town access.
- Unknown parking must not rank as verified on-site parking.
- Changing a selected Drive must invalidate stale unbooked offers.

## My Drive

Build a consumer view model over the existing Runtime: current/preview day, drive time, departure, stops, fuel/charging, parking, hotel arrival, readiness tasks, and consumer-facing road updates. Keep existing revision-bound confirmation authority; hide runtime engineering terminology. Never label a future/past demo day as “Today.”

## Highest risks

1. Knowledge and commerce catalog contamination.
2. Presenting five beautiful drives as five bookable products.
3. Policy hallucination or AI eligibility authority leakage.
4. The existing rigid funnel blocking destination changes after commerce begins.
5. Silent loss of confirmed bookings during replanning.
6. Marketing-style recommendation reasons not grounded in typed inputs.
7. Runtime terminology leaking into the consumer experience.
8. Personal readiness data leaking into shareable URLs.

## Mandatory adversarial coverage

- Unique drive IDs/slugs/media; all transaction-ready bindings graph-valid.
- Editorial drives cannot create offers, bookings, or Trips.
- Out-of-context AI Drive/claim IDs are rejected.
- Unsupported readiness combinations fail safely.
- All three PlanningSeeds converge on the same planning/commerce authority.
- Drive switching invalidates stale selections and preserves confirmed bookings for reconciliation.
- Journey context changes vehicle and hotel rankings.
- “No hotels” remains compatible with route, vehicle, Trip, and Runtime.
- My Drive date labelling is honest.
- Non-Golden personalized Yunnan Trips still execute canonical Reality decisions.

