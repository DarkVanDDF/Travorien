"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { assessDrivingReadiness } from "./driving-readiness.ts";
import { CHINA_BOUNDARY_PATH, CHINA_MAP_VIEWBOX } from "./data/china-boundary-path.ts";
import { primaryMapLabelIds, projectedChinaCity } from "./data/china-map-geography.ts";
import { knowledgeSources } from "./data/knowledge-catalog.ts";
import { prototypeDestinationFor, prototypeDestinations } from "./data/prototype-map-data.ts";
import { prototypeMapPreviewFor } from "./data/prototype-map-media.ts";
import { applyIntentPatch, applyPrototypeMapAction, calculateRouteInsight, canContinuePrototypeSelfDrive, createJourneyPrototypeState, interpretPrototypePrompt, prototypeContinuationBlocker, recommendSurpriseDestinations, surpriseSelectionAction } from "./prototype-engine.ts";
import { presentReadiness } from "./readiness-presentation.ts";
import type { AdvisorConversationMessage, AdvisorProposal, AdvisorSurface, JourneyPrototypeState, PrototypeMapAction, PrototypePlanningHandoff, PrototypeReadinessContext } from "./prototype-domain.ts";

type LiveStatus = "checking" | "configured" | "thinking" | "live" | "unavailable" | "not-configured";
type SheetState = "collapsed" | "half" | "expanded";
const defaultVisibleIds = ["xian", "chengdu", "dali", "shangri-la", "guilin", "guangzhou", "haikou", "urumqi"];
type MapStyle = CSSProperties & { "--desktop-left"?: string; "--desktop-top"?: string; "--desktop-width"?: string; "--desktop-rotation"?: string };
const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
const behaviorLabel = (behavior: JourneyPrototypeState["planningBehavior"]) => behavior === "detailed-planner" ? "Detailed Planner" : behavior === "wanderer" ? "Wanderer" : "Flexible Explorer";
const newMessage = (role: AdvisorConversationMessage["role"], text: string, source: AdvisorConversationMessage["source"]): AdvisorConversationMessage => ({ id: crypto.randomUUID(), role, text, source });

