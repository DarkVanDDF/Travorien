"use client";
/* eslint-disable @next/next/no-img-element -- researched public-source imagery is rendered directly in this local demo. */

import { useRef, useState } from "react";
import type { ConversationTurnResult, HotelOffer, PlanningSession, Trip, VehicleOffer } from "./domain.ts";
import type { PlanningSeed } from "./product-domain.ts";
import type { PrototypePlanningHandoff } from "./prototype-domain.ts";
import { mockCatalog, mockDataNotice } from "./data/mock-data.ts";
import { destinationMediaFor } from "./data/media-catalog.ts";
import { isRoutePlanReadyIntent } from "./intent-engine.ts";
import {
  applyPlanningAction,
  createPlanningSessionFromSeed,
  generateHotelOffers,
  generateVehicleOffers,
  isCurrentPlanningResponse,
  materializePlanningTrip,
  planRoute,
  reserveVehicle,
  retainPlanningSessionOnAiFailure,
} from "./planning-engine.ts";

const money = (amount: number) => `¥${amount.toLocaleString("en-US")}`;
const time = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
const messageId = () => `message-${Date.now()}-${Math.round(performance.now())}`;
const planningMoment = (session: PlanningSession) => session.stage === "DISCOVERY" ? "exploring your direction" : session.stage === "ROUTE_PROPOSAL" ? "your route is open" : session.stage === "VEHICLE_SELECTION" ? "matching cars to this road" : session.stage === "VEHICLE_RESERVATION" ? "reviewing your car" : session.stage === "HOTEL_UPSELL" || session.stage === "HOTEL_SELECTION" ? "shaping stays around the drive" : "your journey is ready";

function Brand() {
  return <span className="neo-brand"><span className="neo-mark">T</span><span>Travorien</span></span>;
}

const intentFacts = (session: PlanningSession) => [
  session.intent.destinationRegion,
  session.intent.arrivalCity ? `Arrive ${session.intent.arrivalCity}` : null,
  session.intent.startDate,
  session.intent.durationDays ? `${session.intent.durationDays} days` : null,
  session.intent.travelers ? `${session.intent.travelers} traveler${session.intent.travelers === 1 ? "" : "s"}` : null,
  session.intent.travelPace,
  session.intent.budget,
  session.intent.luggageCount !== null ? `${session.intent.luggageCount} bag${session.intent.luggageCount === 1 ? "" : "s"}` : null,
].filter(Boolean) as string[];

function MediaCredit({ sourceUrl, author, licenseNote }: { sourceUrl: string; author: string; licenseNote: string }) {
  return <a className="media-credit" href={sourceUrl} target="_blank" rel="noreferrer">Photo: {author} · {licenseNote}</a>;
}

function RouteProposal({ session, onConfirm }: { session: PlanningSession; onConfirm: () => void }) {
  const plan = session.routePlan!;
  const hero = destinationMediaFor(plan.destinationIds.at(-1)!);
  return <section className="planning-surface route-proposal">
    <div className="planning-surface-copy"><p className="planning-kicker">Your first route</p><h2>{plan.title}</h2><p>{plan.summary}</p><div className="route-plan-metrics"><span><small>Distance</small><strong>{plan.distanceKm} km</strong></span><span><small>Drive time</small><strong>{time(plan.drivingMinutes)}</strong></span><span><small>Longest day</small><strong>{time(plan.longestDrivingMinutes)}</strong></span></div><ul>{plan.rationale.map((item) => <li key={item}>✓ {item}</li>)}</ul><button className="planning-primary" onClick={onConfirm}>Looks good — show vehicles <span>→</span></button></div>
    <div className="route-plan-visual">{hero && <><img src={hero.imageUrl} alt={hero.alt} /><MediaCredit {...hero} /></>}<div className="route-plan-days">{plan.days.map((day) => <article key={day.id}><span>{String(day.dayNumber).padStart(2, "0")}</span><p><small>{day.date}</small><strong>{mockCatalog.destinations.find((item) => item.id === day.destinationId)?.name}</strong><em>{day.routeSegmentIds.length ? "Drive" : "Keys down"}</em></p></article>)}</div></div>
  </section>;
}

