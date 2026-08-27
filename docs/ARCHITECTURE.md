# Architecture

```text
Consumer Product Layer (separate knowledge catalog)
  ├─ Home / Signature Drives / Guides
  ├─ deterministic Driving Readiness + official sources
  └─ bounded Travel Advisor + validated Drive/claim IDs
                              ↓
                         PlanningSeed
                              ↓ only Yunnan has routeBinding
                    existing PlanningSession
                              ↓
          deterministic route / offer / booking authorities
                              ↓
                       structured Trip
                              ↓
             My Drive consumer view over Reality Runtime
```

`SignatureDrive`, `Guide`, `KnowledgeClaim`, and readiness data live outside the
Commerce `Catalog`. Editorial changes therefore cannot invalidate an offer, booking,
impact assessment, or Reality decision fingerprint. Content-only drives cannot cross
the RoutePlan or commerce boundary.

The three consumer entries—Signature Drive, blank Advisor, and readiness result—use a
typed `PlanningSeed` boundary. They do not create separate planners.

The diagram below describes the preserved planning/runtime authority beneath this new
Product Layer.

```text
PlanningExperience
  └─ bounded conversation → POST /api/conversation
                              ↓
                   server-only Gemini adapter
                   copy + intent patch + catalog IDs
                              ↓
                immutable PlanningSession reducer
                              ↓
       route authority → offer authorities → booking validators
                              ↓
                      structured ready Trip
                              ↓
RoadTripApp → Copilot / Reality Runtime → Trip State Engine
                              ↓
                    demo-mock catalog + media
```

The single Vinext route remains a local Vertical Slice. `PlanningExperience.tsx` owns
the staged consumer interaction while `planning-engine.ts` owns immutable planning
transitions, directed route validation, contextual offer generation, snapshot checks,
idempotent vehicle reservation, hotel-night coherence, and final Trip materialization.
`RoadTripApp.tsx` renders the resulting Trip and hosts the existing Copilot and Reality
interfaces. `trip-engine.ts` remains UI- and model-independent and is the sole authority
for mutations after a Trip exists.

## Consumer planning authority

Gemini receives bounded recent conversation, current structured intent, planning stage,
and revision. It may return conversational copy, an intent patch, and known catalog
destination IDs. It cannot set price, availability, route distance, booking state,
planning stage, or a Trip revision. Route, vehicle, reservation, hotel, and materialize
functions are pure project authorities. Stale planning actions and AI failures preserve
the exact current session reference. Conversation changes during vehicle or stay
selection regenerate ranked offers and clear superseded choices.

## Reality Event operating loop

```text
manual / mock / static demo signal adapters
  → RawRealitySignal (`demo-mock` provenance)
  → exactly one registered EventCompiler
  → versioned canonical RealityEvent
  → exactly one registered ImpactRule
  → deterministic catalog/Trip object matching
  → exactly one registered CandidatePlanPolicy
  → comparable, executable CandidatePlan[]
  → traveler compares and explicitly confirms one plan
  → Runtime regenerates the assessment and candidates from current state
  → Trip Engine validates every canonical command atomically
  → immutable Trip revision + TripChange + TripDecision
  → optional sidecar OutcomeObservation + Operations Timeline
```

The extension seams are deliberately small arrays of plain modules:

- `reality-adapters.ts`: manual, mock, and static-demo-feed input normalization;
- `reality-compilers.ts`: four signal-to-event compilers;
- `reality-impact-rules.ts`: four exact-scope impact rules;
- `reality-policies.ts`: four response-policy families;
- `reality-engine.ts`: stable compilation, assessment, projection, fingerprint, and
  event-version primitives;
- `reality-runtime.ts`: orchestration, canonical regeneration, sidecar outcomes, and
  timeline correlation;
- `trip-engine.ts`: the only Trip mutation and revision authority.

The engine and runtime select exactly one matching compiler, rule, and policy. Zero or
ambiguous matches fail closed. Built-ins use closed discriminated details; a new
namespaced `EXT:*` family registers a compiler, rule, policy, and fixture without a
branch in Runtime Core or Trip Engine. A TypeScript-only contract fixture and a runtime
architecture test cover both halves of that claim.

