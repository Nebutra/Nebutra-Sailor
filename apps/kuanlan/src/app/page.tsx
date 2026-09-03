import Link from "next/link";
import { OrbitField } from "@/components/OrbitField";
import { SiteNav } from "@/components/SiteNav";
import { BRAND } from "@/lib/brand";

export default function HomePage() {
  return (
    <div className="shell">
      <SiteNav active="/" />
      <main className="home">
        <OrbitField />
        <section className="hero-core">
          <p className="hero-kicker">{BRAND.name}</p>
          <h1 className="hero-title">{BRAND.slogan}</h1>
          <div className="hero-actions">
            <Link className="pill pill-ink" href="/create/id-photo">
              开拍
            </Link>
            <Link className="pill pill-ghost" href="/create">
              看看灵感
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
