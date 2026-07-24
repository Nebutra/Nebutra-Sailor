import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className={`${TL_CONTAINER} py-12 md:py-20`}>
      <div data-tl-section className="mx-auto max-w-[42rem] will-change-transform">
        <p className="tl-kicker mb-4">Manifesto</p>
        <h1 className="tl-display text-[clamp(2.75rem,6vw,4.25rem)]">About Type Lens</h1>
        <div className="mt-10 space-y-6 text-[1.125rem] leading-[1.7] text-[var(--tl-ink-soft)] md:text-[1.2rem]">
          <p>
            <strong className="font-semibold text-[var(--tl-ink)]">Type Lens</strong> is an
            AI-native library of real-world typography: verified pairings, hierarchies, and systems
            — for human designers and design agents.
          </p>
          <p>
            Fonts In Use sets the bar for a public collection. We keep that browseable shape, then
            add machine-readable specimens and an{" "}
            <strong className="font-semibold text-[var(--tl-ink)]">extract pack</strong> agents can
            inject into generation.
          </p>
          <p>
            Free commercial fonts first. Many excellent free faces look weak only because they sit
            in the wrong role — not because they lack quality.
          </p>
        </div>

        <ul className="mt-12 space-y-4 border-t-2 border-[var(--tl-ink)] pt-10 text-lg">
          <li>
            <Link href="/works" className="font-medium underline-offset-4 hover:underline">
              Browse works →
            </Link>
          </li>
          <li>
            <Link href="/pairings" className="font-medium underline-offset-4 hover:underline">
              Pairings gallery →
            </Link>
          </li>
          <li>
            <Link href="/docs/agents" className="font-medium underline-offset-4 hover:underline">
              For Agents →
            </Link>
          </li>
        </ul>
      </div>
    </article>
  );
}