Candidate price, route-time, booking, and expected-outcome values are projected from
catalog and Trip commands, not trusted from display fields. The apply request contains
only event ID/version, plan ID, Trip revision, and assessment ID. The Runtime rebuilds
the canonical set, and the Trip Engine validates commands, route continuity,
destination/stay consistency, booking coherence, duplicate operations, and aggregate
price before one atomic revision. Assessment, candidate, selection, Trip Engine apply,
and decision also share a deterministic catalog snapshot fingerprint. A changed route,
inventory, or price snapshot therefore forces a new preview instead of silently
repricing the same plan ID. Stale revisions, superseded event versions, unknown plan
IDs, forged labels/deltas, changed catalog snapshots, and partially invalid command
sets are reference-equal no-ops.

## Gemini boundary

`app/ai/gemini-server.ts` is marked server-only and reads `GEMINI_API_KEY` at request
time. It calls the official Gemini Interactions REST API with JSON Schema response
formats. API routes validate output again before returning a merged intent or a narrow
command to the client. Missing key, upstream, parsing, or validation errors return safe
failures and never fabricate a response.

The official `@google/genai` package is the recommended JavaScript SDK. This repository
does not add it because dependency installation was not authorized; the adapter uses
the official REST surface directly, leaves the lockfile untouched, and preserves a
small replaceable seam.

## Replaceable seams

`Catalog` remains the supplier boundary. Future adapters may assemble catalog and
versioned quote snapshots from rental, hotel, attraction, route, permit, and pricing
services. Stable IDs prevent display names from becoming identity. `provenance` makes
mock/live separation explicit. Project-local media registries separately record source,
author, license note, alt text, and `demo-mock` provenance. The Gemini adapter is
similarly isolated behind route contracts.

## State-change flow

```text
Copilot text → Gemini command classification → project validation
→ Trip Engine candidate revision → object diffs → traveler applies
→ React state replacement → all selectors re-render
```

Unsupported prompts and malformed commands are acknowledged without mutating state.
The supported Sprint 1.5 intent is a maximum three hours of driving per day.

## AI boundary for reality

All four structured demo scenarios work with no Gemini key. The optional manual-report
route uses Gemini only to extract a supported event type, demo target, descriptive
fields, confidence, severity, and flight-delay duration. The server then creates a
`RawRealitySignal`; deterministic compilers and rules validate the target and derive
scope, impact, plans, prices, bookings, and commands. Gemini may not choose affected
Trip objects, calculate commercial or route state, choose a response, or mutate a
Trip. Missing configuration returns `AI_NOT_CONFIGURED`; it never impersonates AI with
a fixture.

## Event versions, multiple events, and outcomes

Event updates use a linear, immutable version chain. Timeline entries distinguish
compiled, updated, and resolved versions. Several active events may coexist, but each
assessment and plan set is bound to one event version and one Trip revision. Decisions
are sequential so a prior revision cannot silently invalidate a later operation.

`OutcomeObservation` is Runtime sidecar state and retains an exact reference chain to
Trip, event version, assessment, selected plan, decision, and post-decision revision.
Its expected metrics must equal the immutable selected-plan snapshot. Observed metrics
must be non-empty, typed, temporally after the decision, and carry validated demo
source/provenance. `MATCHED`, `DEVIATED`, or `PARTIAL` must agree with the actual metric
comparison. The values may be displayed, but Sprint 3 performs no scoring, learning,
or automatic future recommendation.

## Live-adapter boundary and Sprint 4

The current authority is local and optimistic: state is held by one browser session,
not a durable multi-user server. Replacing mock feeds with provider signals is an
adapter/compiler change. Live hotel availability, supplier prices, route computation,
and booking status also require versioned provider snapshots at the existing
`Catalog`/supplier boundary; they are not facts the Reality Runtime may invent. The
current whole-catalog fingerprint is the local proof of this binding. A future backend
can replace its contents with durable quote/snapshot identity while retaining the same
event, assessment, selection, and apply flow, then add persistence and concurrency
control.

The structured chain is suitable as shadow data for a later Decision Record Model,
but no DRM process decides, executes, or learns in this Sprint.
