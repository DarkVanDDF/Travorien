"use client";
/* eslint-disable @next/next/no-img-element -- curated public-source road-trip imagery is rendered with visible provenance. */

import { useState } from "react";
import Link from "next/link";
import { signatureDrives } from "./data/product-content.ts";
import PrototypeFirstScreen from "./PrototypeFirstScreen.tsx";
import type { PrototypePlanningHandoff } from "./prototype-domain.ts";

function Brand() { return <span className="v2-brand"><span>T</span>Travorien</span>; }

export default function ConsumerHome({ onPlan }: { onPlan: (entry: string | PrototypePlanningHandoff) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="v2-home">
    <nav className={`v2-nav ${menuOpen ? "mobile-open" : ""}`}><Link href="/" aria-label="Travorien home"><Brand /></Link><div><a href="#explore" onClick={() => setMenuOpen(false)}>Explore</a><Link href="/road-trips">Road Trips</Link><Link href="/driving-in-china">Driving in China</Link><Link href="/guides">Guides</Link><button onClick={() => onPlan("")}>Plan with AI ✦</button></div><button onClick={() => onPlan("")}>Plan with AI <span>✦</span></button><button className="v2-menu" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}>{menuOpen ? "×" : "☰"}</button></nav>
    <div id="explore"><PrototypeFirstScreen onPlan={onPlan} /></div>
    <section className="v2-drives" id="drives"><header><div><p>Great Drives of China</p><h2>Five roads. Five different Chinas.</h2></div><span>Curated journeys first. Booking comes when you are ready.</span></header>
      <div className="v2-drive-grid">{signatureDrives.map((drive, index) => <article key={drive.id} className={index === 0 ? "featured" : ""}><img src={drive.heroMedia.imageUrl} alt={drive.heroMedia.alt} /><div className="v2-card-shade" /><span className="v2-drive-number">0{index + 1}</span><div><small>{drive.region} · {drive.recommendedDays} days · {drive.drivingDifficulty.replaceAll("-", " ")}</small><h3>{drive.name}</h3><p>{drive.tagline}</p><footer>{drive.themes.slice(0, 3).map((theme) => <span key={theme}>{theme}</span>)}</footer><Link className="v2-card-link" href={`/road-trips/${drive.slug}`}>Explore this drive <b>→</b></Link></div><a href={drive.heroMedia.sourceUrl} target="_blank" rel="noreferrer">{drive.heroMedia.author} · {drive.heroMedia.licenseNote}</a></article>)}</div>
    </section>
    <section className="v2-editorial" id="guides"><div><p className="v2-overline">The freedom between the pins</p><h2>See the China<br />tour buses don’t.</h2><p>Shaxi at market time. A Bai village kitchen. The empty hour after a mountain pass. Travorien starts with the road-trip story, then shapes the logistics around the way you want to travel.</p><Link href="/guides/yunnan-beyond-the-old-towns">Read the Yunnan field guide →</Link></div><figure><img src={signatureDrives[0].gallery[0].imageUrl} alt={signatureDrives[0].gallery[0].alt} /><figcaption>{signatureDrives[0].gallery[0].author} · {signatureDrives[0].gallery[0].licenseNote}</figcaption></figure></section>
    <section className="v2-readiness" id="driving"><div><p className="v2-overline">Driving readiness</p><h2>Know what is verified<br />before you take the keys.</h2><p>Foreign licences, provisional permits and local procedures are easy places for travel advice to overpromise. Our deterministic checker shows its sources, names what is unknown, and never calls guidance an approval.</p><Link href="/driving-in-china">Check whether you are ready →</Link></div><div className="v2-readiness-card"><span>01</span><strong>Licence &amp; arrival</strong><p>Tell us where your licence was issued and where you arrive.</p><span>02</span><strong>Source-bound result</strong><p>See verified facts, required actions and honest unknowns.</p><span>03</span><strong>Choose the right first drive</strong><p>Continue into the same advisor and planning journey.</p></div></section>
    <section className="v2-how"><header><p className="v2-overline">How Travorien works</p><h2>Discover → Plan &amp; Book → Drive</h2></header><div><article><span>01</span><h3>Discover a road worth taking</h3><p>Compare curated Signature Drives by scenery, rhythm, road profile and traveler fit.</p></article><article><span>02</span><h3>Shape one connected journey</h3><p>Your advisor narrows the route, then deterministic code validates the itinerary and ranks road-fit options.</p></article><article><span>03</span><h3>Keep the trip useful on the road</h3><p>My Drive turns the same structured Trip into day plans, arrival notes and user-confirmed road updates.</p></article></div></section>
    <section className="v2-closing"><p>Mountains, villages, coastlines—or somewhere we have not named yet.</p><h2>Where should the road take you?</h2><button onClick={() => onPlan("Help me choose my first road trip in China")}>Plan with Travorien AI <span>✦</span></button></section>
    <footer className="v2-preview-footer"><Brand /><span>Discover → Plan &amp; Book → Drive</span><small>All route metrics and availability are clearly labeled demo-content or demo-mock.</small></footer>
  </main>;
}
