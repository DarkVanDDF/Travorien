# Sprint 1.5 Validation Report

## Result

Approved. `npm run harness:full` completed successfully on 25 August 2026.

## Gate evidence

| Gate | Result |
|---|---|
| Harness validation | Passed: 6 docs, 15 contracts, quality scripts present |
| Node tests | Passed: 12/12, including capacity fallback and no-fallback-on-auth tests |
| ESLint | Passed: zero warnings or errors |
| Vinext production build | Passed: `/`, `/api/intent`, `/api/copilot` emitted |
| Local page probe | Passed: HTTP 200 |
| Missing Gemini key | Passed: both AI routes return safe HTTP 503 `AI_NOT_CONFIGURED` |
| Gemini credential | Passed: official interaction returned HTTP 200 `completed` |
| Intent structured output | Passed: HTTP 200; all 15 fields returned and JSON parsed |
| Copilot structured output | Passed: HTTP 200; 180-minute command parsed |

## Acceptance review

- Natural-language conversation is the primary intake surface.
- `TripIntent` is nullable, multi-turn, editable, and tracks unresolved fields.
- Minimum generation intent requires region, duration, travelers, and self-drive.
- The next question is chosen deterministically, one at a time.
- Gemini runs only in server modules with JSON Schema structured output.
- AI failures keep existing intent/trip state and expose retry or a labeled demo path.
- Copilot output is a narrow command and cannot bypass `trip-engine.ts`.
- The generated Yunnan route preserves revisioned `TripChange` diffs and mock provenance.
- Discovery, OTA trip details, persistent Copilot, responsive styling, and refreshed
  social preview are present.

## Environment note

The credential and both exact structured payloads were validated against Google's
official endpoint without exposing the key. The Codex sandbox blocks outbound network
connections from its Node child process, so same-origin `/api/intent` and `/api/copilot`
requests made through a Codex-launched server time out and return the designed safe 502.
Run `npm run dev` from the normal local terminal to complete that final route-level
probe outside the sandbox.
