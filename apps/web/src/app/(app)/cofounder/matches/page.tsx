import { MatchesList } from "@/components/cofounder-match/matches-list";

export default function CofounderMatchesPage() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[280px] w-full max-w-2xl opacity-[0.10] blur-3xl"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
        <div className="mb-10 text-center">
          <h1
            className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{
              background: "hsl(var(--primary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Your matches
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-10">
            Founders you and they both signalled interest in. The Cofounder Room — where the
            initiator opens the conversation — is the next step.
          </p>
        </div>

        <MatchesList />
      </div>
    </section>
  );
}
