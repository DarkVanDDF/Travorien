import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideArticlePage from "../../GuideArticlePage.tsx";
import { guideFor, guides } from "../../data/knowledge-catalog.ts";
export function generateStaticParams() { return guides.map((guide) => ({ slug: guide.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const guide = guideFor(slug); return guide ? { title: guide.seoTitle, description: guide.seoDescription } : {}; }
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const guide = guideFor(slug); if (!guide) notFound(); return <GuideArticlePage guide={guide} />; }
