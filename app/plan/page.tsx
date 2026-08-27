import type { Metadata } from "next";
import PlanPage from "../PlanPage.tsx";
export const metadata: Metadata = { title: "Plan with Travorien AI | China Road Trip Advisor", description: "Compare Signature Drives, shape a road-trip journey and enter deterministic trip planning only when the route is ready." };
export default async function PlanRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const values = await searchParams; const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? ""; return <PlanPage initialPrompt={one(values.prompt)} initialDriveSlug={one(values.drive)} variantId={one(values.variant)} readinessEntry={one(values.entry) === "readiness"} />; }
