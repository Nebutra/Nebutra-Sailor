import { cn } from "@nebutra/ui/utils";
import Image, { type StaticImageData } from "next/image";

/**
 * A live site, framed as a browser window: the chrome carries the real
 * domain, so the picture says where to go to check it.
 *
 * Responsive: Scale. The frame keeps the 16:10 capture ratio at every width.
 */
export function BrowserFrame({
  domain,
  shot,
  alt,
  sizes,
  priority = false,
  className,
}: {
  domain: string;
  shot: StaticImageData;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card",
        className,
      )}
    >
      <div className="flex h-8 items-center gap-3 border-b border-border px-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground" translate="no">
          {domain}
        </span>
      </div>
      <div className="overflow-hidden">
        <Image
          src={shot}
          alt={alt}
          sizes={sizes}
          placeholder="blur"
          priority={priority}
          className="h-auto w-full motion-safe:transition-transform motion-safe:duration-cinematic motion-safe:ease-out [@media(hover:hover)]:group-hover:scale-[1.015]"
        />
      </div>
    </div>
  );
}
