"use client";
/* eslint-disable @next/next/no-img-element -- researched public-source imagery is rendered directly in this local demo. */

import { useMemo, useState } from "react";
import type { CandidatePlan, RawRealitySignal, RealityEvent, RealityRuntimeState, Trip } from "./domain.ts";
import AdvisorExperience from "./AdvisorExperience.tsx";
import ConsumerHome from "./ConsumerHome.tsx";
import { destinationMediaFor, vehicleMediaFor } from "./data/media-catalog.ts";
import { mockCatalog, mockDataNotice } from "./data/mock-data.ts";
import { mockRealitySignalAdapter, staticDemoFeedAdapter } from "./reality-adapters.ts";
import { assessRealityEvent, generateCandidatePlans } from "./reality-engine.ts";
import {
  applyRealityDecision,
  createDemoOutcomeObservation,
  createRealityRuntimeState,
  ingestRealitySignal,
  recordDecisionTimeline,
  recordOutcomeObservation,
  type RealityDecisionSelection,
} from "./reality-runtime.ts";
import { applyTripChangeCommand, getTripMetrics } from "./trip-engine.ts";
import { prototypeHandoffPrompt } from "./prototype-engine.ts";
import type { PrototypePlanningHandoff } from "./prototype-domain.ts";

const money = (amount: number) => `¥${amount.toLocaleString("en-US")}`;
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
const destination = (id: string) => mockCatalog.destinations.find((item) => item.id === id);
const hotel = (id?: string) => mockCatalog.hotels.find((item) => item.id === id);
const experience = (id: string) => mockCatalog.experiences.find((item) => item.id === id);
const route = (id: string) => mockCatalog.routeSegments.find((item) => item.id === id);
const eventIcon = (event?: RealityEvent) => event?.type === "WEATHER_RISK" ? "☂" : event?.type === "ROAD_CLOSURE" ? "↗" : event?.type === "HOTEL_UNAVAILABLE" ? "⌂" : "✈";

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className={`neo-brand ${inverse ? "inverse" : ""}`}><span className="neo-mark">T</span><span>Travorien</span></span>;
}

