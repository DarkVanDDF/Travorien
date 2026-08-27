# Decisions

## D-001 — Harness baseline

Use the Mendes Harness control-plane pattern because it is the newest, most complete,
and already exposes doctor/validation/full-gate commands. Keep only business-neutral
roles, templates, gates, safety, and lessons. Sales Funnel 2 contributes the reducer
pattern, not its Harness or outbound domain.

## D-002 — Local single-route Vertical Slice

Use one responsive Vinext route and local React state. This keeps the Golden Path
fast to demonstrate and avoids a database, auth, and API work outside scope.

## D-003 — Golden Path dates and price

Default dates are 10–18 October 2026. Prices and route times are internally consistent
demo values in CNY, not claims about live availability or authority rules.

## D-004 — Relaxed-driving repair

Split Kunming–Dali at Chuxiong. It proves a local state repair can change route, hotel,
experience allocation, metrics, and price while preserving the nine-day duration.

## D-005 — Reality Event boundary

Seed one rainfall event to validate the model seam, but do not execute it. A candidate
selection/runtime belongs to a later Sprint.

Sprint 2 supersedes the deferred portion of this decision with D-012 through D-015;
the prohibition on a DRM runtime still stands.

## D-006 — Local-only delivery

The request explicitly excludes production deployment. Keep Sites hosting metadata for
the local scaffold, but do not create or publish a production Site.

## D-007 — AI interprets; deterministic code decides

Gemini extracts supported fields and classifies a narrow Copilot command. Project code
validates and merges `TripIntent`; `trip-engine.ts` alone owns trip mutation, revision,
price recalculation, and diffs. An AI response can therefore never overwrite a Trip.

## D-008 — Official Gemini REST adapter

Use the official Gemini Interactions REST API with JSON Schema structured output and
`gemini-3.7-flash`. The official `@google/genai` SDK was evaluated first, but adding a
dependency was not authorized by repository policy. A small server-only REST adapter
keeps the same typed boundary without changing the lockfile and can be replaced by the
SDK later. The integration is real, not a mock; a live request requires a valid key.

## D-009 — Honest missing-key and failure behavior

If `GEMINI_API_KEY` is absent, upstream fails, or output is invalid, return a safe
error, keep the current intent/trip reference unchanged, and offer retry. The labeled
demo brief and direct demo command are deterministic product fixtures, never fallback
AI output.

## D-010 — Sprint 1.5 visual direction

Replace the beige form-led presentation with an indigo, lime, and photographic
AI-native OTA system. Use destination photography for discovery and trip context;
keep all inventory and pricing explicitly `demo-mock`. Refresh social metadata and
the share image to match the new “Drive China your way.” positioning.

## D-011 — Capacity-only Gemini fallback

Prefer `gemini-3.7-flash`, but retry once on `gemini-3.6-flash` only for HTTP 429 or
5xx responses. This addresses temporary model demand without hiding bad credentials,
invalid schemas, or application errors. Network timeouts do not double the wait.

## D-012 — Five separate reality layers

Keep `RealityEvent`, `ImpactAssessment`, `CandidatePlan`, `TripChange`, and
`TripDecision` as separate objects. This prevents a world-state observation from
silently becoming a mutation or a traveler choice from falsely resolving the event.

## D-013 — Deterministic impact matching

Match event areas against catalog destination IDs, route endpoints, destination-bound
experiences, Trip days, and connected stays. Gemini may explain a match but cannot add
an affected object that these rules do not validate.

## D-014 — Bai Shui Tai alternative

Use Bai Shui Tai as the coherent mock alternative between Lijiang and Shangri-La. Add
a daylight Lijiang–Bai Shui Tai route and remote premium lodge so the plan changes a
route, day, hotel, experience, drive time, and price without claiming live routing.

## D-015 — One atomic, confirmed reality revision

Candidate plans are pure projections. After explicit confirmation, validate every
command before applying any, then create exactly one Trip revision, one `TripChange`,
and one `TripDecision`. Invalid or already-decided plans are reference-equal no-ops.

## D-016 — Canonical, revision-bound Golden reality policy

Treat the Tiger Leaping Gorge recovery choices as one explicitly registered
`demo-mock` policy, not as a universal event planner. It applies only when the
canonical event, effective time window, affected structured objects, and Day 7/8
baseline match. Unsupported events return no candidates.

Every `CandidatePlan` binds to a Trip ID, base revision, impact assessment, and event
fingerprint. The public Trip Engine apply boundary rebuilds the canonical assessment
and candidate set, rejects stale or altered selections, and validates the complete
prospective route chain before creating one revision. This is an optimistic local
authority boundary; durable event versioning remains future work.

Sprint 3 supersedes the final sentence: local event versioning is implemented by
D-018, while durable cross-session authority remains deferred.

