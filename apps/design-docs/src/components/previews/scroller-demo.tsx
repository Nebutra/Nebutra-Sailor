import { Scroller } from "@nebutra/ui/primitives";
import type { ReactNode } from "react";

const items = Array.from({ length: 6 }, (_, index) => index + 1);

function Tile({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-[var(--scroller-demo-tile-height)] w-[var(--scroller-demo-tile-width)] shrink-0 place-items-center rounded-[var(--radius-md)] border border-border bg-muted text-foreground text-sm">
      {children}
    </div>
  );
}

export function ScrollerDemo() {
  return (
    <div className="w-full max-w-[var(--scroller-demo-width)] [--scroller-demo-tile-height:128px] [--scroller-demo-tile-width:180px] [--scroller-demo-width:520px]">
      <Scroller
        contentLabel="customer logos"
        height={180}
        overflow="x"
        width="100%"
        withButtons
        childrenContainerClassName="gap-4"
      >
        {items.map((item) => (
          <Tile key={item}>Item {item}</Tile>
        ))}
      </Scroller>
    </div>
  );
}
