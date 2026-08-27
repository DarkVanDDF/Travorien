import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DriveProductPage from "../../DriveProductPage.tsx";
import { signatureDriveFor, signatureDrives } from "../../data/product-content.ts";

export function generateStaticParams() { return signatureDrives.map((drive) => ({ slug: drive.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const drive = signatureDriveFor(slug); return drive ? { title: drive.seoTitle, description: drive.seoDescription, openGraph: { title: drive.seoTitle, description: drive.seoDescription, images: [drive.heroMedia.imageUrl] } } : {}; }
export default async function DrivePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const drive = signatureDriveFor(slug); if (!drive) notFound(); return <DriveProductPage drive={drive} />; }
