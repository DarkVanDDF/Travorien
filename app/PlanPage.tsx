"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Trip } from "./domain.ts";
import type { DrivingReadinessAssessment } from "./product-domain.ts";
import AdvisorExperience from "./AdvisorExperience.tsx";
import { MyDriveExperience } from "./RoadTripApp.tsx";
import { parseReadinessSession, readinessSessionKey } from "./readiness-session.ts";
import ProductNav from "./ProductNav.tsx";

export default function PlanPage({ initialPrompt, initialDriveSlug, variantId, readinessEntry }: { initialPrompt: string; initialDriveSlug: string; variantId: string; readinessEntry: boolean }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [readinessAssessment, setReadinessAssessment] = useState<DrivingReadinessAssessment | null>(null);
  const [readinessLoaded, setReadinessLoaded] = useState(!readinessEntry);
  useEffect(() => {
    if (!readinessEntry) return;
    const timeoutId = window.setTimeout(() => {
      const assessment = parseReadinessSession(window.sessionStorage.getItem(readinessSessionKey));
      window.sessionStorage.removeItem(readinessSessionKey);
      setReadinessAssessment(assessment);
      setReadinessLoaded(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [readinessEntry]);
  if (trip) return <MyDriveExperience initialTrip={trip} />;
  if (!readinessLoaded) return <main className="advisor-page"><section className="advisor-empty"><span>✦</span><h2>Carrying your readiness result…</h2></section></main>;
  if (readinessEntry && !readinessAssessment) return <main className="advisor-page"><ProductNav /><section className="advisor-empty"><span>?</span><h2>Your readiness result is unavailable.</h2><p>Return to the checker so Travorien can carry a current, source-bound result. No self-drive route or demo booking has been created.</p><Link className="readiness-editorial-link" href="/driving-in-china">Return to Driving in China →</Link></section></main>;
  return <AdvisorExperience initialPrompt={initialPrompt} initialDriveSlug={initialDriveSlug} variantId={variantId} readinessEntry={readinessEntry} readinessAssessment={readinessAssessment} onReady={setTrip} />;
}
