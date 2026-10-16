import { cn } from "@nebutra/ui/utils";
import type { ReactNode } from "react";

/**
 * The sign-in page's left panel, shared by both sign-in surfaces (apps/auth,
 * which owns sign-in in production, and the template's apps/web). Server-safe:
 * each app passes its translated strings, its logo and the archive story.
 *
 * The story — the rotating boot-log entry from the archive (`BootLogCard`) —
 * is the panel's subject: brand line at the top, the story as the body, the
 * footer at the bottom, all inside one 100svh column so a 900px-tall screen
 * shows every line of it. Light comes from above: a faint House-blue wash on
 * the sunken canvas, in place of the cyan blobs and dot grid it replaced.
 */
export interface AuthBrandPanelProps {
  /** The brand mark at banner size. */
  logo: ReactNode;
  slogan: string;
  tagline: string;
  /** The archive story (`BootLogCard`), the panel's body. */
  story?: ReactNode;
  footer: ReactNode;
  className?: string;
}

export function AuthBrandPanel({
  logo,
  slogan,
  tagline,
  story,
  footer,
  className,
}: AuthBrandPanelProps) {
  return (
    <aside
      className={cn(
        "relative isolate hidden min-h-svh overflow-hidden border-r border-border bg-muted lg:flex",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(90%_60%_at_0%_0%,hsl(var(--ring)/0.10),transparent_70%)]"
      />

      <div className="flex w-full flex-col items-start justify-between gap-10 px-14 py-16 xl:px-20 xl:py-20">
        <div className="flex max-w-[36rem] flex-col items-start">
          <div className="mb-10">{logo}</div>
          <h2 className="text-balance break-keep text-[clamp(28px,3.2vw,40px)] leading-[1.15] tracking-[-0.02em] text-foreground">
            {slogan}
          </h2>
          <p className="mt-4 max-w-[24rem] text-balance text-[15px] leading-[1.6] text-muted-foreground">
            {tagline}
          </p>
        </div>

        {story ? <div className="w-full max-w-[34rem]">{story}</div> : null}

        <div className="text-xs text-muted-foreground">{footer}</div>
      </div>
    </aside>
  );
}
