import { AnimateIn } from "@nebutra/ui/components";
import { DiscoverDeck } from "@/components/cofounder-match/discover-deck";

export default function CofounderDiscoverPage() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[320px] w-full max-w-2xl opacity-[0.10] blur-3xl"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative mx-auto w-full max-w-xl px-5 py-14 sm:px-8">
        <AnimateIn preset="emerge">
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
              Discover cofounders
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-10">
              One company at a time. Pass, signal interest, or pitch — a mutual signal opens a
              Cofounder Room.
            </p>
          </div>
        </AnimateIn>

        <DiscoverDeck />
      </div>
    </section>
  );
}
