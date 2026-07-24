import Link from "next/link";
export const metadata = { title: "About" };
export default function AboutPage() {
  return (
    <article className="mx-auto max-w-[720px] px-4 py-10 md:px-8">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">About Type Lens</h1>
      <div className="mt-8 space-y-4 text-[1.05rem] leading-relaxed text-neutral-800">
        <p>
          <strong>Type Lens</strong> is an AI-native library of real-world typography: verified
          pairings, hierarchies, and systems — for human designers and design agents.
        </p>
        <p>
          Layout and collection UX follow Fonts In Use. We add machine-readable specimens and agent
          extract packs, prioritizing free commercial-use fonts.
        </p>
        <p>
          <Link href="/docs/agents" className="underline">
            For Agents
          </Link>{" "}
          ·{" "}
          <Link href="/works" className="underline">
            Works
          </Link>{" "}
          ·{" "}
          <Link href="/pairings" className="underline">
            Pairings
          </Link>
        </p>
      </div>
    </article>
  );
}