function VehicleCard({ offer, selected, onSelect }: { offer: VehicleOffer; selected: boolean; onSelect: () => void }) {
  const media = offer.imageProvenance;
  return <article className={`commerce-card vehicle-offer-card ${selected ? "selected" : ""}`}>
    <div className="commerce-photo"><img src={offer.primaryImage} alt={media.alt} /><span>{offer.rank === 1 ? "Best match" : offer.category}</span><MediaCredit {...media} /></div>
    <header><div><small>{offer.supplierName}</small><h3>{offer.model}</h3><p>{offer.category} · {offer.transmission} · {offer.fuelType}</p></div><strong>{money(offer.dailyPriceCny)}<small>/day</small></strong></header>
    <div className="vehicle-specs"><span>{offer.seats} seats</span><span>{offer.luggage} bags</span><span>{offer.doors} doors</span><span>{offer.rentalDays} days</span><span>{offer.available ? "Available · mock" : "Unavailable"}</span></div>
    <p className="recommendation">✦ {offer.recommendation}</p><ul className="recommendation-reasons">{offer.recommendationReasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>
    <ul>{[offer.cancellationPolicy, offer.mileagePolicy, offer.basicCoverage].map((item) => <li key={item}>✓ {item}</li>)}</ul>
    <footer><p><small>Demo total</small><strong>{money(offer.totalPriceCny)}</strong></p><button onClick={onSelect}>{selected ? "Selected" : "Choose this car"}</button></footer>
  </article>;
}

function VehicleSelectionSurface({ session, onSelect }: { session: PlanningSession; onSelect: (offer: VehicleOffer) => void }) {
  return <section className="planning-commerce"><div className="planning-section-head"><div><p className="planning-kicker">Cars for this journey</p><h2>Choose the car that fits this trip.</h2></div><p>Ranked from structured intent and route context. Prices and availability are demo-mock.</p></div>{session.vehicleOffers.length ? <div className="commerce-grid">{session.vehicleOffers.map((offer) => <VehicleCard key={offer.id} offer={offer} selected={session.vehicleSelection?.offerId === offer.id} onSelect={() => onSelect(offer)} />)}</div> : <div className="no-inventory"><strong>No single demo vehicle fits the current party and luggage.</strong><p>Use the conversation above to reduce the party or bag count. The current fleet supports up to 7 travelers and 5 bags.</p></div>}</section>;
}

function ReservationSurface({ session, onReserve, onRefresh }: { session: PlanningSession; onReserve: () => void; onRefresh: () => void }) {
  const offer = session.vehicleOffers.find((item) => item.id === session.vehicleSelection?.offerId)!;
  const media = offer.imageProvenance;
  return <section className="planning-surface reservation-review"><div className="reservation-image"><img src={offer.primaryImage} alt={media.alt} /><MediaCredit {...media} /></div><div><p className="planning-kicker">Car reservation review</p><h2>{offer.model}</h2><p>{offer.recommendation}</p><dl><div><dt>Supplier</dt><dd>{offer.supplierName}</dd></div><div><dt>Pickup</dt><dd>{offer.pickupLocation}<small>{offer.pickupDateTime}</small></dd></div><div><dt>Drop-off</dt><dd>{offer.dropoffLocation}<small>{offer.dropoffDateTime}</small></dd></div><div><dt>Policies</dt><dd>{offer.cancellationPolicy}<small>{offer.mileagePolicy} · deposit {money(offer.depositCny)}</small></dd></div><div><dt>Authoritative demo total</dt><dd>{money(offer.totalPriceCny)}</dd></div></dl><small className="commerce-disclaimer">No payment is collected. This creates a confirmed local demo reservation only.</small><div className="reservation-actions"><button className="planning-secondary" onClick={onRefresh}>Back &amp; refresh offers</button><button className="planning-primary" onClick={onReserve}>Confirm demo reservation <span>→</span></button></div></div></section>;
}

function HotelUpsell({ session, onYes, onSkip }: { session: PlanningSession; onYes: () => void; onSkip: () => void }) {
  const booking = session.vehicleBooking!;
  const offer = session.vehicleOffers.find((item) => item.id === booking.offerId)!;
  return <section className="hotel-upsell"><p className="planning-kicker">Your car is reserved for this demo trip</p><span className="confirmation-mark">✓</span><h2>{offer.model} confirmed.</h2><div className="booking-confirmation"><span><small>Booking reference</small><strong>{booking.reservationCode}</strong></span><span><small>Pickup</small><strong>{booking.pickupLocation}</strong><em>{booking.pickupDateTime}</em></span><span><small>Drop-off</small><strong>{booking.dropoffLocation}</strong><em>{booking.dropoffDateTime}</em></span><span><small>Demo total</small><strong>{money(booking.amountCny)}</strong><em>{booking.cancellationPolicy}</em></span></div><h3>Would you like me to arrange hotels along the route too?</h3><p>We can recommend one stay for every night, matched to the exact destination and your preferred style. Or continue without hotels.</p><div className="hotel-upsell-actions"><button className="planning-primary" onClick={onYes}>Yes, show stays <span>→</span></button><button className="planning-secondary" onClick={onSkip}>No, I’ll arrange my own stays</button></div><small className="commerce-disclaimer">Confirmed local demo booking · no supplier hold or payment.</small></section>;
}

function HotelCard({ offer, selected, onSelect }: { offer: HotelOffer; selected: boolean; onSelect: () => void }) {
  const hotel = mockCatalog.hotels.find((item) => item.id === offer.hotelId)!;
  const media = offer.imageProvenance;
  return <article className={`hotel-offer-card ${selected ? "selected" : ""}`}><div><img src={offer.primaryImage} alt={media.alt} /><span>{offer.rank === 1 ? "Recommended" : "Alternative"}</span><MediaCredit {...media} /></div><section><small>{hotel.style} · {hotel.rating.toFixed(1)} / 5 demo rating</small><h3>{hotel.name}</h3><p>{offer.roomType} · {offer.mealPlan}</p><p>{offer.recommendation}</p><div className="hotel-road-fit"><span>Parking: {offer.parkingType}{offer.parkingDistanceMeters !== null ? ` · ${offer.parkingDistanceMeters}m` : ""}</span><span>Vehicle access: {offer.vehicleAccess.replaceAll("-", " ")}</span><span>Late arrival: {offer.lateArrivalSuitability}</span><span>Route convenience: {offer.routeConvenience}</span></div><div className="hotel-amenities">{offer.amenities.slice(0, 3).map((item) => <span key={item}>{item}</span>)}</div><small>{offer.cancellationPolicy}</small><small className="hotel-image-note">Style-reference image · not the actual property</small><footer><strong>{money(offer.nightlyPriceCny)}<small> / night for {offer.roomCount} {offer.roomCount === 1 ? "room" : "rooms"} · demo</small></strong><button type="button" onClick={onSelect}>{selected ? "Selected" : "Choose"}</button></footer></section></article>;
}

function HotelSelectionSurface({ session, choices, onChoice, onConfirm }: { session: PlanningSession; choices: Record<string, string>; onChoice: (dayId: string, offerId: string) => void; onConfirm: () => void }) {
  const nights = session.routePlan!.days.slice(0, -1);
  return <section className="planning-commerce hotel-commerce"><div className="planning-section-head"><div><p className="planning-kicker">Stays along the road</p><h2>A place for every night.</h2></div><p>Each offer is bound to this exact route night and destination. Selection is not a live reservation.</p></div><div className="hotel-nights">{nights.map((day) => <section key={day.id}><header><span>Night {day.dayNumber}</span><p><strong>{mockCatalog.destinations.find((item) => item.id === day.destinationId)?.name}</strong><small>{day.date}</small></p></header><div>{session.hotelOffers.filter((offer) => offer.dayId === day.id).map((offer) => <HotelCard key={offer.id} offer={offer} selected={choices[day.id] === offer.id} onSelect={() => onChoice(day.id, offer.id)} />)}</div></section>)}</div><div className="hotel-confirm"><p><strong>{Object.keys(choices).length} nights selected</strong><small>Demo-mock inventory · no payment</small></p><button className="planning-primary" onClick={onConfirm}>Finish my trip <span>→</span></button></div></section>;
}

function HotelPreferenceSurface({ onChoose }: { onChoose: (preference: NonNullable<PlanningSession["intent"]["accommodationPreference"]>) => void }) {
  const preferences = [
    ["budget", "Best value", "Keep nightly cost low"],
    ["comfort", "Comfortable", "A dependable, easy stay"],
    ["local-character", "Boutique & local", "Courtyards and regional character"],
    ["premium", "Luxury", "Higher-rated premium stays"],
  ] as const;
  return <section className="planning-commerce hotel-preference"><div className="planning-section-head"><div><p className="planning-kicker">Your stay style</p><h2>What kind of stays feel right?</h2></div><p>Choose a direction or describe it naturally above. Travorien will then rank one current demo offer set for every exact route night.</p></div><div>{preferences.map(([value, label, description]) => <button key={value} onClick={() => onChoose(value)}><span>{label}</span><small>{description}</small></button>)}</div></section>;
}

export default function PlanningExperience({ onReady, seed = { kind: "blank" } }: { onReady: (trip: Trip) => void; seed?: PlanningSeed | PrototypePlanningHandoff }) {
  const [session, setSession] = useState(() => createPlanningSessionFromSeed(seed));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [hotelChoices, setHotelChoices] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef(session);
  const commitSession = (next: PlanningSession) => { sessionRef.current = next; setSession(next); };

  const applyRouteIfReady = (next: PlanningSession, proposal: string[]) => {
    if (!isRoutePlanReadyIntent(next.intent) || (next.stage !== "DISCOVERY" && next.stage !== "ROUTE_PROPOSAL")) return next;
    const routePlan = planRoute(next.intent, proposal);
    if (!routePlan) return next;
    return applyPlanningAction(next, { type: "PROPOSE_ROUTE", baseRevision: next.revision, routePlan });
  };

  const refreshCommerceIfNeeded = (next: PlanningSession) => {
    if (next.stage === "VEHICLE_SELECTION" && next.routePlan) {
      const offers = generateVehicleOffers(next.intent, next.routePlan);
      setNotice(offers.length ? "" : "No single demo vehicle fits the updated party or luggage. Revise those details in the conversation to generate a new current offer set.");
      return applyPlanningAction(next, { type: "REFRESH_VEHICLE_OFFERS", baseRevision: next.revision, offers });
    }
    if (next.stage === "HOTEL_SELECTION" && next.routePlan && next.intent.accommodationPreference) {
      const offers = generateHotelOffers(next.intent, next.routePlan);
      const choices = Object.fromEntries(next.routePlan.days.slice(0, -1).map((day) => [day.id, offers.find((offer) => offer.dayId === day.id && offer.rank === 1)?.id]).filter((entry): entry is [string, string] => Boolean(entry[1])));
      setHotelChoices(choices);
      return applyPlanningAction(next, { type: "REFRESH_HOTEL_OFFERS", baseRevision: next.revision, offers });
    }
    return next;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || session.stage === "TRIP_READY") return;
    const withUser = applyPlanningAction(session, { type: "ADD_USER_MESSAGE", message: { id: messageId(), role: "user", text } });
    commitSession(withUser); setInput(""); setLoading(true); setNotice("");
    try {
      const response = await fetch("/api/conversation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, currentIntent: withUser.intent, conversation: withUser.conversation, stage: withUser.stage, planningRevision: withUser.revision }) });
      const payload = await response.json() as { result?: ConversationTurnResult; baseRevision?: number; error?: { code?: string; message?: string } };
      if (!response.ok || !payload.result || payload.baseRevision !== withUser.revision) throw new Error(payload.error?.message ?? "The conversation response was stale or invalid.");
      if (!isCurrentPlanningResponse(sessionRef.current, withUser)) return;
      const withAssistant = applyPlanningAction(withUser, { type: "APPLY_CONVERSATION_RESULT", baseRevision: withUser.revision, result: payload.result, assistantMessage: { id: messageId(), role: "assistant", text: payload.result.assistantMessage } });
      const next = refreshCommerceIfNeeded(applyRouteIfReady(withAssistant, payload.result.proposedDestinationIds));
      commitSession(next);
      if (isRoutePlanReadyIntent(withAssistant.intent) && next.stage === "DISCOVERY") setNotice("Those details are saved, but the proposed route did not pass the local directed-route validation. Try a Kunming, Dali, Shaxi, or Lijiang arrival.");
    } catch (error) {
      if (!isCurrentPlanningResponse(sessionRef.current, withUser)) return;
      commitSession(retainPlanningSessionOnAiFailure(withUser));
      setNotice(error instanceof Error ? `${error.message} Your planning state is unchanged.` : "Travorien AI is temporarily unavailable. Your planning state is unchanged.");
    } finally { setLoading(false); }
  };

  const conversationEnabled = ["DISCOVERY", "ROUTE_PROPOSAL", "VEHICLE_SELECTION", "HOTEL_SELECTION"].includes(session.stage);

  const confirmRoute = () => {
    const offers = generateVehicleOffers(session.intent, session.routePlan!);
    if (!offers.length) {
      setNotice("No single demo vehicle fits this party. The current fleet supports up to 7 travelers and 5 bags; tell Travorien a smaller party or bag count to refresh the route.");
      inputRef.current?.focus();
      return;
    }
    commitSession(applyPlanningAction(session, { type: "CONFIRM_ROUTE", baseRevision: session.revision, offers }));
    setNotice("");
  };
  const selectVehicle = (offer: VehicleOffer) => commitSession(applyPlanningAction(session, { type: "SELECT_VEHICLE", baseRevision: session.revision, selection: { offerId: offer.id, snapshotId: offer.snapshotId } }));
  const confirmVehicle = () => {
    const booking = reserveVehicle(session, session.vehicleSelection!, `reserve:${session.plannedTripId}:${session.vehicleSelection!.offerId}`);
    if (!booking) {
      const offers = generateVehicleOffers(session.intent, session.routePlan!);
      commitSession(applyPlanningAction(session, { type: "RETURN_TO_VEHICLE_SELECTION", baseRevision: session.revision, offers }));
      setNotice("That offer expired or no longer matched the authoritative demo catalog. The route was preserved and current demo offers were refreshed.");
      return;
    }
    commitSession(applyPlanningAction(session, { type: "CONFIRM_VEHICLE_BOOKING", baseRevision: session.revision, booking })); setNotice("");
  };
  const refreshVehicleSelection = () => {
    const offers = generateVehicleOffers(session.intent, session.routePlan!);
    commitSession(applyPlanningAction(session, { type: "RETURN_TO_VEHICLE_SELECTION", baseRevision: session.revision, offers }));
    setNotice("Current demo vehicle offers refreshed; your route and trip intent were preserved.");
  };
  const chooseHotels = () => {
    const offers = session.intent.accommodationPreference ? generateHotelOffers(session.intent, session.routePlan!) : [];
    const next = applyPlanningAction(session, { type: "CHOOSE_HOTELS", baseRevision: session.revision, decision: "yes", offers });
    const choices = Object.fromEntries(session.routePlan!.days.slice(0, -1).map((day) => [day.id, offers.find((offer) => offer.dayId === day.id && offer.rank === 1)?.id]).filter((entry): entry is [string, string] => Boolean(entry[1])));
    setHotelChoices(choices); commitSession(next);
  };
  const chooseHotelPreference = (preference: NonNullable<PlanningSession["intent"]["accommodationPreference"]>) => {
    const result: ConversationTurnResult = { assistantMessage: `I’ll prioritize ${preference.replace("-", " ")} stays and keep every offer tied to its exact route night.`, extractedFields: { accommodationPreference: preference }, proposedDestinationIds: [], routeExplanation: null, confidence: 1 };
    const withPreference = applyPlanningAction(session, { type: "APPLY_CONVERSATION_RESULT", baseRevision: session.revision, result, assistantMessage: { id: messageId(), role: "assistant", text: result.assistantMessage } });
    commitSession(refreshCommerceIfNeeded(withPreference));
  };
  const finish = (next: PlanningSession) => {
    const trip = materializePlanningTrip(next);
    if (!trip) { setNotice("The final Trip did not pass route, booking, hotel, or price validation."); return; }
    onReady(trip);
  };
  const skipHotels = () => {
    const next = applyPlanningAction(session, { type: "CHOOSE_HOTELS", baseRevision: session.revision, decision: "skip" });
    commitSession(next); finish(next);
  };
  const confirmHotels = () => {
    const ordered = session.routePlan!.days.slice(0, -1).map((day) => hotelChoices[day.id]).filter(Boolean);
    const snapshotId = session.hotelOffers.find((offer) => offer.id === ordered[0])?.snapshotId ?? null;
    const next = applyPlanningAction(session, { type: "COMPLETE_HOTELS", baseRevision: session.revision, selection: { decision: "selected", selectedOfferIds: ordered, snapshotId } });
    if (next === session) {
      const offers = generateHotelOffers(session.intent, session.routePlan!);
      const refreshed = applyPlanningAction(session, { type: "REFRESH_HOTEL_OFFERS", baseRevision: session.revision, offers });
      const choices = Object.fromEntries(session.routePlan!.days.slice(0, -1).map((day) => [day.id, offers.find((offer) => offer.dayId === day.id && offer.rank === 1)?.id]).filter((entry): entry is [string, string] => Boolean(entry[1])));
      setHotelChoices(choices); commitSession(refreshed);
      setNotice("A stay selection was missing, expired, or no longer authoritative. Current demo offers were refreshed for every route night.");
      return;
    }
    commitSession(next); finish(next);
  };

  return <main className="planning-app">
    <nav className="neo-nav"><Brand /><div className="neo-nav-links"><span>AI-first China self-drive</span><em>All inventory is demo-mock</em></div></nav>
    <section className="planning-hero">
      <div className="planning-hero-copy"><p className="neo-kicker"><span />China, by road and by conversation</p><h1>Where do you<br /><em>want the road to go?</em></h1><p>Tell Travorien what matters. It will converse naturally, validate the road, match the right car, and keep the journey useful after departure.</p><div><span>No fixed tour template</span><span>Road-trip knowledge</span><span>Demo choices clearly marked</span></div></div>
      <div className="planning-conversation">
        <header><span className="ai-orb">✦</span><p><strong>Travorien Advisor</strong><small>{planningMoment(session)}</small></p><i>Knowledge-grounded</i></header>
        <div className="planning-messages" aria-live="polite">{session.conversation.slice(-7).map((message) => <article key={message.id} className={message.role}><span>{message.role === "assistant" ? "T" : "You"}</span><p>{message.text}</p></article>)}{loading && <article className="assistant thinking"><span>T</span><p><i /><i /><i /></p></article>}</div>
        <div className="planning-facts">{intentFacts(session).length ? intentFacts(session).map((fact) => <span key={fact}>{fact}</span>) : <p>Your structured trip intent will appear here as the conversation develops.</p>}</div>
        <form onSubmit={(event) => { event.preventDefault(); void send(); }}><textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder={conversationEnabled ? "Try: Make the pace slower, or prioritize easier parking…" : "Complete this confirmation step to continue."} aria-label="Describe your China self-drive trip" disabled={!conversationEnabled} /><div><button type="submit" disabled={!conversationEnabled || !input.trim() || loading}>Send <span>↑</span></button></div></form>
        {notice && <p className="planning-notice" role="status">{notice}</p>}
      </div>
    </section>
    {session.stage === "DISCOVERY" && <section className="planning-empty"><span>✦</span><p><strong>Your trip starts as a conversation, not a preloaded itinerary.</strong><small>For a route, include arrival city, start date, duration, travelers, and that you want to self-drive.</small></p></section>}
    {session.stage === "ROUTE_PROPOSAL" && <RouteProposal session={session} onConfirm={confirmRoute} />}
    {session.stage === "VEHICLE_SELECTION" && <VehicleSelectionSurface session={session} onSelect={selectVehicle} />}
    {session.stage === "VEHICLE_RESERVATION" && <ReservationSurface session={session} onReserve={confirmVehicle} onRefresh={refreshVehicleSelection} />}
    {session.stage === "HOTEL_UPSELL" && <HotelUpsell session={session} onYes={chooseHotels} onSkip={skipHotels} />}
    {session.stage === "HOTEL_SELECTION" && (session.hotelOffers.length ? <HotelSelectionSurface session={session} choices={hotelChoices} onChoice={(dayId, offerId) => setHotelChoices((current) => ({ ...current, [dayId]: offerId }))} onConfirm={confirmHotels} /> : <HotelPreferenceSurface onChoose={chooseHotelPreference} />)}
    <footer className="planning-footer"><Brand /><p>{mockDataNotice}</p></footer>
  </main>;
}
