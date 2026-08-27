# Product Reframe V2 Architecture Review

## Product boundary

The new consumer product is a content and orchestration layer above the existing
planning, commerce, Trip, and Reality authorities. `SignatureDrive`, `Guide`, and
`DrivingReadiness` describe and advise; they do not become alternate Trip sources of
truth. Only a transaction-ready drive can project into a validated `TripIntent` and
catalog route proposal.

## Layering

```text
Explore / Guides / Driving Readiness
                ↓
SignatureDrive + RoadTripKnowledge
                ↓
Travel Advisor (Gemini explanation + deterministic candidate IDs)
                ↓
PlanningSession / RoutePlan
                ↓
VehicleOffer / VehicleBooking / HotelOffer
                ↓
Trip → My Drive → existing Reality Runtime
```

Five Signature Drives may be editorially complete while only Yunnan is transaction-
ready against the current route graph. This distinction must remain explicit in data
and UI. Content metrics are curated `demo-content`; transaction metrics continue to be
calculated from the authoritative local catalog.

## Authority boundaries

- Gemini receives bounded traveler context plus a compact server-side drive knowledge
  packet. It may compare known drives and explain trade-offs.
- Recommended drive IDs must exist in the local SignatureDrive catalog; unknown IDs are
  discarded.
- Policy/readiness answers are deterministic projections of source-bound rules. Gemini
  cannot upgrade `UNKNOWN` to eligible.
- Inspiration and readiness entry points create a typed planning seed, then enter the
  same existing PlanningSession reducer and commerce engines.
- My Drive is a presentation facade over the same Trip and Runtime state, not a second
  operations model.

## Minimal new contracts

- `SignatureDrive`, `DriveDay`, `DriveVariant`, and `DriveMedia`
- `Guide`, `GuideSection`, and `SourceProvenance`
- `DrivingReadinessInput`, `DrivingReadinessResult`, and verification status
- `AdvisorContext` and deterministic `DriveRecommendation`

Destination-road-trip profiles and a general knowledge graph are deferred until content
volume proves that separate contracts are needed.

## Primary risks

1. Treating editorial distances as booking authority.
2. Letting AI invent legal/readiness facts or unsupported drive IDs.
3. Creating parallel route/Trip state for Signature Drives.
4. Preserving transaction-first page hierarchy under new copy.
5. Presenting non-Yunnan drives as bookable despite absent route graph and inventory.
6. Exposing the Runtime as an engineering console instead of a current-day driving aid.

