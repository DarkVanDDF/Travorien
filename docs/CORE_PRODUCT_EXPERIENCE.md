# Travorien Core Product Experience

## Value proposition

Travorien gives international travelers the freedom to discover China by road while removing the China-specific complexity of getting road-ready, deciding where to go, and staying supported along the journey.

The consumer promise is **Drive China Your Way.** Every primary surface must strengthen at least one of:

- **Confidence** — I can understand what becoming road-ready in China involves.
- **Discovery** — I can find a side of China worth driving for.
- **Support** — I am not figuring the journey out alone.

## Jobs

The advisor starts with what the traveler wants from the road, not inventory fields. It learns the desired feeling, interests, pace, companions, tolerance for difficult drives, and appetite for spontaneity. It then behaves as a Detailed Planner, Flexible Explorer, or Wanderer without forcing the traveler to choose a personality label.

## First screen

Chat and an interactive China map are equal protagonists. Within 30 seconds a visitor should understand that this is a China self-drive product, see that temporary driving-permit preparation is part of the service, and be able to ask the advisor, edit a route on the map, or request a surprise destination.

## AI role

Gemini is a human-facing travel advisor and typed action proposer. It receives recent conversation, traveler preferences and job, inferred planning behavior, shared map points, journey draft, route insight, readiness state, bounded road-trip knowledge, and current Trip context. It returns a human response plus proposed structured actions. Deterministic project code validates and applies every map or journey action. Live AI failure is shown explicitly; local prototype guidance is never presented as Gemini.

## Map

The China map is a discovery interface and route builder backed by one shared Journey State. Travelers can add a start, stops, and an end; select and remove points; reorder stops; undo; and clear. Chat actions operate on the same state, while map actions become visible context for the next advisor response.

## Readiness

“Get me road-ready” collects nationality, foreign-licence status, arrival city, and arrival date through a lightweight conversational surface. The result explains the Temporary Driving Permit, licence translation, city-specific handling guidance, and pickup preparation. Policy claims remain source-bound and visibly marked `VERIFIED`, `DEMO`, or `UNKNOWN`; the prototype never claims to issue or approve a permit.

## Surprise

“Surprise me” combines current location, interests, inferred planning behavior, maximum comfortable driving time, season, and bounded demo destination knowledge. It returns evocative destination cards, explains why each might fit, and adds the chosen destination directly to the shared map. Ranking is deterministic prototype logic, not a production recommender.

## Route insight

Every route presents three consumer-readable judgments with reasons: **Feasibility**, **Drive Difficulty**, and **Wow Factor**. Route metrics and ratings are labeled demo-mock. Legal or restricted-area uncertainty fails to **Special requirements** or **Unknown** and prompts verification before travel.

## Mobile

Mobile is map-first. The map remains the main canvas while the advisor lives in a bottom sheet with collapsed, half, and expanded states. Route-point actions use large tap targets and an explicit selection sheet; composing a message expands the advisor without hiding all route context behind a desktop-style stack.

## Prototype boundary

This sprint rebuilds the consumer surface and reuses the proven Trip Engine, PlanningSession, commerce models, and Reality Runtime. It does not introduce durable state, production booking, payment, supplier orchestration, databases, event sourcing, or deeper DRM integration.
