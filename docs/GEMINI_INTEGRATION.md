# Gemini Integration

## Runtime boundary

All AI entry points are server-only route handlers:

- `POST /api/conversation` runs the Travorien planning conversation.
- `POST /api/advisor` runs the prototype Travel Advisor with shared map context and typed map proposals.
- `GET /api/advisor/status` reports whether the server key is configured without exposing or testing the key.
- `POST /api/copilot` classifies the supported post-Trip change command.
- `POST /api/reality/compile` extracts a manual report against the current Trip.

The product-prototype Travel Advisor attempts live Gemini from the first-screen chat.
It sends recent conversation, traveler job and inferred planning behavior, current map
points, route insight, readiness context, current Trip status, and a bounded local
destination-knowledge snapshot. Gemini returns a human response plus typed intent,
map, destination, candidate-journey, UI-surface, and journey-proposal fields. Client
and server validation both reject unknown destination IDs; deterministic project code
is the only code that applies a map action.

`app/ai/gemini-server.ts` reads `GEMINI_API_KEY` from the server environment and calls
the official Gemini Interactions REST endpoint. Browser code never reads, receives, or
serializes the key.

Travorien requests `gemini-3.7-flash` first. Only a 429 or 5xx capacity/service response
retries once on `gemini-3.6-flash`. Authentication, validation, and other 4xx failures
do not trigger a fallback.

## Conversation contract

The transaction planning route sends the current stage, planning revision, structured intent, the
latest traveler message, and at most eight recent messages. Its JSON Schema allows
only assistant copy, a supported intent patch, known catalog destination IDs, a route
explanation, and confidence. Project validation rejects unknown fields and IDs.

The prototype advisor sends up to 20 visible conversation turns and the exact shared
Journey Prototype state. Its structured result includes `humanResponse`, `intentPatch`,
`mapActions`, `suggestedDestinationIds`, `candidateJourneys`, `uiSurface`, and
`journeyMutationProposal`. It receives only pre-written verified policy facts and is
explicitly instructed not to infer permit eligibility or restricted-area feasibility.

```text
bounded conversation + current PlanningSession context
  → Gemini structured result
  → project validator
  → immutable intent merge
  → deterministic route / offer / booking authorities
  → existing Trip aggregate
```

Gemini never sets stage, distance, duration, availability, price, booking status, Trip
revision, affected Reality objects, or Runtime commands.

## Failure behavior

Missing credentials return 503. Upstream or parse/validation failures return a safe
502 response. The current `PlanningSession` is retained by exact reference so prior
conversation, route, selection, and booking facts cannot be partially overwritten.
The prototype UI never silently substitutes deterministic copy. It shows `AI connection
unavailable`, preserves the route, and offers a user-initiated `DEMO GUIDANCE` mode whose
messages remain visibly labeled. The readiness checker, Signature Drive products,
commerce authorities and Reality loop remain available without impersonating live AI.

## 2026-08-26 local verification

- `.env.example` is documentation only and currently contains no key value.
- `.env.local` declares a non-empty `GEMINI_API_KEY`; Vinext loads it into the server process.
- `POST /api/conversation` reached the Gemini server helper but returned `502 AI_UPSTREAM_ERROR`
  after the 25-second abort timeout.
- A direct connectivity check to `generativelanguage.googleapis.com:443` failed immediately
  from this machine. This establishes a network reachability failure, not an absent key or
  unsupported model-name diagnosis.
- The homepage used to call no Gemini endpoint. `AdvisorExperience` called local
  `adviseRoadTrip` directly, while `/api/conversation` was limited to structured planning
  extraction. That combination explains why a configured key did not make the old homepage
  advisor feel live or broadly conversational.
- The new `/api/advisor` uses a 12-second prototype timeout, exposes failure, and never
  applies an AI proposal unless deterministic validation succeeds.

## Local configuration

Copy `.env.example` to `.env.local`, set `GEMINI_API_KEY`, and restart the local dev
server. Do not commit `.env.local` or put a key in client code.

## Official references reviewed

- Gemini API quickstart: <https://ai.google.dev/gemini-api/docs/get-started>
- Structured output: <https://ai.google.dev/gemini-api/docs/structured-output>
- Function calling: <https://ai.google.dev/gemini-api/docs/function-calling>
- Google Gen AI JavaScript SDK: <https://googleapis.github.io/js-genai/release_docs/>