## D-017 — Plain registries form the generalized extension boundary

Use small `EventCompiler[]`, `ImpactRule[]`, and `CandidatePlanPolicy[]` registries.
Adapters normalize provenance but do not decide impacts. Runtime Core requires exactly
one compiler, rule, and policy match and fails closed on zero or ambiguous matches.
This is enough for four event families without adding an event bus, workflow engine,
DI container, CQRS layer, or event-sourced aggregate.

## D-018 — Typed scope, local-day matching, and linear event versions

Canonical events identify destination, route, hotel, booking, and external references
separately. Impact rules use these exact IDs and China-local (`UTC+08:00`) day overlap.
Event updates must be `v + 1`, must supersede the current version, and replace the
current event snapshot without changing the Trip revision. Decisions and audit records
retain their original event version. Replay, old versions, skipped versions, and stale
decision envelopes fail closed.

## D-019 — Keep arrival execution in Booking

Add flight bookings plus optional day/time/notes to the existing Booking model instead
of introducing an Arrival aggregate. Flight-delay policies can therefore update the
flight, vehicle pickup, and Day 1 atomically, while hotel-unavailability policies
replace both the day stay and hotel booking. This is the smallest coherent executable
model for the demo.

## D-020 — Outcome and timeline are correlated sidecar state

Keep `OutcomeObservation[]` and `OperationsTimelineEntry[]` in `RealityRuntimeState`,
outside the Trip aggregate. Outcomes must reference the exact Trip, event version,
assessment, selected plan, decision, and post-change revision, and their expected
metrics must match the immutable decision snapshot. They provide demo observability,
not reward scoring, learning, auto-execution, or DRM decisions.

## D-021 — Local canonical authority and honest live-integration seam

The apply boundary regenerates canonical plans from current local state before the Trip
Engine mutates once. This protects the single-session demo from stale or forged client
fields but is not durable server authority. A live provider feed can replace a signal
adapter/compiler; live inventory, availability, prices, routing, and booking status
must also enter through the existing Catalog/supplier boundary. No production API is
claimed or called in Sprint 3.

## D-022 — Bind catalog snapshots and validate observation semantics

Bind assessments, candidates, selection envelopes, Trip Engine apply, and decisions to
a deterministic catalog snapshot fingerprint. Even in the local demo, changed catalog
price or route data invalidates an old preview and requires reconfirmation. Sprint 4
can replace the whole-catalog fingerprint content with provider quote/snapshot identity
without changing Runtime orchestration.

An `OutcomeObservation` is accepted only when expected metrics equal the decision
snapshot, observed metrics are non-empty and type-compatible, its derived status agrees
with the values, time is not before the decision, and source/provenance markers are
valid. Strict TypeScript validation is now a business-neutral `harness:full` gate so
registry contracts cannot be runtime-only claims.

## D-023 — PlanningSession is the pre-Trip authority

Use one immutable, revisioned `PlanningSession` for conversation, route proposal,
vehicle offers and reservation, hotel cross-sell, and Trip readiness. Do not store the
consumer flow as loose component flags. Stale actions and AI failures return the exact
current session reference.

## D-024 — Deterministic routing, conversational AI boundary

Gemini may extract intent, explain a proposal, and suggest known destination IDs. Only
project code validates the directed route graph, arrival, duration, dates, drive limit,
continuity, metrics, and stage changes. Unsupported or reverse-only travel fails closed;
it never falls back to Kunming or a fixed itinerary.

## D-025 — Snapshot-bound commerce without fake production booking

Separate catalog vehicle identity, contextual offer, ID-only selection, and confirmed
local demo booking. Reservation reconstructs the canonical offer and validates query
snapshot, price, availability, expiry, and idempotency. Hotel offers use the same
principle per exact route night. No payment or supplier hold is claimed.

## D-026 — Materialize the existing Trip, then reuse Reality Runtime

A ready planning session becomes the existing structured `Trip` directly, including
arrival, confirmed vehicle booking, optional selected hotel bookings, catalog price,
and stable route IDs. It does not convert the historical Golden fixture or create a
parallel Trip model. The unchanged generalized Reality Runtime can therefore operate on
a newly planned Dali–Shaxi trip.

## D-027 — Licensed public-source media with local metadata

Use destination and exact-model vehicle imagery from researched Wikimedia Commons file
pages. Keep URL, source page, author, license note, accurate alt text, and `demo-mock`
provenance in project-local registries. The share card is one purpose-built generated
asset; no additional image generation is required for the product inventory.

## D-028 — Stage-scoped conversation and calendar-coherent materialization

