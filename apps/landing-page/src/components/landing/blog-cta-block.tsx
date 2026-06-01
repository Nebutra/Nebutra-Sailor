import { ArrowRight, CheckCircle } from "@nebutra/icons";
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
    <section
      className={cn(
        "my-12 rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] px-5 py-6 shadow-sm sm:px-6 sm:py-7",
        className,
      )}
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div>
          {title && (
            <h2 className="text-xl font-semibold leading-tight text-[var(--neutral-12)]">
              {title}
            </h2>
          )}
          {body && <p className="mt-3 max-w-2xl leading-7 text-[var(--neutral-11)]">{body}</p>}
        </div>
        {hasCta && (
          <a
            href={ctaHref}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--blue-9)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--blue-10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-8)]"
          >
            {ctaLabel}
            <ArrowRight className="size-4" aria-hidden />
          </a>
        )}
      </div>
      {visibleItems.length > 0 && (
        <div className="mt-6 grid gap-0 border-t border-[var(--neutral-6)] pt-5 sm:grid-cols-3 sm:divide-x sm:divide-[var(--neutral-6)]">
          {visibleItems.map((item, index) => (
            <div
              key={item.key ?? `${title ?? "cta"}-${index}`}
              className="py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:first:pt-0 sm:last:pr-0"
            >
              {item.title && (
                <div className="flex items-center gap-2 font-semibold text-[var(--neutral-12)]">
                  <CheckCircle className="size-4 shrink-0 text-[var(--blue-9)]" aria-hidden />
                  <span>{item.title}</span>
                </div>
              )}
              {item.body && (
                <p className="mt-2 text-sm leading-6 text-[var(--neutral-11)]">{item.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
