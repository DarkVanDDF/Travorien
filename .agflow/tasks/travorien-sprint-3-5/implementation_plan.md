# Sprint 3.5 Implementation Plan

Status: completed. All phases below were implemented and verified; the independent
xhigh review concluded **PASS WITH FIXES** with no P0/P1 blockers.

## Phase A — Consumer planning domain

1. Add typed planning stages, `PlanningSession`, route, vehicle commerce, hotel selection,
   and media/provenance contracts.
2. Add a pure planning reducer with revision and out-of-stage guards.
3. Extend only the intent fields required by deterministic planning: luggage count, normalized
   vehicle preference, crowd preference, accommodation preference, and daily drive limit.
4. Record defaults and the local authority boundary in `docs/DECISIONS.md`.

## Phase B — Catalog and deterministic authorities

1. Enrich vehicle coverage for compact, sedan, SUV, and premium categories.
2. Add project-local destination/vehicle media registries with researched public provenance.
3. Implement exact arrival resolution, bounded graph traversal, stationary-day allocation,
   date normalization, and route-plan validation.
4. Implement contextual vehicle ranking and immutable snapshot-bound offers.
5. Implement canonical, tamper-resistant, idempotent demo vehicle reservation.
6. Implement night-bound hotel offers, deterministic ranking, skip, and selected-set validation.

## Phase C — Conversation and first preview

1. Rebrand the first consumer-visible slice and metadata to Travorien while preserving the
   empty AI-first landing.
2. Compile, HTTP probe, and hand off the first meaningful preview before broad implementation.
3. Generate exactly one new Travorien social-card asset outside the checkout, inspect it, and
   integrate it as `public/og.png` with updated metadata.
4. Replace the extraction-only API with a stage-aware conversation boundary using bounded
   history and a structured Gemini response.
5. Preserve state on AI errors and add a clearly labeled deterministic demo conversation that
   enters the same planner and commerce engines.

## Phase D — Integrated OTA journey

1. Render the route proposal from `RoutePlan`, never Golden constants.
2. Render ranked, responsive vehicle cards with image, category, seats, luggage, transmission,
   supplier, terms, mock availability, price, and provenance.
3. Reserve only a current canonical offer and show one confirmation before hotel upsell.
4. Implement hotel yes/skip, preference capture, ranked stay cards, replacement options, and
   selected stay review.
5. Materialize the final Trip through the Trip Engine and render its destinations, duration,
   vehicle booking, stays, price, and operating state from structured data.

## Phase E — Runtime bridge and product cleanup

1. Make manual Reality compilation validate the actual conversation Trip instead of creating
   Golden internally.
2. Prove a non-Golden road closure or hotel event creates one valid Runtime revision and diff.
3. Replace all current user-visible legacy-brand copy, marks, metadata, mock source labels, and
   formal current documentation while leaving historical task evidence untouched.
4. Remove repeated or mismatched itinerary media and keep every inventory/rule/price/source
   honestly labeled `demo-mock`.

## Phase F — Evidence and delivery

1. Preserve the existing 48 tests and add stage, stale response, route, ranking, booking,
   hotel, materialization, AI failure, brand, media, and non-Golden Runtime tests.
2. Update domain, architecture, product, Gemini, decisions, and demo scenario documentation.
3. Complete a browser product walkthrough covering empty start, two distinct traveler cases,
   vehicle reservation, hotel yes and skip, final Trip, and one Reality event.
4. Run an independent xhigh product/architecture review, remediate confirmed findings, and
   re-run `npm run harness:full`.

## Completion condition

The Sprint is complete only when the default demo no longer depends on Golden, all prices and
bookings are reconstructed by deterministic code, a final conversation Trip operates in the
existing Runtime, current consumer surfaces say Travorien, and the delivery gate passes.