function routeLineStyle(fromId: string, toId: string): MapStyle | null {
  const from = prototypeDestinationFor(fromId);
  const to = prototypeDestinationFor(toId);
  if (!from || !to) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const desktopFrom = projectedChinaCity(fromId) ?? from;
  const desktopTo = projectedChinaCity(toId) ?? to;
  const desktopDx = desktopTo.x - desktopFrom.x;
  const desktopDy = desktopTo.y - desktopFrom.y;
  const desktopAspectCorrection = CHINA_MAP_VIEWBOX.height / CHINA_MAP_VIEWBOX.width;
  const desktopVisualDy = desktopDy * desktopAspectCorrection;
  return {
    left: `${from.x}%`, top: `${from.y}%`, width: `${Math.hypot(dx, dy)}%`, transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`,
    "--desktop-left": `${desktopFrom.x}%`, "--desktop-top": `${desktopFrom.y}%`, "--desktop-width": `${Math.hypot(desktopDx, desktopVisualDy)}%`, "--desktop-rotation": `rotate(${Math.atan2(desktopVisualDy, desktopDx) * 180 / Math.PI}deg)`,
  };
}

function mapPinStyle(id: string, x: number, y: number): MapStyle {
  const desktop = projectedChinaCity(id) ?? { x, y };
  return { left: `${x}%`, top: `${y}%`, "--desktop-left": `${desktop.x}%`, "--desktop-top": `${desktop.y}%` };
}

function ReadinessSurface({ state, onComplete, onClose }: { state: JourneyPrototypeState; onComplete: (assessment: NonNullable<JourneyPrototypeState["readiness"]>, context: PrototypeReadinessContext) => void; onClose: () => void }) {
  const [nationality, setNationality] = useState("Germany");
  const [licenceCountry, setLicenceCountry] = useState("Germany");
  const [hasLicence, setHasLicence] = useState<boolean | null>(true);
  const [arrivalCity, setArrivalCity] = useState("Beijing");
  const [arrivalDate, setArrivalDate] = useState("2026-10-10");
  const [stayDays, setStayDays] = useState(10);
  const [assessment, setAssessment] = useState(state.readiness);
  const check = (event: FormEvent) => {
    event.preventDefault();
    setAssessment(assessDrivingReadiness({ nationality, licenceCountry, hasValidForeignLicence: hasLicence, arrivalCity, stayDays }, "2026-08-26T00:00:00.000Z"));
  };
  if (assessment) {
    const presentation = presentReadiness(assessment);
    const resultSource = knowledgeSources.find((item) => assessment.sourceIds.includes(item.id)) ?? knowledgeSources.find((item) => item.id === "source-state-council-expat-guide-2025")!;
    return <div className="prototype-readiness-result">
    <header><span className={`readiness-tone-${presentation.tone}`}>{presentation.label}</span><div><small>YOUR CHINA DRIVING READINESS</small><strong>{assessment.headline}</strong></div></header>
    <div className="readiness-summary-grid"><p><small>Temporary Driving Permit</small><strong>{presentation.permit}</strong></p><p><small>Licence translation</small><strong>{presentation.translation}</strong></p><p><small>Where to handle it</small><strong>{presentation.location(arrivalCity)}</strong></p><p><small>Before car pickup</small><strong>{presentation.pickup(assessment.requiredDocuments.length)}</strong></p></div>
    <p>{assessment.explanation}</p>
    <small className="readiness-date-note">Arrival {arrivalDate} · {stayDays} days. Date is saved for journey timing; this policy match does not infer eligibility from the date.</small>
    {(assessment.requiredDocuments.length > 0 || assessment.nextSteps.length > 0) && <div className="readiness-checklist"><section><small>WHAT TO PREPARE</small>{assessment.requiredDocuments.map((document) => <span key={document.id}>✓ {document.value}</span>)}</section><section><small>WHAT TO DO NEXT</small>{assessment.nextSteps.map((step) => <span key={step}>→ {step}</span>)}</section></div>}
    <aside><b>{presentation.label}</b><span>{assessment.authorityNote}</span><a href={resultSource.url} target="_blank" rel="noreferrer">{resultSource.publisher} · checked {resultSource.lastVerifiedAt} ↗</a></aside>
    <div className="prototype-surface-actions"><button className={`readiness-tone-${presentation.tone}`} onClick={() => onComplete(assessment, { nationality, licenceCountry, hasValidForeignLicence: hasLicence, arrivalCity, arrivalDate, stayDays })}>{presentation.cta}</button><button onClick={() => setAssessment(null)}>Change answers</button></div>
  </div>;
  }
  return <form className="prototype-readiness-form" onSubmit={check}>
    <header><div><small>GET ME ROAD-READY</small><h2>First, let’s understand your arrival.</h2></div><button type="button" onClick={onClose}>×</button></header><p>This is guidance, not permit approval. Travorien will not let Gemini guess your legal eligibility.</p>
    <label>Nationality<input value={nationality} onChange={(event) => setNationality(event.target.value)} /></label>
    <label>Foreign driving licence<select value={hasLicence === null ? "unknown" : hasLicence ? "yes" : "no"} onChange={(event) => setHasLicence(event.target.value === "unknown" ? null : event.target.value === "yes")}><option value="yes">I have a valid licence</option><option value="no">I do not have one</option><option value="unknown">I need to check</option></select></label>
    <label>Licence issued in<input value={licenceCountry} onChange={(event) => setLicenceCountry(event.target.value)} /></label>
    <label>Arrival city<input value={arrivalCity} onChange={(event) => setArrivalCity(event.target.value)} /></label>
    <label>Arrival date<input type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} /></label>
    <label>Time in China<input type="number" min="1" max="90" value={stayDays} onChange={(event) => setStayDays(Number(event.target.value))} /></label>
    <small className="readiness-input-note">Arrival date is kept for trip timing. Current readiness uses the latest source snapshot, not a future legal prediction.</small>
    <button className="prototype-primary" disabled={!nationality.trim() || !arrivalCity.trim() || !arrivalDate || stayDays < 1}>Show my readiness</button>
  </form>;
}

function RouteInsightCard({ state }: { state: JourneyPrototypeState }) {
  const insight = calculateRouteInsight(state.destinationIds, state.maxDailyDrivingMinutes);
  if (!insight) return <div className="prototype-insight-empty"><span>ROUTE INSIGHT</span><p>Add one more place to see feasibility, difficulty and scenery value.</p></div>;
  const scoreBar = (score: number) => <i className="prototype-score-bar" aria-label={`${score} of 5`}>{Array.from({ length: 5 }, (_, index) => <b key={index} className={index < score ? "is-filled" : ""} />)}</i>;
  return <aside className="prototype-insight-card"><header><div><small>✦ ROUTE INSIGHTS · DEMO-MOCK</small><strong>{insight.metricsStatus === "unknown" ? "Distance / time not verified" : `${insight.distanceKm} km · ${formatMinutes(insight.drivingMinutes)}`}</strong></div></header><div><p><small>Feasibility</small><strong>{insight.feasibility.level}</strong><span>{insight.feasibility.reason}</span></p><p><small>Drive difficulty</small><strong>{insight.difficulty.level} · {insight.difficulty.score} of 5</strong>{scoreBar(insight.difficulty.score)}<span>{insight.difficulty.reason}</span></p><p><small>Wow factor</small><strong>{insight.wow.level} · {insight.wow.score} of 5</strong>{scoreBar(insight.wow.score)}<span>{insight.wow.reason}</span></p></div></aside>;
}

export default function PrototypeFirstScreen({ onPlan }: { onPlan: (entry: string | PrototypePlanningHandoff) => void }) {
  const [journey, setJourney] = useState(createJourneyPrototypeState);
  const [surface, setSurface] = useState<AdvisorSurface>("conversation");
  const [messages, setMessages] = useState<AdvisorConversationMessage[]>([{ id: "welcome", role: "assistant", source: "system", text: "Hi, I’m Travorien. I’ll help you drive China with confidence. We can get you road-ready, build a route together on the map, or simply find somewhere worth driving next." }]);
  const [input, setInput] = useState("");
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("checking");
  const [demoMode, setDemoMode] = useState(false);
  const [pendingDemo, setPendingDemo] = useState<{ prompt: string; proposal: AdvisorProposal } | null>(null);
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [candidateJourneys, setCandidateJourneys] = useState<AdvisorProposal["candidateJourneys"]>([]);
  const [sheetState, setSheetState] = useState<SheetState>("half");
  const insight = useMemo(() => calculateRouteInsight(journey.destinationIds, journey.maxDailyDrivingMinutes), [journey.destinationIds, journey.maxDailyDrivingMinutes]);
  const surpriseRecommendations = useMemo(() => recommendSurpriseDestinations(journey), [journey]);
  const selected = prototypeDestinationFor(journey.selectedDestinationId ?? journey.destinationIds.at(-1) ?? "");
  const visibleDestinations = prototypeDestinations;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/advisor/status", { signal: controller.signal }).then(async (response) => await response.json() as { configured?: boolean }).then((payload) => setLiveStatus(payload.configured ? "configured" : "not-configured")).catch(() => { if (!controller.signal.aborted) setLiveStatus("unavailable"); });
    return () => controller.abort();
  }, []);

  const append = (next: AdvisorConversationMessage) => setMessages((current) => [...current, next].slice(-16));
  const performMapAction = (action: PrototypeMapAction, notice?: string) => { setJourney((current) => applyPrototypeMapAction(current, action)); if (notice) append(newMessage("system", notice, "map-activity")); };
  const applyProposal = (proposal: AdvisorProposal, source: "live-ai" | "demo-guidance") => {
    setJourney((current) => { let next = applyIntentPatch(current, proposal.intentPatch); for (const action of proposal.mapActions) next = applyPrototypeMapAction(next, action); return next; });
    setSurface(proposal.uiSurface); setSuggestedIds(proposal.suggestedDestinationIds); setCandidateJourneys(proposal.candidateJourneys); append(newMessage("assistant", proposal.humanResponse, source)); setSheetState("expanded");
  };
  const applyDemoGuidance = (prompt: string, proposal = interpretPrototypePrompt(prompt, journey)) => { setPendingDemo(null); setDemoMode(true); applyProposal(proposal, "demo-guidance"); };
  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || liveStatus === "thinking") return;
    const travelerMessage = newMessage("user", prompt, "traveler");
    setMessages((current) => [...current, travelerMessage].slice(-16)); setInput(""); setPendingDemo(null); setSheetState("expanded");
    if (demoMode) { applyProposal(interpretPrototypePrompt(prompt, journey), "demo-guidance"); return; }
    setLiveStatus("thinking");
    try {
      const response = await fetch("/api/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt, conversation: [...messages, travelerMessage], journey: { ...journey, undoStack: [] }, routeInsight: insight, tripContext: { status: "not-materialized", note: "Vehicle, hotel and Reality Runtime remain available after journey confirmation." } }) });
      const payload = await response.json() as { result?: AdvisorProposal; error?: { code?: string; message?: string } };
      if (!response.ok || !payload.result) throw Object.assign(new Error(payload.error?.message ?? "Live AI is unavailable."), { code: payload.error?.code });
      setLiveStatus("live"); applyProposal(payload.result, "live-ai");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "AI_UPSTREAM_ERROR";
      setLiveStatus(code === "AI_NOT_CONFIGURED" ? "not-configured" : "unavailable"); append(newMessage("system", `${error instanceof Error ? error.message : "Live AI is unavailable."} No demo answer was substituted.`, "system")); setPendingDemo({ prompt, proposal: interpretPrototypePrompt(prompt, journey) });
    }
  };
  const quickAction = (kind: "readiness" | "map" | "surprise") => {
    if (kind === "readiness") { setSurface("readiness"); setSheetState("expanded"); return; }
    if (kind === "map") { setSurface("conversation"); setSheetState("collapsed"); append(newMessage("system", "Map mode is open. Tap a destination to add it; tap a route point again to select, reorder or remove it.", "map-activity")); return; }
    applyDemoGuidance("I hate planning. Surprise me.");
  };
  const chooseRecommendation = (destinationId: string) => {
    const destination = prototypeDestinationFor(destinationId)!;
    performMapAction(surpriseSelectionAction(journey, destinationId), `${journey.destinationIds.length ? destination.name : `Xi’an → ${destination.name}`} joined the shared journey from a Surprise Me recommendation.`); append(newMessage("assistant", `${destination.name} fits because ${destination.story.toLowerCase()} The route insight now uses the same shared map state.`, "demo-guidance")); setSurface("route-insight"); setSuggestedIds([]);
  };
  const statusLabel = demoMode ? "DEMO GUIDANCE · AI OFFLINE" : liveStatus === "live" ? "LIVE GEMINI" : liveStatus === "thinking" ? "GEMINI THINKING…" : liveStatus === "configured" ? "LIVE AI CONFIGURED · NOT TESTED" : liveStatus === "not-configured" ? "LIVE AI NOT CONFIGURED" : liveStatus === "unavailable" ? "AI CONNECTION UNAVAILABLE" : "CHECKING AI SETUP";

  return <section className="prototype-first-screen">
    <div className="prototype-hero-copy"><p><span />China, beyond the tour-bus window</p><h1>Drive China<br />{" "}<em>Your Way.</em></h1><p>Discover China by road—with help getting road-ready, deciding where to go, and staying on track along the way.</p></div>
    <div className="prototype-workspace">
      <section className={`prototype-advisor sheet-${sheetState} ${messages.length === 1 ? "is-welcome" : ""}`} aria-labelledby="prototype-advisor-title">
        <button className="prototype-sheet-handle" aria-label="Change advisor sheet height" onClick={() => setSheetState((current) => current === "collapsed" ? "half" : current === "half" ? "expanded" : "collapsed")}><span /></button>
        <header><span>✦</span><p><small>TRAVORIEN AI</small><strong id="prototype-advisor-title">Your China road-trip advisor</strong></p><em className={`ai-status status-${demoMode ? "unavailable" : liveStatus}`}>{statusLabel}</em></header>
        {surface === "readiness" ? <ReadinessSurface state={journey} onClose={() => setSurface("conversation")} onComplete={(assessment, readinessContext) => { setJourney((current) => ({ ...current, readiness: assessment, readinessContext })); setSurface("conversation"); append(newMessage("assistant", "I’ve kept this exact readiness status with the journey. Unknown, missing, or blocked results will stop the self-drive handoff until resolved.", "demo-guidance")); }} /> : <>
          <div className="prototype-conversation" aria-live="polite">{messages.slice(-5).map((item) => <article key={item.id} className={`message-${item.role}`}><span>{item.source === "live-ai" ? "LIVE GEMINI" : item.source === "demo-guidance" ? "DEMO GUIDANCE" : item.source === "map-activity" ? "MAP" : item.role === "user" ? "YOU" : "TRAVORIEN"}</span><p>{item.id === "welcome" ? <><span className="prototype-welcome-desktop">Hi, I’m Travorien.<br />Where should we drive?</span><span className="prototype-welcome-mobile">{item.text}</span></> : item.text}</p></article>)}</div>
          {messages.length === 1 && <div className="prototype-actions"><button onClick={() => quickAction("readiness")}><span>01</span><p><strong><span className="prototype-action-desktop">Get road-ready</span><span className="prototype-action-mobile">Get me road-ready</span></strong><small>Permit · Licence translation · Pickup readiness</small></p><b>→</b></button><button onClick={() => quickAction("map")}><span>02</span><p><strong>Plan on the map</strong><small>Build your own China drive</small></p><b>→</b></button><button onClick={() => quickAction("surprise")}><span>03</span><p><strong>Surprise me</strong><small>Show me somewhere worth the drive</small></p><b>↗</b></button></div>}
          {surface === "surprise" && <div className="prototype-surprises"><header><small>SURPRISE ME · DEMO-MOCK</small><strong>Three roads with different personalities</strong></header>{surpriseRecommendations.map((recommendation) => { const destination = prototypeDestinationFor(recommendation.destinationId)!; return <button key={destination.id} onClick={() => chooseRecommendation(destination.id)}><span>{formatMinutes(recommendation.driveMinutes)}</span><strong>{destination.name}</strong><small>{destination.tags}</small><p>{recommendation.reason}</p></button>; })}</div>}
          {candidateJourneys.length > 0 && surface !== "surprise" && <div className="prototype-candidates">{candidateJourneys.map((candidate) => <button key={candidate.id} onClick={() => { performMapAction({ type: "set-route", destinationIds: candidate.destinationIds }, `${candidate.title} is now on the shared map.`); setCandidateJourneys([]); }}><small>CANDIDATE JOURNEY</small><strong>{candidate.title}</strong><span>{candidate.rationale}</span></button>)}</div>}
          {suggestedIds.length > 0 && surface !== "surprise" && <div className="prototype-suggestion-strip">{suggestedIds.slice(0, 4).map((id) => { const destination = prototypeDestinationFor(id)!; return <button key={id} onClick={() => chooseRecommendation(id)}><strong>{destination.name}</strong><small>{destination.tags}</small></button>; })}</div>}
          {pendingDemo && <div className="prototype-fallback"><strong>AI connection unavailable</strong><p>Live Gemini did not answer. Your journey is unchanged.</p><button onClick={() => applyDemoGuidance(pendingDemo.prompt, pendingDemo.proposal)}>Use clearly labeled demo guidance</button></div>}
          <form className="prototype-chat-form prototype-chat-form-desktop" onSubmit={(event) => void send(event)}><input value={input} onFocus={() => setSheetState("expanded")} onChange={(event) => setInput(event.target.value)} placeholder="Ask me anything about driving China…" aria-label="Ask Travorien anything" /><button disabled={!input.trim() || liveStatus === "thinking"}>{liveStatus === "thinking" ? "…" : "↑"}</button></form>
          <form className="prototype-chat-form prototype-chat-form-mobile" onSubmit={(event) => void send(event)}><input value={input} onFocus={() => setSheetState("expanded")} onChange={(event) => setInput(event.target.value)} placeholder="Ask about history, mountains, permits, or this route…" aria-label="Ask Travorien anything" /><button disabled={!input.trim() || liveStatus === "thinking"}>{liveStatus === "thinking" ? "…" : "↑"}</button></form>
        </>}
      </section>
      <section className="prototype-map" aria-label="Interactive China journey map">
        <header><div><small>EXPLORE CHINA</small><strong>{journey.destinationIds.length ? journey.destinationIds.map((id) => prototypeDestinationFor(id)?.name).join(" → ") : "Start anywhere"}</strong></div><span>{behaviorLabel(journey.planningBehavior)} · {journey.maxDailyDrivingMinutes ? `${formatMinutes(journey.maxDailyDrivingMinutes)} max/day` : "Open rhythm"}</span></header>
        <div className="prototype-map-canvas"><div className="prototype-map-orbit" /><div className="prototype-land" />
          <div className="prototype-map-geography">
            <svg className="prototype-china-geometry" viewBox={`0 0 ${CHINA_MAP_VIEWBOX.width} ${CHINA_MAP_VIEWBOX.height}`} role="img" aria-label="Geographic outline of China derived from Natural Earth data">
              <defs>
                <linearGradient id="china-land-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#315653" /><stop offset="0.55" stopColor="#1d403f" /><stop offset="1" stopColor="#102f31" /></linearGradient>
                <filter id="china-terrain-texture" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="17" result="noise" /><feDiffuseLighting in="noise" surfaceScale="5" diffuseConstant="0.75" lightingColor="#9fb6ac" result="relief"><feDistantLight azimuth="225" elevation="42" /></feDiffuseLighting><feComposite in="relief" in2="SourceGraphic" operator="in" /></filter>
                <pattern id="china-road-lights" width="74" height="58" patternUnits="userSpaceOnUse"><path d="M-8 45 C16 34 29 50 51 32 S77 16 91 24" fill="none" stroke="#d8ad57" strokeWidth="0.45" opacity="0.2" /><circle cx="18" cy="38" r="0.9" fill="#e2bd68" opacity="0.5" /><circle cx="52" cy="31" r="0.65" fill="#e2bd68" opacity="0.42" /></pattern>
                <clipPath id="china-map-clip"><path d={CHINA_BOUNDARY_PATH} /></clipPath>
              </defs>
              <path className="prototype-china-shadow" d={CHINA_BOUNDARY_PATH} />
              <path className="prototype-china-land" d={CHINA_BOUNDARY_PATH} fill="url(#china-land-gradient)" />
              <rect className="prototype-china-terrain" width={CHINA_MAP_VIEWBOX.width} height={CHINA_MAP_VIEWBOX.height} clipPath="url(#china-map-clip)" filter="url(#china-terrain-texture)" />
              <rect className="prototype-china-lights" width={CHINA_MAP_VIEWBOX.width} height={CHINA_MAP_VIEWBOX.height} clipPath="url(#china-map-clip)" fill="url(#china-road-lights)" />
              <path className="prototype-china-outline" d={CHINA_BOUNDARY_PATH} />
            </svg>
            {journey.destinationIds.slice(1).map((toId, index) => { const style = routeLineStyle(journey.destinationIds[index], toId); return style ? <div key={`${journey.destinationIds[index]}-${toId}`} className="prototype-route-line" style={style} /> : null; })}
            {visibleDestinations.map((place) => { const index = journey.destinationIds.indexOf(place.id); const recommended = suggestedIds.includes(place.id); const preview = prototypeMapPreviewFor(place.id); const active = journey.selectedDestinationId === place.id; return <button key={place.id} data-destination={place.id} data-default-visible={defaultVisibleIds.includes(place.id) ? "true" : "false"} data-primary-label={primaryMapLabelIds.has(place.id) ? "true" : "false"} data-has-preview={preview ? "true" : "false"} className={`prototype-pin ${index >= 0 ? "selected" : ""} ${active ? "active" : ""} ${recommended ? "recommended" : ""}`} style={mapPinStyle(place.id, place.x, place.y)} onClick={() => index >= 0 ? performMapAction({ type: "select", destinationId: place.id }) : performMapAction({ type: "add", destinationId: place.id })} onContextMenu={(event) => { event.preventDefault(); if (index >= 0) performMapAction({ type: "remove", destinationId: place.id }); }} aria-label={index >= 0 ? `Select ${place.name}, route point ${index + 1}` : `Add ${place.name} to journey`}><i>{index >= 0 ? index + 1 : recommended ? "✦" : "+"}</i><span className="prototype-destination-preview"><span><strong>{place.name}</strong><small>{place.tags}</small>{preview && <em>View guide <b>→</b></em>}</span>{preview && <span className="prototype-destination-image" role="img" aria-label={preview.alt} title={`${preview.author} · ${preview.licenseNote}`} style={{ backgroundImage: `url("${preview.imageUrl}")` }} />}</span></button>; })}
          </div>
          <div className="prototype-map-caption"><span>DEMO-MOCK</span><p><strong>{selected?.name ?? "Your open road"}</strong><small>{selected?.tags ?? "Choose a pin, follow a curiosity."}</small></p></div>
          {selected && journey.destinationIds.includes(selected.id) && <aside className="prototype-point-panel"><header><div><small>{journey.destinationIds.indexOf(selected.id) === 0 ? "START" : journey.destinationIds.indexOf(selected.id) === journey.destinationIds.length - 1 ? "END" : "STOP"}</small><strong>{selected.name}</strong></div><button onClick={() => performMapAction({ type: "select", destinationId: null })}>×</button></header><p>{selected.story}</p><div><button disabled={journey.destinationIds.indexOf(selected.id) <= 0} onClick={() => performMapAction({ type: "reorder", fromIndex: journey.destinationIds.indexOf(selected.id), toIndex: journey.destinationIds.indexOf(selected.id) - 1 }, `${selected.name} moved earlier in the route.`)}>Move earlier</button><button disabled={journey.destinationIds.indexOf(selected.id) >= journey.destinationIds.length - 1} onClick={() => performMapAction({ type: "reorder", fromIndex: journey.destinationIds.indexOf(selected.id), toIndex: journey.destinationIds.indexOf(selected.id) + 1 }, `${selected.name} moved later in the route.`)}>Move later</button><button onClick={() => performMapAction({ type: "remove", destinationId: selected.id }, `${selected.name} was removed from the route.`)}>Remove</button></div></aside>}
        </div>
        <footer className={`prototype-map-footer ${journey.destinationIds.length ? "has-route" : "is-empty"}`}><button className="readiness-promise" onClick={() => quickAction("readiness")}><span className="readiness-dot">✓</span><p><strong>{journey.readiness ? "Readiness added" : "International visitor?"}</strong><small>{journey.readiness?.headline ?? "Temporary Driving Permit guidance is part of the journey."}</small></p></button><div className="prototype-map-controls"><button disabled={!journey.undoStack.length} onClick={() => performMapAction({ type: "undo" }, "Last map change undone. Chat and map are synchronized.")}>↶ Undo</button><button disabled={!journey.destinationIds.length} onClick={() => performMapAction({ type: "clear" }, "The shared journey map is clear.")}>Clear</button><button onClick={() => quickAction("surprise")}>✦ Surprise me</button></div></footer>
        <div className="prototype-route-rail">{journey.destinationIds.map((id, index) => <button key={id} onClick={() => performMapAction({ type: "select", destinationId: id })}><span>{index + 1}</span><strong>{prototypeDestinationFor(id)?.name}</strong><small>{index === 0 ? "Start" : index === journey.destinationIds.length - 1 ? "End" : "Stop"}</small></button>)}</div>
        <RouteInsightCard state={journey} />
        {journey.destinationIds.length >= 2 && insight && (canContinuePrototypeSelfDrive(journey, insight) ? <button className="prototype-commerce-cta" onClick={() => onPlan({ kind: "prototype-journey", destinationIds: journey.destinationIds, jobToBeDone: journey.jobToBeDone, interests: journey.interests, planningBehavior: journey.planningBehavior, maxDailyDrivingMinutes: journey.maxDailyDrivingMinutes, season: journey.season, readiness: journey.readiness, readinessContext: journey.readinessContext, routeInsight: insight })}>Continue to this drive <span>Your route and preferences come with you →</span></button> : <button className="prototype-feasibility-cta" onClick={() => { const blocker = prototypeContinuationBlocker(journey, insight); if (blocker === "readiness") quickAction("readiness"); else { setSurface("conversation"); setSheetState("expanded"); append(newMessage("assistant", "This route is still for exploration. I won’t open self-drive planning until its special requirements or unknown feasibility are verified.", "demo-guidance")); } }}>{prototypeContinuationBlocker(journey, insight) === "readiness" ? "Resolve driving readiness first" : "Verify route feasibility first"}<span>Explore safely · no commerce handoff</span></button>)}
      </section>
    </div>
    <div className="prototype-scroll-cue">Confidence · Discovery · Support <span>↓</span></div>
  </section>;
}
