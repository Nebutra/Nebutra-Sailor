"use client";

import { ArrowRight } from "@nebutra/icons";
import { KineticFeatureCard } from "@nebutra/ui/patterns";
import Link from "next/link";
import type { ReactNode } from "react";

interface CapabilityCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  children: ReactNode;
}

export function CapabilityCard({
  icon,
  title,
  description,
  ctaText,
  ctaHref,
  children,
}: CapabilityCardProps) {
  return (
    <KineticFeatureCard
      eyebrow="capability"
      icon={icon}
      title={title}
      description={description}
      className="min-h-[620px]"
    >
      <div className="flex h-full flex-col gap-8">
        <Link href={ctaHref} className="mt-8 flex items-center gap-3 w-fit group/link">
          <div className="size-8 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground group-hover/link:text-foreground group-hover/link:border-foreground transition-colors cursor-pointer bg-background/50 backdrop-blur-sm">
            <span className="text-current shadow-none">
              <ArrowRight className="size-4" />
            </span>
          </div>
          <span className="text-sm font-semibold text-muted-foreground group-hover/link:text-foreground transition-colors">
            {ctaText}
          </span>
        </Link>

        <div className="relative flex min-h-[260px] flex-1 items-end justify-center overflow-hidden">
          <div className="relative flex h-full w-full items-end justify-center">{children}</div>
        </div>
      </div>
    </KineticFeatureCard>
  );
}
