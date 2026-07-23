import { Box, Sparkles, Users } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

const PLAYBOOKS: ReadonlyArray<{
  name: string;
  installs: string;
  rating: string;
}> = [
  { name: "Stripe Onboarding", installs: "2.4k", rating: "4.8" },
  { name: "Slack Recap", installs: "1.2k", rating: "4.7" },
  { name: "Notion Sync", installs: "847", rating: "4.6" },
  { name: "Linear Triage", installs: "412", rating: "4.5" },
];

export function PlayMarketplaceGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="flex w-full flex-col justify-between gap-2 rounded-[var(--radius-md)] bg-muted px-3 py-2.5"
      style={{ height: 160 }}
    >
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className="border-border bg-background px-1.5 py-0 font-mono text-[9px] text-muted-foreground"
        >
          marketplace · 1,247 playbooks
        </Badge>
        <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
      </div>

      <ul className="grid grid-cols-2 gap-1.5">
        {PLAYBOOKS.map(({ name, installs, rating }) => (
          <li
            key={name}
            className="flex flex-col gap-0.5 rounded-[var(--radius-sm)] bg-background px-1.5 py-1"
          >
            <div className="flex items-center gap-1">
              <Box className="h-2.5 w-2.5 shrink-0 text-[hsl(var(--primary))]" />
              <span className="truncate text-[10px] font-medium text-foreground">{name}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Users className="h-2 w-2" />
                {installs}
              </span>
              <span className="text-[hsl(var(--primary))]">★ {rating}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="font-mono text-[9px] text-muted-foreground">
        community-curated · MIT licensed
      </div>
    </div>
  );
}
