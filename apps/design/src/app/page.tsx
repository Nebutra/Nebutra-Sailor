import Link from "next/link";

const ENTRIES = [
  {
    href: "/tokens",
    title: "Tokens",
    body: "Every token, generated from the DTCG source at build time, with computed OKLCH and measured contrast.",
  },
  {
    href: "/components",
    title: "Components",
    body: "The real @nebutra/ui exports rendered against live tokens, every derived variant and state.",
  },
];

export default function HomePage() {
  return (
    <div>
      <header className="mb-12 max-w-3xl">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
          Nebutra Design
        </h1>
        <p className="mt-5 text-[15px] text-muted-foreground leading-relaxed">
          A verification surface, not a documentation site. It imports the real packages and renders
          them, so a change to a token or a component becomes visible here on the next build.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <Link
            className="rounded-panel bg-card p-5 shadow-ambient-sm transition-shadow hover:shadow-ambient-md"
            href={entry.href}
            key={entry.href}
          >
            <p className="font-medium text-[15px] text-foreground">{entry.title}</p>
            <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{entry.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
