import { ArrowUpRight, Envelope, Rss } from "@nebutra/icons";
import Link from "next/link";
import type { ComponentType } from "react";

type NewsroomHeroProps = {
  contactHref: string;
  rssHref: string;
  isZh: boolean;
};

type InquiryRow = {
  label: string;
  value: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
};

export function NewsroomHero({ contactHref, rssHref, isZh }: NewsroomHeroProps) {
  const rows: InquiryRow[] = [
    {
      label: isZh ? "媒体垂询" : "Press inquiries",
      value: "contact@nebutra.com",
      href: "mailto:contact@nebutra.com",
      icon: Envelope,
      external: true,
    },
    {
      label: isZh ? "合作洽谈" : "Partnerships",
      value: isZh ? "联系我们" : "Get in touch",
      href: contactHref,
      icon: ArrowUpRight,
    },
    {
      label: isZh ? "关注动态" : "Follow updates",
      value: isZh ? "订阅 RSS" : "Subscribe via RSS",
      href: rssHref,
      icon: Rss,
      external: true,
    },
  ];

  return (
    <header className="grid gap-10 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-16">
      <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
        {isZh ? "新闻中心" : "Newsroom"}
      </h1>

      <dl className="lg:pt-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 border-t border-border py-4 first:border-t-0 sm:py-5"
            >
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd>
                <Link
                  href={row.href}
                  {...(row.external
                    ? { target: "_blank", rel: "noopener noreferrer", prefetch: false }
                    : {})}
                  className="group inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-[hsl(var(--primary))]"
                >
                  <Icon
                    className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[hsl(var(--primary))]"
                    aria-hidden
                  />
                  <span className="truncate">{row.value}</span>
                </Link>
              </dd>
            </div>
          );
        })}
      </dl>
    </header>
  );
}