After a route is confirmed, conversation may update only fields owned by the current
commerce stage: vehicle preference, luggage, budget, and interests during vehicle
selection; accommodation preference during hotel selection. Structural arrival and
calendar changes remain available while the route is still a proposal, where they
cause deterministic replanning. Final materialization independently requires traveler,
route, every TripDay, and vehicle pickup/drop-off dates to describe the same calendar.

Empty, expired, malformed, or non-canonical offer snapshots never leave a stale product
card actionable. Vehicle selection shows an explicit fleet-capacity state; reservation
review can return to a freshly generated snapshot without losing route or intent; hotel
selection refreshes every exact night. Equivalent ISO timestamps are normalized before
snapshot hashing, while invalid timestamps fail closed.

## D-029 — Hotel imagery is an attributed style reference, not property evidence

The demo hotel catalog has no supplier-approved property photography. Use high-resolution,
licensed regional architecture references with visible author/license links and label
every card “Style-reference image · not the actual property.” This is more honest than
implying that public travel photography depicts a named property. A future live supplier
adapter must replace both the demo offer and its image provenance together.
# Consumer Experience V2 decisions — 2026-08-25

- Reframe Travorien as an inbound China road-trip service, with discovery before commerce and the promise “Drive China Your Way.”
- Keep `SignatureDrive`, guides, knowledge claims and readiness sources in a separate Product Knowledge layer. They do not enter the Commerce `Catalog` or its fingerprints.
- Present five Signature Drives but bind only Yunnan to the existing deterministic route graph and demo-mock transaction path. The remaining four are explicitly content-ready.
- Use deterministic Signature Drive retrieval and ID validation for the Travel Advisor. Gemini may enhance explanation but receives no mutation authority.
- Store accuracy-sensitive policy statements as claim-level values with `VERIFIED`, `DEMO` or `UNKNOWN` status, official source IDs and verification dates.
- Fail Driving Readiness to `UNKNOWN` or `NEEDS_INFORMATION` when no exact current city/licence rule matches. “Likely able to apply” is never described as permission to drive.
- Carry readiness results across the same-tab handoff through session storage, remove them after loading, and keep personal answers out of shareable URLs.
- Permit self-drive materialization only for `LIKELY_ELIGIBLE` and `ACTION_REQUIRED` results. `NOT_ELIGIBLE`, `NEEDS_INFORMATION`, and `UNKNOWN` remain inspiration-only and preserve `no-licence` or `unknown` rather than being upgraded by a planning seed.
- Treat a readiness URL entry with missing, consumed, or malformed session transport as a failed handoff. It returns to the checker and cannot fall back to the unrestricted blank-planning path.
- Use a single `PlanningSeed` boundary so inspiration-first, AI-first and readiness-first entries converge on the existing `PlanningSession` and Trip authority.
- Treat road-trip parking, vehicle access, late arrival, route convenience and old-town access as structured hotel data. Penalize unknown parking instead of treating it as a positive.
- Present Reality Runtime through the consumer-facing My Drive and Road Updates vocabulary while preserving its existing revision-bound authority and deterministic execution.
- Keep planning stages internal. The consumer planner uses conversational planning moments and journey-specific calls to action rather than a numbered state-machine stepper or revision/status vocabulary.
- Preserve public-source imagery with visible creator and licence credit. Do not generate landscape imagery when a suitable authentic road image is available.
- Use 10 October 2026 as the visible local demo seed for the transaction-ready Yunnan journey. It is a demo default and remains editable in the planning conversation.
- Do not deploy, connect real suppliers, collect payment or offer permit filing in Consumer Experience V2.

# Frontend Product Prototype decisions — 2026-08-26

- Enter Product Prototype Mode: improve the consumer experience before adding durable or production architecture. Keep the proven Trip, PlanningSession, commerce, Reality Runtime, and Harness foundations unchanged.
- Make one local `JourneyPrototypeState` the shared owner of map points, traveler job, inferred planning behavior, interests, readiness summary, and prototype undo history. It is a consumer interaction state, not a second authoritative Trip aggregate.
- Use deterministic project code to rank Surprise Me candidates, calculate demo route insights, validate destination IDs, and apply typed AI map proposals. Gemini provides human travel advice and proposals, never policy or mutation authority.
- Distinguish every advisor message as live Gemini, local demo guidance, map activity, or system status. A failed or unavailable Gemini request never falls through to a response styled as live AI.
- Build the local interactive China map without a production navigation dependency. Geography, timings, ratings, and recommendation content are bounded demo data; accuracy-sensitive permit and restricted-area guidance remains source-bound or explicitly unknown.
- Treat the typed prototype-journey handoff as Planner input authority. Preserve its map anchors, traveler job, inferred planning behavior, interests, arrival timing, readiness and daily-driving ceiling; show any constraint-driven intermediate stop explicitly and never substitute a Signature Drive silently.
- Fail the commerce handoff closed for special-requirement, unknown-feasibility and blocked-readiness journeys. Unsupported routes remain playable editorial journeys rather than receiving unrelated demo inventory.
- Make personal daily-driving limits part of Route Insight feasibility, and make season an explicit deterministic Surprise Me ranking input.
- Keep final mobile touch-target overrides at the end of the stylesheet. Pins, map controls, the bottom-sheet handle and primary form controls use a 44px minimum interaction target at the 390px review viewport.

