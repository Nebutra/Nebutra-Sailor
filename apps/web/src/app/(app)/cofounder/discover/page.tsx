import { useTranslations } from "next-intl";
import { DiscoverDeck } from "@/components/cofounder-match/discover-deck";

export default function CofounderDiscoverPage() {
  const tc = useTranslations("copy.discoverPage");
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[320px] w-full max-w-2xl opacity-[0.10] blur-3xl"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="relative mx-auto w-full max-w-xl px-5 py-14 sm:px-8">
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
            {tc("discoverCofounders")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-10">
            {tc("oneCompanyAtA")}
          </p>
        </div>

        <DiscoverDeck />
      </div>
    </section>
  );
}
