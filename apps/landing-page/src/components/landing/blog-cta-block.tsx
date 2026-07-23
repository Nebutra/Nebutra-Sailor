import { ArrowRight } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";

export type BlogCtaBlockItem = {
  body?: string;
  key?: string;
  title?: string;
};

export type BlogCtaBlockProps = {
  body?: string;
  className?: string;
  ctaHref?: string;
  ctaLabel?: string;
  items?: BlogCtaBlockItem[];
  title?: string;
};

export function BlogCtaBlock({
  body,
  className,
  ctaHref,
  ctaLabel,
  items = [],
  title,
}: BlogCtaBlockProps) {
  const visibleItems = items.filter((item) => item.title || item.body);
  const hasCta = Boolean(ctaLabel && ctaHref);

  if (!title && !body && !visibleItems.length && !hasCta) return null;

  return (
    <aside
      className={cn("my-14 border-y border-border py-7", className)}
      aria-label={title ?? ctaLabel ?? undefined}
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="relative pl-5 before:absolute before:left-0 before:top-1 before:h-[calc(100%-0.25rem)] before:w-px before:bg-[linear-gradient(180deg,hsl(var(--primary)),hsl(var(--border)))]">
          {title && (
            <h2 className="text-xl font-semibold leading-tight text-foreground">{title}</h2>
          )}
          {body && (
            <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-muted-foreground">{body}</p>
          )}
        </div>
        {hasCta && (
          <a
            href={ctaHref}
            className="group inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[hsl(var(--foreground))] px-4 text-sm font-semibold text-[hsl(var(--background))] transition-colors hover:bg-[hsl(var(--primary))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-8)] sm:w-auto"
          >
            {ctaLabel}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </a>
        )}
      </div>
      {visibleItems.length > 0 && (
        <dl className="mt-6 grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
          {visibleItems.map((item, index) => (
            <div key={item.key ?? `${title ?? "cta"}-${index}`} className="min-w-0">
              {item.title && (
                <dt className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
                  <span className="font-mono text-[11px] text-[var(--blue-10)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.title}</span>
                </dt>
              )}
              {item.body && (
                <dd className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.body}</dd>
              )}
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
