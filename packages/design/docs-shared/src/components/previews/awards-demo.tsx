import { Awards } from "@nebutra/ui/primitives";

export function AwardsDemo() {
  return (
    <div className="gap-12 p-8 flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-muted/20">
      <div className="md:scale-100 flex scale-90 items-center justify-center">
        <Awards
          title="Top Contributor"
          subtitle="Community Award"
          date="2026 Season"
          recipient="Nebutra Engineer"
          level="platinum"
          variant="award"
        />
      </div>

      <div className="md:grid-cols-2 gap-8 max-w-3xl grid w-full grid-cols-1 items-center">
        <Awards
          title="Certified"
          subtitle="Frontend Engineer"
          date="Oct 2026"
          recipient="Jane Doe"
          level="gold"
          variant="certificate"
        />

        <Awards
          title="Verified"
          subtitle="Top Seller"
          date="Store Badge"
          level="bronze"
          variant="stamp"
        />
      </div>
    </div>
  );
}
