"use client";
/* eslint-disable @next/next/no-img-element -- curated public-source road-trip imagery is rendered with visible provenance. */
import { useMemo, useState } from "react";
import type { AdvisorRecommendation, DrivingReadinessAssessment, PlanningSeed } from "./product-domain.ts";
import type { Trip } from "./domain.ts";
import { adviseRoadTrip } from "./advisor-engine.ts";
import { signatureDriveFor, signatureDrives } from "./data/product-content.ts";
import { sourceFor } from "./data/knowledge-catalog.ts";
import PlanningExperience from "./PlanningExperience.tsx";
import ProductNav from "./ProductNav.tsx";
import { canEnterSelfDriveFromReadiness } from "./readiness-session.ts";
import { prototypeDestinationFor } from "./data/prototype-map-data.ts";
import type { PrototypePlanningHandoff } from "./prototype-domain.ts";

const promptChips = ["Scenic, but not touristy", "Yunnan or Sichuan—which is easier?", "Maximum two hours driving per day", "A road trip with kids", "Can foreigners drive in China?", "Route and car, no hotels", "I changed my mind—Hainan"];

function RecommendationCards({ result, onChoose }: { result: AdvisorRecommendation; onChoose: (driveId: string) => void }) {
  return <div className="advisor-cards">{result.recommendedDriveIds.map((id, index) => {
    const drive = signatureDrives.find((item) => item.id === id)!;
    return <article key={id}>
      <img src={drive.heroMedia.imageUrl} alt={drive.heroMedia.alt} />
      <span>{index === 0 ? "Best fit" : "Compare"}</span>
      <div>
        <small>{drive.region} · {drive.recommendedDays} days · {drive.drivingDifficulty.replaceAll("-", " ")}</small>
        <h3>{drive.name}</h3><p>{drive.tagline}</p>
        <dl><div><dt>Longest day</dt><dd>{Math.round(drive.suitability.longestDrivingMinutes / 60 * 10) / 10}h</dd></div><div><dt>Altitude</dt><dd>{drive.suitability.altitudeExposure}</dd></div><div><dt>Services</dt><dd>{drive.suitability.serviceConfidence.replaceAll("-", " ")}</dd></div></dl>
        <em>{drive.transactionStatus === "transaction-ready-demo" ? "Transaction-ready demo" : "Content-ready · no inventory"}</em>
        <button onClick={() => onChoose(id)}>Choose {drive.region} →</button><a href={`/road-trips/${drive.slug}`}>View full drive</a>
      </div>
    </article>;
  })}</div>;
}

