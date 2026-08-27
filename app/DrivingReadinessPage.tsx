"use client";
import Link from "next/link";
import { useState } from "react";
import type { DrivingReadinessAssessment, DrivingReadinessInput } from "./product-domain.ts";
import { assessDrivingReadiness } from "./driving-readiness.ts";
import { sourceFor } from "./data/knowledge-catalog.ts";
import ProductNav, { ProductBrand } from "./ProductNav.tsx";
import { readinessSessionKey } from "./readiness-session.ts";

const initial: DrivingReadinessInput = { nationality: "", licenceCountry: "", hasValidForeignLicence: null, arrivalCity: "", stayDays: null };

function Result({ assessment }: { assessment: DrivingReadinessAssessment }) {
  const canContinueToSelfDrive = assessment.status === "LIKELY_ELIGIBLE" || assessment.status === "ACTION_REQUIRED";
  const continueToAdvisor = () => {
    window.sessionStorage.setItem(readinessSessionKey, JSON.stringify(assessment));
    window.location.assign(`/plan?entry=readiness&prompt=${encodeURIComponent("Recommend an easy first road trip after driving readiness")}`);
  };
  return <section className={`readiness-result status-${assessment.status.toLowerCase()}`} aria-live="polite">
    <header><span>{assessment.status === "UNKNOWN" || assessment.status === "NEEDS_INFORMATION" ? "?" : assessment.status === "NOT_ELIGIBLE" ? "×" : "✓"}</span><div><small>{assessment.status.replaceAll("_", " ")}</small><h2>{assessment.headline}</h2></div></header>
    <p>{assessment.explanation}</p>
    {assessment.requiredDocuments.length > 0 && <div className="readiness-docs"><strong>Prepare these documents</strong>{assessment.requiredDocuments.map((document) => <p key={document.id}><span>{document.status}</span>{document.value}</p>)}</div>}
    <div className="readiness-steps"><strong>Next actions</strong><ol>{assessment.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol></div>
    {assessment.unknowns.length > 0 && <div className="readiness-unknown"><strong>Still unknown</strong><p>{assessment.unknowns.join(" · ")}</p></div>}
    <footer><p>{assessment.authorityNote}</p>{assessment.sourceIds.map((id) => { const source = sourceFor(id)!; return <a key={id} href={source.url} target="_blank" rel="noreferrer"><span>{source.status}</span>{source.name} · checked {source.lastVerifiedAt}</a>; })}</footer>
    {canContinueToSelfDrive
      ? <button onClick={continueToAdvisor}>Choose an easy first road trip <span>→</span></button>
      : <Link className="readiness-editorial-link" href="/road-trips">Explore road trips as inspiration →</Link>}
  </section>;
}

export default function DrivingReadinessPage() {
  const [input, setInput] = useState(initial);
  const [assessment, setAssessment] = useState<DrivingReadinessAssessment | null>(null);
  return <main className="readiness-page"><ProductNav />
    <header><p className="v2-overline">Driving in China</p><h1>Can I drive?<br /><em>Start with what is known.</em></h1><p>This checker matches your answers to current official sources. It does not issue a permit, guarantee approval or turn a general rule into a local decision.</p></header>
    <section className="readiness-workspace">
      <form onSubmit={(event) => { event.preventDefault(); setAssessment(assessDrivingReadiness(input)); }}>
        <div><label>Nationality<input value={input.nationality} onChange={(event) => setInput({ ...input, nationality: event.target.value })} placeholder="e.g. Germany" /></label><label>Licence issued by<input value={input.licenceCountry} onChange={(event) => setInput({ ...input, licenceCountry: event.target.value })} placeholder="e.g. Germany" /></label></div>
        <div><label>Is the overseas licence valid?<select value={input.hasValidForeignLicence === null ? "" : String(input.hasValidForeignLicence)} onChange={(event) => setInput({ ...input, hasValidForeignLicence: event.target.value === "" ? null : event.target.value === "true" })}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select></label><label>Arrival city<input value={input.arrivalCity} onChange={(event) => setInput({ ...input, arrivalCity: event.target.value })} placeholder="e.g. Beijing" /></label><label>Length of stay<input type="number" min="1" value={input.stayDays ?? ""} onChange={(event) => setInput({ ...input, stayDays: event.target.value ? Number(event.target.value) : null })} placeholder="e.g. 14" /></label></div>
        <button>Check my readiness →</button><small>Personal answers stay in this page session and are not placed in the URL.</small>
      </form>
      {assessment ? <Result assessment={assessment} /> : <aside><span>Source-bound</span><h2>No green light from a vague answer.</h2><p>Verified results name the issuing city and sources. Missing or unmatched combinations return Needs information or Unknown.</p><ul><li>✓ Official current policy sources</li><li>✓ Deterministic rule matching</li><li>✓ Explicit unknowns</li><li>× No permit issuance or guarantee</li></ul><Link href="/guides/can-foreigners-drive-in-china">Read the full foreign-driver guide →</Link></aside>}
    </section>
    <section className="road-basics"><p className="v2-overline">Stable road basics</p><h2>Right side. Seat belts. Signals. 122.</h2><div><p><strong>Keep right</strong><span>Mainland China traffic keeps to the right.</span></p><p><strong>Buckle up</strong><span>Drivers and passengers use seat belts where fitted.</span></p><p><strong>Obey posted controls</strong><span>Signals and signs take priority over an itinerary.</span></p><p><strong>Traffic police: 122</strong><span>Preserve the accident scene unless urgent safety requires otherwise.</span></p></div><small>Verified from official road-law and MFA safety sources; checked 25 August 2026.</small></section>
    <footer className="product-footer"><ProductBrand /><p>Guidance, not permission.</p><Link href="/guides/can-foreigners-drive-in-china">Read the source guide</Link></footer>
  </main>;
}
