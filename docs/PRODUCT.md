# Product

## Positioning

**AI Self-Drive Travel Service / Road Trip Operating Platform for inbound travelers
in China.** Travorien is neither a rental-car storefront nor a chatbot placed over an
OTA funnel. It helps travelers discover a road worth taking, understand driving
readiness, shape the journey, add road-fit products when available, and keep operating
the same connected Trip through My Drive.

Consumer promise: **Drive China Your Way.** Emotional value: **Freedom + Discovery.**
Editorial proposition: **See the China tour buses don't.**

## Problem and target user

Inbound travelers face fragmented guidance: China-specific driving requirements,
unfamiliar road conditions, separate inventory searches, and no coherent way to
repair a trip when preferences or reality change. The initial user is an independent
international couple who values nature, local culture, food, and a relaxed pace.

## Core value

- Make travelers want the freedom and discovery of a China road trip before asking
  them to choose inventory.
- Turn traveler preferences into a structured road trip, with honest content-ready
  versus transaction-ready boundaries.
- Make permit readiness and road risk visible alongside the itinerary.
- Explain the total estimate in one place.
- Convert natural-language requests into reviewable state changes.

## Consumer Experience V2 scope

The current entry is a discovery-led road-trip homepage with one large Advisor input,
five distinct Signature Drives, editorial inspiration, Driving in China readiness,
Guides, the Discover → Plan & Book → Drive product story, and My Drive.

Five structured route products are browsable: Yunnan, Western Sichuan, Guangxi,
Hainan, and Xinjiang. Only Yunnan has a binding to the existing directed Trip graph
and `demo-mock` commerce catalog. The other four are intentionally content-ready:
the Advisor may compare and personalize them, but cannot create offers or bookings.

Three entry journeys use one product path:

`Signature Drive / Travel Advisor / Driving Readiness → PlanningSeed → Personalized
Journey → deterministic RoutePlan (when bound) → vehicle → optional hotels → Trip
→ My Drive`

The Travel Advisor retrieves only known Drive IDs and knowledge claims. Driving
readiness is a deterministic, source-bound assessment that fails to Unknown or Needs
Information when local evidence is insufficient. All accuracy-sensitive claims show
verification status, an official source and a check date.

Vehicles now expose structured, route-specific recommendation reasons. Hotels carry
parking type/distance, vehicle access, late-arrival suitability, route convenience and
old-town access. Unknown parking is penalized rather than promoted as a feature.

My Drive presents the existing Trip and Reality Runtime as a consumer day preview,
journey, road kit and Road Updates. The underlying immutable, revision-bound Runtime
authority is unchanged.

See `docs/CONSUMER_EXPERIENCE_V2.md` for the complete architecture and capability
matrix.

## Sprint 3.5 historical consumer demo scope

The default entry is an empty, AI-first Travorien conversation. A traveler can describe
a trip naturally over multiple turns; the server sends Gemini bounded recent history,
the current planning stage, and structured intent. Gemini returns conversational copy,
a validated intent patch, and optional catalog destination IDs. Deterministic project
code owns the planning revision, stage transition, graph validation, distance, time,
inventory, ranking, price, booking, hotel selection, and final Trip mutation.

The consumer journey is no longer a wrapper around the nine-day Golden fixture:

`Conversation → Route proposal → Vehicle offers → Demo reservation → Hotel yes/skip
→ Stay selection → Ready Trip → Reality Runtime`

Routes are assembled only from the directed Yunnan demo graph. Kunming family and
Dali solo inputs produce materially different itineraries. Unsupported arrivals,
disconnected or reverse-only proposals, repeated destinations, over-limit segments,
and contradictory dates fail honestly instead of silently becoming Kunming or Golden.

Vehicle catalog identity, contextual `VehicleOffer`, ID-only `VehicleSelection`, and
confirmed `VehicleBooking` are distinct. Offers include realistic OTA fields and rank
against passengers, luggage, budget, parking preference, vehicle preference, and
mountain context. Reservation reconstructs the canonical offer and verifies its
snapshot, price, availability, expiry, and idempotency key. It never accepts client
price or model data. Hotel offers are similarly bound to one night, date, destination,
and snapshot; the traveler may select a stay per night or skip the cross-sell entirely.

The final output is the existing structured `Trip`, not Markdown and not a converted
Golden fixture. It contains a confirmed demo vehicle booking, optional selected hotel
bookings, catalog-derived price, and the same IDs required by the generalized Reality
Runtime. A non-Golden Dali–Shaxi Trip is regression-tested through one road-closure
assessment, canonical plan, decision, diff, and immutable revision.

Destination and vehicle imagery lives in project-local media registries with source,
author, license note, accurate alt text, and `demo-mock` provenance. Current inventory,
availability, routes, prices, permit guidance, and Reality signals remain explicitly
local demo data.

The section below is retained as historical product context, not the default consumer
path.

## Sprint 2 historical demo scope

The product now begins with an AI conversation rather than a preference form. Each
turn contributes only supported, explicit facts to a structured `TripIntent`; a live
summary shows what is known and what still needs an answer. Once the minimum viable
intent is complete, the fixed Golden Path becomes an immersive OTA-style Yunnan trip
with route, automatic SUV, hotels, experiences, permit checklist, transparent mock
estimate, persistent Copilot, impact preview, and one applied relaxed-driving change.

Destination discovery also introduces Yunnan, Sichuan, Hainan, and Xinjiang. Yunnan
is the implemented generated-trip slice; the other destinations are honest discovery
previews rather than fabricated inventory.

Sprint 2 adds the first trip-operating loop. An active, explicitly `demo-mock`
rainfall event is matched against the structured Yunnan Trip, producing validated
affected objects and three executable choices: keep the route, skip the gorge, or
re-route via Bai Shui Tai. Nothing changes until the traveler compares and confirms
one option. The chosen commands then create an immutable next Trip revision, a
`TripChange` diff, and an independent `TripDecision` record.

## Explicitly out of scope

Live rental/hotel/map APIs, payment, authentication, production deployment, legal
permit submission, a DRM runtime, a large database, and a complex multi-agent system.

## Experience loop

`Conversation → Validate route proposal → Rank vehicles → Confirm demo reservation
→ Select or skip stays → Materialize Trip → Reality signal → Impact assessment
→ Compare plans → Confirm → Trip Engine → New immutable Trip revision`