export default function AdvisorExperience({ initialPrompt = "", initialDriveSlug = "", variantId = "", readinessEntry = false, readinessAssessment = null, prototypeHandoff = null, onReady }: { initialPrompt?: string; initialDriveSlug?: string; variantId?: string; readinessEntry?: boolean; readinessAssessment?: DrivingReadinessAssessment | null; prototypeHandoff?: PrototypePlanningHandoff | null; onReady: (trip: Trip) => void }) {
  const initialDrive = signatureDriveFor(initialDriveSlug);
  const startingPrompt = initialPrompt || (initialDrive ? `Tell me whether ${initialDrive.name} fits this trip.` : readinessEntry ? "Recommend an easy first road trip after driving readiness" : "");
  const [input, setInput] = useState(startingPrompt);
  const [result, setResult] = useState<AdvisorRecommendation | null>(() => startingPrompt ? adviseRoadTrip(startingPrompt) : null);
  const [conversationPrompts, setConversationPrompts] = useState<string[]>(() => startingPrompt ? [startingPrompt] : []);
  const [selectedDriveId, setSelectedDriveId] = useState(initialDrive?.id ?? "");
  const [planningSeed, setPlanningSeed] = useState<PlanningSeed | PrototypePlanningHandoff | null>(null);
  const selected = useMemo(() => signatureDrives.find((drive) => drive.id === selectedDriveId), [selectedDriveId]);
  if (planningSeed) return <PlanningExperience seed={planningSeed} onReady={onReady} />;

  const ask = (prompt: string) => {
    const next = prompt.trim();
    if (!next) return;
    const nextResult = adviseRoadTrip(next, result);
    setInput(next); setResult(nextResult); setConversationPrompts((current) => [...current, next]);
    setSelectedDriveId((current) => nextResult.recommendedDriveIds.includes(current) ? current : "");
  };
  const readinessAllowsSelfDrive = canEnterSelfDriveFromReadiness(readinessEntry, readinessAssessment);
  const startPlan = () => {
    if (prototypeHandoff) {
      setPlanningSeed(prototypeHandoff);
      return;
    }
    if (selected?.transactionStatus !== "transaction-ready-demo" || !readinessAllowsSelfDrive) return;
    setPlanningSeed(readinessAssessment
      ? { kind: "readiness", assessment: readinessAssessment, selectedDriveId: selected.id, variantId: variantId || undefined, prompt: result?.prompt }
      : { kind: "signature-drive", driveId: selected.id, variantId: variantId || undefined, prompt: result?.prompt });
  };

  return <main className="advisor-page"><ProductNav />
    <section className="advisor-hero"><p className="v2-overline">Travorien Travel Advisor</p><h1>Start with the trip<br /><em>you want to feel.</em></h1><p>Describe the rhythm, scenery and constraints. This first comparison is deterministic and grounded in five structured Signature Drives. In customization, AI may interpret bounded changes but cannot invent authority facts or inventory.</p>
      {readinessAssessment && <aside className="advisor-readiness-memory"><span>{readinessAssessment.status.replaceAll("_", " ")}</span><strong>{readinessAssessment.headline}</strong><p>Carried from Driving in China · guidance, not approval</p></aside>}
      {prototypeHandoff && <aside className="advisor-prototype-memory"><small>SHARED MAP JOURNEY</small><strong>{prototypeHandoff.destinationIds.map((id) => prototypeDestinationFor(id)?.name).join(" → ")}</strong><p>{prototypeHandoff.planningBehavior.replaceAll("-", " ")} · {prototypeHandoff.maxDailyDrivingMinutes ? `${prototypeHandoff.maxDailyDrivingMinutes} min max/day` : "open driving rhythm"} · {prototypeHandoff.interests.join(" · ") || "interests still open"}</p><span>{prototypeHandoff.routeInsight.feasibility.level} · {prototypeHandoff.routeInsight.difficulty.level} · {prototypeHandoff.routeInsight.wow.level} wow</span><button onClick={startPlan}>Build this mapped journey →</button></aside>}
      <form onSubmit={(event) => { event.preventDefault(); ask(input); }}><span>✦</span><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Try: 10 days in October, scenic, no big cities…" aria-label="Ask the Travorien Travel Advisor" /><button>Ask the advisor ↑</button></form>
      <div>{promptChips.map((chip) => <button key={chip} onClick={() => ask(chip)}>{chip}</button>)}</div>
    </section>
    {result ? <section className="advisor-result"><header><span>✦</span><div><small>Knowledge-grounded recommendation · {conversationPrompts.length} turn{conversationPrompts.length === 1 ? "" : "s"}</small><h2>{result.answer}</h2><p>{result.learnedPreferences.length ? `I’m keeping: ${result.learnedPreferences.join(" · ")}.` : "Tell me your month, duration and driving comfort to narrow the match."}</p></div></header>
      <RecommendationCards result={result} onChoose={setSelectedDriveId} />
      {result.knowledgeClaimIdsUsed.length > 0 && <aside><strong>Verified policy claims used</strong><p>Eligibility was not inferred. Continue to the deterministic readiness checker for a city-specific result.</p>{["source-state-council-expat-guide-2025"].map((id) => { const source = sourceFor(id)!; return <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.publisher} · checked {source.lastVerifiedAt} →</a>; })}<a href="/driving-in-china">Open readiness checker →</a></aside>}
      <div className="advisor-next"><p><small>Useful next question</small><strong>{result.nextQuestion}</strong></p>{selected && <section><div><small>Your direction</small><strong>{selected.name}</strong><span>{selected.transactionStatus === "transaction-ready-demo" ? "Route and demo travel choices connected" : "Editorial planning only"}</span></div>{selected.transactionStatus === "transaction-ready-demo" && readinessAllowsSelfDrive ? <button onClick={startPlan}>Build this road trip →</button> : <a href={`/road-trips/${selected.slug}`}>{readinessAssessment && !readinessAllowsSelfDrive ? "Explore as inspiration →" : "Explore without fake booking →"}</a>}</section>}</div>
    </section> : <section className="advisor-empty"><span>01</span><h2>Ask in human terms.</h2><p>“Scenic but not touristy” is a better start than selecting a vehicle category. The advisor will compare roads first.</p></section>}
  </main>;
}
