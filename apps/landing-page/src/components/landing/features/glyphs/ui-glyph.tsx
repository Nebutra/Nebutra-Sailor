import { ArrowRight, Sparkles } from "@nebutra/icons";
import { Badge, Button, Card } from "@nebutra/ui/primitives";

import type { SubpackageGlyphProps } from "./types";

export function UiGlyph(_props: SubpackageGlyphProps) {
  return (
    <div
      className="relative flex w-full flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--neutral-2)] p-3"
      style={{ height: 160 }}
    >
      <div className="absolute right-2 top-2">
        <Badge variant="outline" className="text-[10px] font-normal">
          300+ primitives
        </Badge>
      </div>

      <div className="mt-1 flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Button size="sm" className="h-6 gap-1 px-2 text-[10px]">
            Get started
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]">
            Learn more
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Badge className="h-4 bg-[var(--blue-9)] px-1.5 text-[9px] font-medium text-white">
            New
          </Badge>
          <Badge
            variant="outline"
            className="h-4 border-[var(--purple-6)] bg-[var(--purple-3)] px-1.5 text-[9px] font-medium text-[var(--purple-11)]"
          >
            Beta
          </Badge>
          <Badge
            variant="outline"
            className="h-4 border-[var(--green-6)] bg-[var(--green-3)] px-1.5 text-[9px] font-medium text-[var(--green-11)]"
          >
            Stable
          </Badge>
        </div>

        <Card className="border-[var(--neutral-6)] bg-[var(--neutral-1)] p-2 shadow-none">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--neutral-12)]">
            <Sparkles className="h-3 w-3 text-[var(--brand-primary)]" />
            Composable Card
          </div>
          <p className="mt-0.5 text-[9px] leading-tight text-[var(--neutral-11)]">
            Primitives + framer-motion, themed by tokens.
          </p>
        </Card>
      </div>

      <div className="mt-auto text-[10px] font-mono text-[var(--neutral-10)]">
        @nebutra/ui · Storybook covered
      </div>
    </div>
  );
}
