import Link from "next/link";
import { BlogImage } from "./blog-image";
import { NewsDecorTile } from "./news-decor-tile";

export type NewsFeaturedItem = {
  id: string;
  title: string;
  href: string;
  category: string | null;
  dateLabel: string | null;
  excerpt: string;
  imageUrl: string;
  imageAlt: string;
  fallbackImageUrl: string;
  fallbackImageAlt: string;
  imageBlurDataURL?: string;
};

export type NewsRailItem = {
  id: string;
  title: string;
  href: string;
  category: string | null;
  dateLabel: string | null;
  excerpt: string;
};

function CategoryDate({
  category,
  dateLabel,
}: {
  category: string | null;
  dateLabel: string | null;
}) {
  if (!category && !dateLabel) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {category && <span className="font-medium text-[var(--neutral-12)]">{category}</span>}
      {dateLabel && <span className="text-[var(--neutral-10)]">{dateLabel}</span>}
    </p>
  );
}

export function NewsFeatured({
  featured,
  rail,
}: {
  featured: NewsFeaturedItem;
  rail: NewsRailItem[];
}) {
  return (
    <section className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      {/* Lead story */}
      <Link href={featured.href} className="group flex flex-col">
        <div className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--neutral-6)]">
          <div className="relative min-h-[18rem] bg-[var(--neutral-3)] sm:min-h-[26rem]">
            <BlogImage
              src={featured.imageUrl}
              alt={featured.imageAlt}
              fallbackSrc={featured.fallbackImageUrl}
              fallbackAlt={featured.fallbackImageAlt}
              blurDataURL={featured.imageBlurDataURL}
              fill
              sizes="(max-width: 1024px) 50vw, 460px"
              className="object-cover [transition-duration:var(--motion-duration-flow)] [transition-property:transform] [transition-timing-function:var(--ease-out)] group-hover:scale-[1.015] motion-reduce:transition-none"
            />
          </div>
          <NewsDecorTile
            variant="aurora"
            className="min-h-[18rem] rounded-none sm:min-h-[26rem]"
            glyphClassName="size-20 sm:size-28"
          />
        </div>

        <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <h2 className="text-3xl font-semibold leading-tight text-[var(--neutral-12)] [transition-duration:var(--motion-duration-flow)] [transition-property:color] [transition-timing-function:var(--ease-out)] group-hover:text-[var(--blue-9)] motion-reduce:transition-none sm:text-4xl">
            {featured.title}
          </h2>
          <div className="flex flex-col gap-3">
            <CategoryDate category={featured.category} dateLabel={featured.dateLabel} />
            {featured.excerpt && (
              <p className="line-clamp-4 text-base leading-7 text-[var(--neutral-11)]">
                {featured.excerpt}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Recent rail */}
      <div className="flex flex-col">
        {rail.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group flex flex-col border-t border-[var(--neutral-6)] py-6 first:border-t-0 first:pt-0 lg:first:pt-1"
          >
            <CategoryDate category={item.category} dateLabel={item.dateLabel} />
            <h3 className="mt-2 text-lg font-semibold leading-snug text-[var(--neutral-12)] [transition-duration:var(--motion-duration-flow)] [transition-property:color] [transition-timing-function:var(--ease-out)] group-hover:text-[var(--blue-9)] motion-reduce:transition-none">
              {item.title}
            </h3>
            {item.excerpt && (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--neutral-11)]">
                {item.excerpt}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