# Desktop homepage focus decision — 2026-08-26

- On desktop, make the homepage a single-viewport product surface containing only the minimal Travorien brand, `Drive China Your Way.`, the AI travel-advisor panel and the interactive China map. Hide the existing editorial, Signature Drive, readiness explainer, how-it-works and closing sections on the desktop homepage without deleting them or changing their mobile presentation.
- Concentrate restrained AI-tech styling in the map through a dark spatial field, clearer China silhouette, progressive destination labels, recommendation halos and route-draw animation. Keep the Chatbox warm, cream, typographic and editorial so it reads as a premium consumer product rather than a technical console or support widget.

# Desktop homepage product-canvas revision — 2026-08-26

- Remove the desktop marketing hero entirely. The desktop homepage begins inside one interactive map canvas, with only a small brand-level `Drive China Your Way.` title and a floating AI conversation surface.
- Give the map the dominant visual area and place the advisor over it as one product system. Use the supplied China map only to derive an accurate, single-color geographic silhouette and city positions; do not carry over province colors, map labels, railways, or legacy tourist-map styling.
- Keep richer destination density on desktop while revealing destination names only on hover, selection, or AI recommendation. Preserve the prior mobile destination set and mobile layout unchanged.
- Remove AI connection labels, mock provenance badges, policy footers, and other development explanation from the default desktop homepage surface. Existing deterministic interaction and provenance behavior remain available behind user actions and in the underlying prototype.

# Geographic desktop map revision — 2026-08-26

- Replace the reference-image-derived raster silhouette with Natural Earth 1:10m Admin 0 Countries, China POV, version 5.1.1. Natural Earth publishes the vector data as public domain. The checked-in SVG path is mechanically generated from its GeoJSON using a fixed Web Mercator viewport and a 0.62-pixel simplification tolerance.
- Use the same projection for the boundary, city nodes and route geometry. Desktop node positions now come from explicit longitude/latitude pairs; legacy prototype x/y values remain only for the unchanged mobile presentation.
- Keep the map prototype-only: no GIS runtime, navigation API or administrative data service. Terrain is an understated SVG texture clipped to the licensed boundary, and labels are progressive—six primary city names at rest, full destination identity on hover, selection or AI recommendation.

# Desktop interaction polish — 2026-08-26

- Treat Beijing, Xi’an, Chengdu, Kunming, Dali, Lijiang, Guilin, Guangzhou and Urumqi as primary discovery anchors with persistent compact labels. Secondary destinations remain quiet until hover or selection; AI recommendations receive a layered pulse, and selected route points own the strongest ring.
- Keep the default map canvas free of redundant controls. Undo and Clear appear only after the user creates a route, while Surprise Me remains the single high-weight entry in the AI surface.
- Reduce the advisor’s footprint and visual opacity instead of adding content. Use hover movement, unified circular arrows and a focus-within input treatment to communicate that the conversation drives the map.

# Desktop visual-system unification — 2026-08-26

- Replace the cream-versus-black split with one charcoal-green environment. The navigation, canvas and advisor now share ink-green foundations; the advisor separates through warm translucent glass, depth and a quiet border rather than a white card.
- Use mist and slate greens for geography, softened grey-white for content, and reserve chartreuse for AI recommendation, selection, route and focus feedback. Normal destinations deliberately carry less luminance so state hierarchy remains visible without neon or gaming styling.

# Design-reference desktop restoration — 2026-08-27

- Treat the supplied Travorien homepage composition as the sole visual reference for this pass: tall left advisor, dominant geographic map, ink-cyan field, jade terrain and restrained warm-gold interaction states. Preserve the existing real boundary, geographic projection and shared journey state instead of using the reference image as a background.
- Implement destination imagery as live hover-card UI. The Xi’an preview uses “Xi'an Bell Tower at night.jpg” by TarnishedPath (CC BY-SA 4.0) from Wikimedia Commons and remains explicitly prototype media rather than geographic evidence.
- Present Route Insights as a compact overlay driven by the existing deterministic demo-mock insight values. This pass changes only UI representation and does not introduce a nationwide road-scoring engine.
- Keep direct map clicks visually quiet: they mutate the same shared journey state and remain available to the advisor context, but no longer replace the designed welcome actions with verbose map-activity transcript messages.
