# Sprint 3.5 Validation Report

Date: 2026-08-25 (Asia/Shanghai)

## Delivery gate

`npm run harness:full` passed after the final implementation changes.

Independent xhigh final review: **PASS WITH FIXES**; no P0/P1 blockers remain.

- Harness validation: 6 docs, 19 contracts, and quality scripts present.
- Tests: 66 passed, 0 failed (48 pre-Sprint baseline; 18 net-new cases).
- TypeScript: strict `tsc --noEmit --incremental false` passed.
- ESLint: passed with no warnings or errors.
- Production build: Vinext completed all five build stages and emitted `/`,
  `/api/conversation`, `/api/copilot`, `/api/intent`, and `/api/reality/compile`.

## Adversarial domain evidence

- stale planning revisions and out-of-stage conversation actions are reference-equal no-ops;
- unknown, repeated, reverse-only, contradictory-date, and over-drive-limit routes fail;
- Dali solo and Kunming family intent produce distinct non-Golden plans and rankings;
- impossible luggage capacity is filtered before ranking;
- unsupported capacity clears stale offers and remains recoverable through conversation;
- forged price, malformed timestamps, revived expiry, and non-canonical snapshots cannot cross vehicle reservation;
- equivalent valid ISO timestamps normalize to the same authoritative snapshot;
- reservation is idempotent for the same key and rejects a different duplicate key;
- expired vehicle review can return to a current snapshot without losing route or intent;
- post-route AI patches are stage scoped and cannot desynchronize route, traveler, days, or booking dates;
- hotel selection rejects missing, duplicate, wrong-night, snapshot-drift, malformed-time, and revived-expiry data;
- family stay offers allocate and price two rooms for four travelers;
- hotel skip and one-selected-stay-per-night both materialize coherent structured Trips;
- every routed destination and all ten exact vehicle models have unique attributed media;
- a newly planned Dali Trip completes one road-closure Runtime revision and diff.

## Browser walkthrough

The real local consumer surface was exercised at `http://localhost:3000/`:

1. empty AI-first Travorien entry with no preloaded itinerary;
2. labeled offline Dali solo conversation;
3. five-day Dali → Shaxi → Lijiang proposal (230 km, 4h15 total drive);
4. six ranked cross-category vehicle cards with exact model imagery;
5. Volkswagen Golf local demo reservation (¥1,800);
6. four exact-night hotel selections with visible attributed style-reference imagery;
7. ready five-day Trip with confirmed vehicle, four stays, and ¥8,319 estimate;
8. Dali–Shaxi road closure, deterministic impact, two options, explicit confirmation;
9. eastern-valley reroute producing Trip revision 1 → 2 and three structured diffs.

The destination and vehicle images loaded with visible author/license links. A 390 × 844
viewport check reported no horizontal document overflow. The refreshed Travorien entry is
left open as the user-facing deliverable.

## Gemini network probe

The local server detected configured local credentials, but both sandboxed and approved
direct connectivity checks to `generativelanguage.googleapis.com:443` timed out on this
machine. The normal `/api/conversation` request therefore reached the server boundary and
returned the documented safe `AI_UPSTREAM_ERROR`; it did not fabricate a response. Exact
state preservation is covered at intent and multi-step PlanningSession levels. The live
model success response could not be exercised in this environment.

## Scope and honesty

No production supplier, map, hotel, vehicle, payment, account, permit filing, or deployment
API was added. Inventory, availability, route values, prices, permits, and Reality signals
remain explicitly `demo-mock`. The only newly generated image is the Travorien social card;
product inventory uses researched public-source media with local provenance metadata.
