import Link from "next/link";

export function ProductBrand() { return <span className="v2-brand"><span>T</span>Travorien</span>; }

export default function ProductNav({ inverse = false }: { inverse?: boolean }) {
  return <nav className={`product-nav ${inverse ? "inverse" : ""}`}>
    <Link href="/" aria-label="Travorien home"><ProductBrand /></Link>
    <div><Link href="/road-trips">Road Trips</Link><Link href="/driving-in-china">Driving in China</Link><Link href="/guides">Guides</Link><Link href="/plan" className="product-nav-cta">Plan with AI ✦</Link></div>
  </nav>;
}
