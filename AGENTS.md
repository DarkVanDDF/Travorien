# AGENTS.md — China Inbound Self-Drive Travel Demo

This repository is a local Vinext/React 19 Vertical Slice for an inbound China
self-drive product. These instructions apply to all work in the repository.

## First steps

1. Read the request and the relevant files; preserve unrelated user changes.
2. Keep the reusable Harness business-agnostic. Road Trip behavior belongs in
   `app/`, `docs/`, `tests/`, and project-local data.
3. Route work by ownership: application/state engine (`app/domain.ts`,
   `app/trip-engine.ts`), interface (`app/*.tsx`, CSS), data
   (`app/data/`), or infrastructure (`.agflow/`, scripts, config).
4. Record material defaults and trade-offs in `docs/DECISIONS.md`.

## Product invariants

- The itinerary is a structured `Trip` state, never Markdown as the source of truth.
- State changes are immutable, revisioned, and expressed as `TripChange` diffs.
- Copilot suggestions must identify affected objects before applying an update.
- Gemini may extract intent or propose a typed command; deterministic project code
  merges intent and the Trip State Engine remains the only mutation authority.
- `GEMINI_API_KEY` is read only in server modules and never exposed to the browser.
- All inventory, rules, prices, routes, and events are clearly marked `demo-mock`.
- Supplier boundaries stay replaceable; UI components do not own catalog data.
- Reality Events may drive a deterministic, user-confirmed operating loop; outcome
  learning, automatic execution, and a DRM runtime remain out of scope.

## Quality gates

- Fast gate: `npm run harness:check`.
- Delivery gate: `npm run harness:full` (validation, tests, lint, production build).
- Do not present a gate as passing if a command failed.

## Safety and scope

- No production APIs, payment, account system, deployment, or real permit filing.
- Do not commit, push, deploy, or install additional dependencies unless requested.
- `.openai/hosting.json`, lockfiles, generated output, and dependencies are restricted
  surfaces and only change when the task explicitly requires them.