function TripCopilot({ trip, onApply, onClose }: { trip: Trip; onApply: (trip: Trip) => void; onClose: () => void }) {
  const [request, setRequest] = useState("I don't want to drive more than 3 hours a day.");
  const [preview, setPreview] = useState<Trip | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const change = preview?.changes.at(-1);

  const directPreview = () => {
    const next = applyTripChangeCommand(trip, { type: "set-max-daily-driving-minutes", maxMinutes: 180 });
    setPreview(next === trip ? null : next);
    setMessage(next === trip ? "Every driving day is already under three hours." : "A safe route change is ready for review.");
  };
  const analyze = async () => {
    setLoading(true); setMessage(""); setPreview(null);
    try {
      const response = await fetch("/api/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: request, tripRevision: trip.revision }) });
      const payload = await response.json() as { interpretation?: { command: { type: "set-max-daily-driving-minutes"; maxMinutes: number } | null; assistantMessage: string }; error?: { message?: string } };
      if (!response.ok || !payload.interpretation) throw new Error(payload.error?.message ?? "Copilot could not interpret that change.");
      if (!payload.interpretation.command) { setMessage(payload.interpretation.assistantMessage); return; }
      const next = applyTripChangeCommand(trip, payload.interpretation.command);
      setPreview(next === trip ? null : next); setMessage(next === trip ? "That request made no change to this journey." : payload.interpretation.assistantMessage);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Copilot is temporarily unavailable. Your Trip is unchanged."); }
    finally { setLoading(false); }
  };

  return <div className="copilot-backdrop" role="dialog" aria-modal="true" aria-labelledby="copilot-title"><section className="copilot-sheet"><header><div><span className="ai-orb">✦</span><p><strong id="copilot-title">Travorien Advisor</strong><small>My Drive · plan version {trip.revision}</small></p></div><button onClick={onClose} aria-label="Close advisor">×</button></header><div className="copilot-intro"><h2>What should this journey do differently?</h2><p>Explain it in your own words. Travorien previews a safe, structured change before anything applies.</p></div><div className="copilot-compose"><textarea value={request} onChange={(event) => setRequest(event.target.value)} /><button onClick={() => void analyze()} disabled={loading}>{loading ? "Interpreting…" : "Review change"} <span>→</span></button><button className="quick-command" onClick={directPreview}>Quick change · Keep drives under 3h</button></div>{message && <p className="copilot-note" role="status">{message}</p>}{change && <section className="diff-preview"><header><div><span>✓</span><p><small>Safe change ready</small><strong>What would change</strong></p></div><em>Version {trip.revision} → {preview!.revision}</em></header><div className="modern-diffs">{change.diffs.map((diff) => <div key={`${diff.objectId}-${diff.field}`}><small>{diff.field}</small><del>{diff.before}</del><span>→</span><strong>{diff.after}</strong></div>)}</div><div className="diff-total"><p>Estimated impact <small>Demo-mock pricing</small></p><strong>{change.priceDeltaCny >= 0 ? "+" : "−"}{money(Math.abs(change.priceDeltaCny))}</strong></div><button className="apply-change" onClick={() => onApply(preview!)}>Confirm this change <span>→</span></button></section>}</section></div>;
}

const signedMinutes = (value: number) => value === 0 ? "No change" : `${value > 0 ? "+" : "−"}${Math.abs(value)} min`;
const signedMoney = (value: number) => value === 0 ? "No change" : `${value > 0 ? "+" : "−"}${money(Math.abs(value))}`;
const riskLabel = (plan: CandidatePlan) => plan.riskLevel === "LOW_MEDIUM" ? "Low–medium" : `${plan.riskLevel[0]}${plan.riskLevel.slice(1).toLowerCase()}`;
const responseLabel = (status: "UNMITIGATED" | "MITIGATED" | "ACCEPTED") => status === "UNMITIGATED" ? "Needs review" : status === "MITIGATED" ? "Response saved" : "Accepted risk";

function RealityOperations({ trip, runtime, selectedEventId, onSelectEvent, onSignals, onDecision, onOutcome, onClose }: {
  trip: Trip;
  runtime: RealityRuntimeState;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onSignals: (signals: RawRealitySignal[]) => void;
  onDecision: (selection: RealityDecisionSelection) => boolean;
  onOutcome: (eventId: string) => void;
  onClose: () => void;
}) {
  const events = trip.realityEvents.filter((item) => item.status === "ACTIVE");
  const event = events.find((item) => item.id === selectedEventId) ?? events[0];
  const impact = event ? assessRealityEvent(trip, event) : null;
  const plans = event && impact ? generateCandidatePlans(trip, event, impact) : [];
  const [selection, setSelection] = useState<{ planId: string; baseTripRevision: number; impactAssessmentId: string; catalogFingerprint: string } | null>(null);
  const [manualReport, setManualReport] = useState("The Dali to Shaxi road is closed on 15 October.");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const selected = impact && selection?.baseTripRevision === trip.revision && selection.impactAssessmentId === impact.id && selection.catalogFingerprint === impact.catalogFingerprint ? plans.find((plan) => plan.id === selection.planId) : undefined;
  const decision = event ? trip.decisions.findLast((item) => item.eventId === event.id && item.eventVersion === event.version) : undefined;
  const responseChange = decision ? trip.changes.find((item) => item.id === decision.tripChangeId) : undefined;
  const outcome = decision ? runtime.outcomes.find((item) => item.decisionId === decision.id) : undefined;

  const report = async () => {
    if (!manualReport.trim() || loading) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/reality/compile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: manualReport, trip }) });
      const payload = await response.json() as { signal?: RawRealitySignal; error?: { code?: string; message?: string } };
      if (!response.ok || !payload.signal) throw new Error(payload.error?.code === "AI_NOT_CONFIGURED" ? "AI parsing is not configured. Use a structured demo scenario below." : payload.error?.message ?? "That road update could not be checked.");
      onSignals([payload.signal]); setMessage("Issue checked and connected to this journey.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No road update was created. Your journey is unchanged."); }
    finally { setLoading(false); }
  };
  const apply = () => {
    if (!event || !impact || !selected || !selection) return;
    const applied = onDecision({ eventId: event.id, eventVersion: event.version, planId: selected.id, baseTripRevision: selection.baseTripRevision, impactAssessmentId: selection.impactAssessmentId, catalogFingerprint: selection.catalogFingerprint });
    setMessage(applied ? "Your confirmed road update is now part of this journey." : "This preview is no longer current. Review the options again against your latest journey.");
    if (applied) setSelection(null);
  };

  return <div className="operations-backdrop" role="dialog" aria-modal="true" aria-labelledby="operations-title"><section className="operations-sheet">
    <header className="operations-top"><div><span className="weather-symbol">{eventIcon(event)}</span><p><small>My Drive</small><strong id="operations-title">Road updates</strong></p></div><button onClick={onClose} aria-label="Close road updates">×</button></header>
    <section className="signal-console"><div><small>Demo travel conditions</small><strong>What changed on your road?</strong><p>Try a structured demo update or describe a travel issue. Nothing changes until you choose an option.</p></div><div className="signal-compose"><textarea value={manualReport} onChange={(item) => setManualReport(item.target.value)} aria-label="Report a travel issue" /><button onClick={() => void report()} disabled={loading}>{loading ? "Checking…" : "Check this report"}</button></div><div className="scenario-buttons">{(["HOTEL_UNAVAILABLE", "FLIGHT_DELAY", "ROAD_CLOSURE", "WEATHER_RISK"] as const).map((type) => <button key={type} onClick={() => onSignals(mockRealitySignalAdapter.adapt({ eventType: type }))}>{type.replaceAll("_", " ")}<small>demo-mock</small></button>)}<button onClick={() => onSignals(staticDemoFeedAdapter.adapt(undefined))}>Load demo updates<small>static demo</small></button></div>{message && <p className="operations-message" role="status">{message}</p>}</section>
    <div className="event-switcher">{events.map((item) => { const itemImpact = assessRealityEvent(trip, item); return <button key={item.id} className={item.id === event?.id ? "active" : ""} onClick={() => { onSelectEvent(item.id); setSelection(null); }}><span>{eventIcon(item)}</span><p><small>{item.type.replaceAll("_", " ")}</small><strong>{item.title}</strong></p><em>{responseLabel(itemImpact.mitigationStatus)}</em></button>; })}</div>
    {event && impact ? <>
      <div className="operations-hero"><div><p className="operations-kicker"><span />ACTIVE DEMO UPDATE</p><h2>{impact.mitigationStatus === "UNMITIGATED" ? "Your trip may be affected." : "A response is recorded."}</h2><p>{event.description}</p></div><div className="event-facts"><span><small>Severity</small><strong>{event.severity}</strong></span><span><small>Source confidence</small><strong>{Math.round(event.confidence * 100)}%</strong></span><span><small>Affected</small><strong>{impact.affectedObjects.length} trip items</strong></span><span><small>Response</small><strong>{responseLabel(impact.mitigationStatus)}</strong></span></div></div>
      <section className="impact-panel"><div className="operations-section-title"><p><small>01 · Your journey</small><strong>What may be affected</strong></p><span>{impact.affectedObjects.length} trip items</span></div>{impact.affectedObjects.length ? <div className="affected-grid">{impact.affectedObjects.map((item) => <article key={`${item.objectType}-${item.objectId}`}><span>Journey item</span><strong>{item.label}</strong><p>{item.reason}</p></article>)}</div> : <div className="mitigated-empty"><span>✓</span><p><strong>Your current journey is not affected.</strong><small>The update remains in your road history.</small></p></div>}<details><summary>Why Travorien connected this update</summary><p>Travorien matched the location, date and confirmed journey items in this demo update.</p></details></section>
      {!decision && plans.length > 0 && <section className="plan-compare"><div className="operations-section-title"><p><small>02 · Your decision</small><strong>Compare {plans.length} safe options</strong></p><span>No change applies until confirmed</span></div><div className="plan-grid">{plans.map((plan, index) => <article key={plan.id} className={`plan-card ${selected?.id === plan.id ? "selected" : ""} kind-${plan.kind.toLowerCase()}`}><header><div><span>{String.fromCharCode(65 + index)}</span><p><small>{plan.kind.replaceAll("_", " ")}</small><strong>{plan.title}</strong></p></div><em>{riskLabel(plan)} risk</em></header><p>{plan.description}</p><dl><div><dt>Route drive</dt><dd>{signedMinutes(plan.drivingTimeDeltaMinutes)}</dd></div><div><dt>Demo cost</dt><dd>{signedMoney(plan.estimatedCostDeltaCny)}</dd></div></dl><div className="experience-outcome"><small>Trip outcome</small><strong>{plan.experienceOutcome}</strong></div><ul>{plan.tradeoffs.map((item) => <li key={item}>• {item}</li>)}</ul><button onClick={() => setSelection({ planId: plan.id, baseTripRevision: trip.revision, impactAssessmentId: impact.id, catalogFingerprint: impact.catalogFingerprint })}>{selected?.id === plan.id ? "Selected" : "Choose option"} <span>→</span></button></article>)}</div>{selected && <div className="decision-confirm"><div><span>✓</span><p><small>Ready to update your journey</small><strong>{selected.title}</strong></p></div><p>Your current plan is preserved until you confirm this change.</p><button onClick={apply}>Confirm this option <span>→</span></button></div>}</section>}
      {!decision && !plans.length && <section className="recorded-response"><div className="operations-section-title"><p><small>02 · Your options</small><strong>No safe change is available for this update</strong></p><span>Your journey stays as planned</span></div></section>}
      {decision && responseChange && <section className="recorded-response"><div className="operations-section-title"><p><small>02 · Choice saved</small><strong>What changed</strong></p><span>Plan version {decision.tripRevisionBefore} → {decision.tripRevisionAfter}</span></div><div className="response-diffs">{responseChange.diffs.map((diff) => <div key={`${diff.objectId}-${diff.field}`}><small>{diff.field}</small><del>{diff.before}</del><span>→</span><strong>{diff.after}</strong></div>)}</div><footer><p><small>Chosen option</small><strong>{decision.selectedPlan.title}</strong></p>{outcome ? <p><small>Update status</small><strong>Resolved in this demo</strong></p> : <button onClick={() => onOutcome(event.id)}>Mark this update resolved</button>}</footer></section>}
    </> : <section className="operations-empty"><span>◎</span><h2>No active demo updates</h2><p>Try a road, stay, weather or arrival scenario.</p></section>}
    <section className="operations-timeline"><div className="operations-section-title"><p><small>Road update history</small><strong>What Travorien noticed and what you chose</strong></p><span>{runtime.timeline.length} updates</span></div><div>{runtime.timeline.slice().reverse().map((entry) => <article key={entry.id}><time>{new Date(entry.occurredAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" })}</time><span /><p><small>Road update · demo</small><strong>{entry.title}</strong><em>Saved to this journey’s road history.</em></p></article>)}</div></section>
  </section></div>;
}

function TripView({ initialTrip, onRestart }: { initialTrip: Trip; onRestart: () => void }) {
  const [trip, setTrip] = useState(initialTrip);
  const [runtime, setRuntime] = useState(() => createRealityRuntimeState(initialTrip, []));
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const metrics = useMemo(() => getTripMetrics(trip), [trip]);
  const vehicle = mockCatalog.vehicles.find((item) => item.id === trip.vehicleId)!;
  const vehicleMedia = vehicleMediaFor(vehicle.id);
  const permit = mockCatalog.permitRequirements.find((item) => item.id === trip.permitRequirementId)!;
  const activeEvents = trip.realityEvents.filter((item) => item.status === "ACTIVE");
  const activeEvent = activeEvents.find((item) => assessRealityEvent(trip, item).mitigationStatus === "UNMITIGATED") ?? activeEvents[0];
  const activeImpact = activeEvent ? assessRealityEvent(trip, activeEvent) : null;
  const uniqueDestinationIds = trip.days.map((day) => day.destinationId).filter((id, index, items) => index === 0 || id !== items[index - 1]);
  const heroMedia = destinationMediaFor(trip.days.at(-1)?.destinationId ?? trip.traveler.arrivalCityId) ?? destinationMediaFor(trip.traveler.arrivalCityId);
  const hotelDays = trip.days.filter((item) => item.hotelId);
  const latestRealityChange = trip.changes.findLast((item) => item.source === "reality-event");
  const previewDay = trip.days.find((day) => day.routeSegmentIds.length > 0) ?? trip.days[0];
  const previewDriveMinutes = previewDay.routeSegmentIds.reduce((sum, id) => sum + (route(id)?.drivingMinutes ?? 0), 0);
  const previewDistanceKm = previewDay.routeSegmentIds.reduce((sum, id) => sum + (route(id)?.distanceKm ?? 0), 0);
  const previewHotel = hotel(previewDay.hotelId);
  const previewRoadNotes = previewDay.routeSegmentIds.map((id) => route(id)?.notes).filter(Boolean).join(" ") || "Keep the day flexible and check local conditions before departure.";
  const previewParking = previewHotel ? previewHotel.parkingType === "on-site" ? "On-site parking" : previewHotel.parkingType === "nearby-lot" ? `Nearby lot · ${previewHotel.parkingDistanceMeters ?? "check"} m` : "Parking needs confirmation" : "Choose a stay to add parking guidance";
  const previewFuel = `${vehicle.fuelType.replaceAll("-", " ")} · start the driving day above half a tank`;

  const ingestSignals = (signals: RawRealitySignal[]) => {
    let nextTrip = trip;
    let nextRuntime = runtime;
    let latestEventId: string | null = null;
    for (const signal of signals) {
      const result = ingestRealitySignal(nextTrip, nextRuntime, signal);
      nextTrip = result.trip; nextRuntime = result.state;
      if (result.event) latestEventId = result.event.id;
    }
    setTrip(nextTrip); setRuntime(nextRuntime);
    if (latestEventId) setSelectedEventId(latestEventId);
  };
  const applyDecision = (selection: RealityDecisionSelection) => {
    const next = applyRealityDecision(trip, selection);
    if (next === trip) return false;
    setRuntime((current) => recordDecisionTimeline(current, trip, next, selection.eventId)); setTrip(next); return true;
  };
  const recordOutcome = (eventId: string) => {
    const observation = createDemoOutcomeObservation(trip, eventId);
    if (!observation) return;
    setRuntime(recordOutcomeObservation(runtime, trip, observation).state);
  };

  return <main className="ota-trip">
    <nav className="ota-nav"><button onClick={onRestart} className="brand-reset"><Brand inverse /></button><div><span>My Drive · {uniqueDestinationIds.map((id) => destination(id)?.province).filter((value, index, items) => items.indexOf(value) === index).join(" · ")} · {trip.days.length} days</span><span className="revision-pill">Plan version {trip.revision}</span></div><div className="ota-actions"><button className="operations-nav-button" onClick={() => setOperationsOpen(true)}><span>◎</span> Road updates {activeEvents.length ? `· ${activeEvents.length}` : ""}</button><button className="copilot-nav-button" onClick={() => setCopilotOpen(true)}><span>✦</span> Ask Travorien</button></div></nav>
    <section className="ota-hero">{heroMedia && <img src={heroMedia.imageUrl} alt={heroMedia.alt} />}<div className="ota-overlay" /><div className="ota-hero-content"><p>Your road trip is ready</p><h1>{trip.title}</h1><span>{trip.days.length} connected days, one confirmed demo vehicle and road notes ready for the journey.</span><div className="hero-route">{uniqueDestinationIds.map((id, index) => <span key={id}><i>{index + 1}</i>{destination(id)?.name}</span>)}</div></div><div className="ota-metrics"><div><small>Trip</small><strong>{trip.days.length} days</strong></div><div><small>Road</small><strong>{metrics.distanceKm} km</strong></div><div><small>Longest drive</small><strong>{duration(metrics.longestDrivingMinutes)}</strong></div><div><small>Vehicle</small><strong>{vehicle.name}</strong></div></div>{heroMedia && <a className="hero-media-credit" href={heroMedia.sourceUrl} target="_blank" rel="noreferrer">Photo: {heroMedia.author} · {heroMedia.licenseNote}</a>}</section>
    <section className="my-drive-preview"><header><div><small>Preview day {previewDay.dayNumber}</small><h2>{previewDay.title}</h2></div><span>{previewDay.date}</span></header><div><p><small>Suggested departure</small><strong>{previewDriveMinutes >= 180 ? "08:00 · leave in daylight" : previewDriveMinutes ? "09:00 · unhurried start" : "Keys down"}</strong></p><p><small>On the road</small><strong>{previewDriveMinutes ? `${duration(previewDriveMinutes)} · ${previewDistanceKm} km` : "No through-drive"}</strong></p><p><small>Fuel plan · demo</small><strong>{previewFuel}</strong></p><p><small>Parking</small><strong>{previewParking}</strong></p><p><small>Arrival</small><strong>{previewHotel?.name ?? "Stay not selected"}</strong></p><p><small>Planned stops</small><strong>{previewDay.experienceIds.map((id) => experience(id)?.name).filter(Boolean).join(" · ") || "Open time"}</strong></p><p><small>Navigation note · demo</small><strong>{previewRoadNotes}</strong></p><p><small>Road note</small><strong>{previewDay.notes}</strong></p></div><button onClick={() => setOperationsOpen(true)}>Check demo road updates →</button></section>
    {activeEvent && activeImpact && <section className={`reality-alert ${activeImpact.mitigationStatus !== "UNMITIGATED" ? "responded" : ""}`}><div className="reality-alert-icon">{eventIcon(activeEvent)}</div><div><small>{activeImpact.mitigationStatus === "UNMITIGATED" ? "Your journey may be affected" : "Road response saved"}</small><strong>{activeEvent.title}</strong><p>{activeImpact.summary}</p></div><button onClick={() => { setSelectedEventId(activeEvent.id); setOperationsOpen(true); }}>{activeImpact.mitigationStatus === "UNMITIGATED" ? "Review options" : "View response"} <span>→</span></button></section>}
    {!activeEvent && <section className="runtime-ready-strip"><span>◎</span><p><strong>Road updates ready</strong><small>Try a demo road, hotel, weather or arrival update. Your journey changes only after you confirm an option.</small></p><button onClick={() => setOperationsOpen(true)}>Try a road update →</button></section>}
    {latestRealityChange && <section className="reality-change-summary"><header><div><span>✓</span><p><small>Road update response</small><strong>{latestRealityChange.summary}</strong></p></div><em>Plan version {latestRealityChange.tripRevisionBefore} → {latestRealityChange.tripRevisionAfter}</em></header><div>{latestRealityChange.diffs.slice(0, 6).map((diff) => <p key={`${diff.objectId}-${diff.field}`}><small>{diff.field}</small><del>{diff.before}</del><span>→</span><strong>{diff.after}</strong></p>)}</div></section>}
    <section className="journey-section"><div className="ota-section-head"><div><small>01 · The journey</small><h2>{trip.days.length} days, always connected</h2></div><p>Your roads, stays and experiences stay together as the plan changes.</p></div><div className="journey-list">{trip.days.map((day) => { const media = destinationMediaFor(day.destinationId); const driveMinutes = day.routeSegmentIds.reduce((sum, id) => sum + (route(id)?.drivingMinutes ?? 0), 0); return <article key={day.id} className="journey-day"><div className="journey-image">{media && <img src={media.imageUrl} alt={media.alt} />}<span>Day {String(day.dayNumber).padStart(2, "0")}</span>{media && <a href={media.sourceUrl} target="_blank" rel="noreferrer">{media.author} · {media.licenseNote}</a>}</div><div className="journey-main"><small>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {destination(day.destinationId)?.name}</small><h3>{day.title}</h3><p>{day.notes}</p></div><div className="journey-details"><div><small>Drive</small><strong>{driveMinutes ? `${duration(driveMinutes)} · ${day.routeSegmentIds.reduce((sum, id) => sum + (route(id)?.distanceKm ?? 0), 0)} km` : "Keys down"}</strong></div><div><small>Stay</small><strong>{hotel(day.hotelId)?.name ?? (day.dayNumber === trip.days.length ? "Departure day" : "Not selected")}</strong></div><div><small>Do</small><strong>{day.experienceIds.map((id) => experience(id)?.name).filter(Boolean).join(" · ") || "Open time"}</strong></div></div></article>; })}</div></section>
    <section className="ota-essentials"><div className="ota-section-head light"><div><small>02 · Your road kit</small><h2>One connected journey</h2></div><p>Confirmed demo vehicle, optional stays, hosted experiences, and permit readiness.</p></div><div className="ota-product-grid"><article className="vehicle-experience"><div><small>Confirmed demo vehicle</small><h3>{vehicle.name}</h3><p>{vehicle.category} · {vehicle.transmission} · {vehicle.luggage} bags</p><ul>{vehicle.highlights.map((item) => <li key={item}>✓ {item}</li>)}</ul></div>{vehicleMedia && <div className="vehicle-photo"><img src={vehicleMedia.imageUrl} alt={vehicleMedia.alt} /><a href={vehicleMedia.sourceUrl} target="_blank" rel="noreferrer">{vehicleMedia.author} · {vehicleMedia.licenseNote}</a></div>}<strong>{money(trip.price.vehicle)}<small> confirmed demo total</small></strong></article><article className="stay-experience"><div><small>Your stays</small><h3>{hotelDays.length ? `${hotelDays.length} selected nights` : "Hotels skipped"}</h3>{hotelDays.slice(0, 4).map((day) => <p key={day.id}><span>{day.dayNumber}</span><strong>{hotel(day.hotelId)?.name}<small>{destination(day.destinationId)?.name}</small></strong></p>)}{!hotelDays.length && <p>No stays were added; the route and vehicle remain ready.</p>}</div></article><article className="permit-onboarding"><div className="permit-top"><span>✓</span><p><small>Driving readiness</small><strong>Guidance included</strong></p></div><h3>Temporary permit, made understandable.</h3><p>We organize what to prepare before pickup. The authority decision remains outside Travorien.</p><div>{permit.requiredDocuments.slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div><small>{permit.disclaimer}</small></article></div></section>
    <section className="ota-price"><div><small>03 · Demo estimate</small><h2>Everything in one clear view.</h2><p>{mockDataNotice}</p><span className="mock-price-badge">Mock pricing · not live availability</span></div><div className="ota-price-card"><dl><div><dt>{vehicle.name} · confirmed demo reservation</dt><dd>{money(trip.price.vehicle)}</dd></div><div><dt>{hotelDays.length} selected nights</dt><dd>{money(trip.price.hotels)}</dd></div><div><dt>Hosted experiences</dt><dd>{money(trip.price.experiences)}</dd></div><div><dt>Permit guidance</dt><dd>{money(trip.price.permitAssistance)}</dd></div><div><dt>Travorien support</dt><dd>{money(trip.price.roadSupport)}</dd></div></dl><div><p><small>Estimated total</small><strong>{money(trip.price.total)}</strong><span>for {trip.traveler.adults} traveler{trip.traveler.adults === 1 ? "" : "s"}</span></p><button onClick={() => setCopilotOpen(true)}>Refine with Copilot →</button></div></div></section>
    <footer className="ota-footer"><Brand inverse /><p>Drive China Your Way · consumer demo</p><button onClick={onRestart}>Plan another road trip</button></footer>
    <button className="persistent-copilot" onClick={() => setCopilotOpen(true)}><span>✦</span><p><small>Travel Advisor</small>Change this journey</p></button>
    {copilotOpen && <TripCopilot trip={trip} onClose={() => setCopilotOpen(false)} onApply={(next) => { setTrip(next); setCopilotOpen(false); }} />}
    {operationsOpen && <RealityOperations trip={trip} runtime={runtime} selectedEventId={selectedEventId} onSelectEvent={setSelectedEventId} onSignals={ingestSignals} onDecision={applyDecision} onOutcome={recordOutcome} onClose={() => setOperationsOpen(false)} />}
  </main>;
}

export function MyDriveExperience({ initialTrip }: { initialTrip: Trip }) {
  return <TripView initialTrip={initialTrip} onRestart={() => window.location.assign("/")} />;
}

export default function RoadTripApp() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [planningEntry, setPlanningEntry] = useState<string | PrototypePlanningHandoff | null>(null);
  if (trip) return <TripView initialTrip={trip} onRestart={() => { setTrip(null); setPlanningEntry(null); }} />;
  if (planningEntry !== null) {
    if (typeof planningEntry === "string") return <AdvisorExperience initialPrompt={planningEntry} onReady={setTrip} />;
    return <AdvisorExperience initialPrompt={prototypeHandoffPrompt(planningEntry)} readinessEntry={Boolean(planningEntry.readiness)} readinessAssessment={planningEntry.readiness} prototypeHandoff={planningEntry} onReady={setTrip} />;
  }
  return <ConsumerHome onPlan={setPlanningEntry} />;
}
