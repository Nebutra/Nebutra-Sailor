"use client";

import { clsx } from "clsx";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { SocialProofBarProps, TrustBadge, TrustBadgesProps } from "../types";

// ============================================
// Animated Number Counter
// ============================================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
}

function AnimatedNumber({
  value,
  duration = 2000,
  format = (n) => n.toLocaleString(),
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - (1 - progress) ** 3;
            setDisplayValue(Math.floor(eased * value));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return <span ref={ref}>{format(displayValue)}</span>;
}

// ============================================
// Stat Icons
// ============================================

const StatIcons = {
  users: (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  companies: (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  countries: (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  rating: (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  reviews: (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  productHuntUpvotes: (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 40 40" fill="none">
      <path
        d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z"
        fill="#DA552F"
      />
      <path
        d="M22.5 20H17V13H22.5C24.433 13 26 14.567 26 16.5C26 18.433 24.433 20 22.5 20Z"
        fill="white"
      />
      <path
        d="M22.5 10H14V30H17V23H22.5C26.0899 23 29 20.0899 29 16.5C29 12.9101 26.0899 10 22.5 10Z"
        fill="white"
      />
    </svg>
  ),
  githubStars: (
    <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
};

// ============================================
// Format helpers
// ============================================

function formatNumber(n: number): string {
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  }
  return n.toLocaleString();
}

function formatRating(n: number): string {
  return n.toFixed(1);
}

// ============================================
// Stat Item
// ============================================

interface StatItemProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  animated?: boolean;
  format?: (n: number) => string;
}

function StatItem({ value, label, icon, animated = true, format = formatNumber }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--marketing-accent-fg)" }}>{icon}</span>
      <div className="flex flex-col">
        <span className="text-xl font-bold" style={{ color: "var(--marketing-fg-default)" }}>
          {animated ? <AnimatedNumber value={value} format={format} /> : format(value)}
        </span>
        <span className="text-xs" style={{ color: "var(--marketing-fg-muted)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Social Proof Bar Variants
// ============================================

/**
 * Minimal variant - Simple inline stats
 */
function SocialProofBarMinimal({ stats, animated = true, className }: SocialProofBarProps) {
  const items: {
    value: number;
    label: string;
    format?: (n: number) => string;
  }[] = [];

  if (stats.users) items.push({ value: stats.users, label: "users" });
  if (stats.companies) items.push({ value: stats.companies, label: "companies" });
  if (stats.countries) items.push({ value: stats.countries, label: "countries" });
  if (stats.rating) items.push({ value: stats.rating, label: "rating", format: formatRating });
  if (stats.reviews) items.push({ value: stats.reviews, label: "reviews" });
  if (stats.productHuntUpvotes) items.push({ value: stats.productHuntUpvotes, label: "upvotes" });
  if (stats.githubStars) items.push({ value: stats.githubStars, label: "stars" });

  return (
    <div className={clsx("flex flex-wrap items-center justify-center gap-x-8 gap-y-2", className)}>
      {items.map(({ value, label, format }) => (
        <span key={label} className="text-sm" style={{ color: "var(--marketing-fg-muted)" }}>
          <span className="font-bold" style={{ color: "var(--marketing-fg-default)" }}>
            {animated ? (
              <AnimatedNumber value={value} format={format || formatNumber} />
            ) : (
              (format || formatNumber)(value)
            )}
          </span>{" "}
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * Badges variant - Stats as badges
 */
function SocialProofBarBadges({ stats, animated = true, className }: SocialProofBarProps) {
  return (
    <div className={clsx("flex flex-wrap items-center justify-center gap-4", className)}>
      {stats.users && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            backgroundColor: "var(--marketing-stat-users-bg)",
          }}
        >
          {StatIcons.users}
          <span className="font-semibold" style={{ color: "var(--marketing-stat-users-fg)" }}>
            {animated ? (
              <AnimatedNumber value={stats.users} format={formatNumber} />
            ) : (
              formatNumber(stats.users)
            )}
            + users
          </span>
        </div>
      )}

      {stats.rating && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            backgroundColor: "var(--marketing-stat-rating-bg)",
          }}
        >
          <span style={{ color: "var(--marketing-stat-rating-fg)" }}>{StatIcons.rating}</span>
          <span className="font-semibold" style={{ color: "var(--marketing-stat-rating-fg)" }}>
            {formatRating(stats.rating)} rating
          </span>
        </div>
      )}

      {stats.productHuntUpvotes && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            backgroundColor: "var(--marketing-stat-upvotes-bg)",
          }}
        >
          {StatIcons.productHuntUpvotes}
          <span className="font-semibold" style={{ color: "var(--marketing-stat-upvotes-fg)" }}>
            {animated ? (
              <AnimatedNumber value={stats.productHuntUpvotes} format={formatNumber} />
            ) : (
              formatNumber(stats.productHuntUpvotes)
            )}
            + upvotes
          </span>
        </div>
      )}

      {stats.githubStars && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2"
          style={{
            backgroundColor: "var(--marketing-stat-stars-bg)",
          }}
        >
          {StatIcons.githubStars}
          <span className="font-semibold" style={{ color: "var(--marketing-stat-stars-fg)" }}>
            {animated ? (
              <AnimatedNumber value={stats.githubStars} format={formatNumber} />
            ) : (
              formatNumber(stats.githubStars)
            )}
            + stars
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Detailed variant - Full stat cards
 */
function SocialProofBarDetailed({ stats, animated = true, className }: SocialProofBarProps) {
  return (
    <div
      className={clsx(
        "grid grid-cols-2 gap-6 sm:grid-cols-3 lg:flex lg:justify-center lg:gap-12",
        className,
      )}
    >
      {stats.users && (
        <StatItem
          value={stats.users}
          label="Active Users"
          icon={StatIcons.users}
          animated={animated}
        />
      )}
      {stats.companies && (
        <StatItem
          value={stats.companies}
          label="Companies"
          icon={StatIcons.companies}
          animated={animated}
        />
      )}
      {stats.countries && (
        <StatItem
          value={stats.countries}
          label="Countries"
          icon={StatIcons.countries}
          animated={animated}
        />
      )}
      {stats.rating && (
        <StatItem
          value={stats.rating}
          label="Avg Rating"
          icon={<span className="text-yellow-500">{StatIcons.rating}</span>}
          animated={animated}
          format={formatRating}
        />
      )}
      {stats.reviews && (
        <StatItem
          value={stats.reviews}
          label="Reviews"
          icon={StatIcons.reviews}
          animated={animated}
        />
      )}
      {stats.productHuntUpvotes && (
        <StatItem
          value={stats.productHuntUpvotes}
          label="PH Upvotes"
          icon={StatIcons.productHuntUpvotes}
          animated={animated}
        />
      )}
      {stats.githubStars && (
        <StatItem
          value={stats.githubStars}
          label="GitHub Stars"
          icon={StatIcons.githubStars}
          animated={animated}
        />
      )}
      {stats.custom?.map((stat) => (
        <StatItem
          key={stat.label}
          value={typeof stat.value === "number" ? stat.value : 0}
          label={stat.label}
          icon={stat.icon || <span>📊</span>}
          animated={animated}
        />
      ))}
    </div>
  );
}

// ============================================
// Main Social Proof Bar
// ============================================

export function SocialProofBar({
  stats,
  variant = "minimal",
  animated = true,
  className,
}: SocialProofBarProps) {
  switch (variant) {
    case "badges":
      return <SocialProofBarBadges stats={stats} animated={animated} className={className} />;
    case "detailed":
      return <SocialProofBarDetailed stats={stats} animated={animated} className={className} />;
    default:
      return <SocialProofBarMinimal stats={stats} animated={animated} className={className} />;
  }
}

// ============================================
// Trust Badges
// ============================================

export function TrustBadges({
  badges,
  variant = "row",
  size = "medium",
  className,
}: TrustBadgesProps) {
  const sizeClasses = {
    small: "h-8",
    medium: "h-12",
    large: "h-16",
  };

  const BadgeImage = ({ badge }: { badge: TrustBadge }) => {
    const img = (
      // biome-ignore lint/performance/noImgElement: Trust badges frequently use external SVG URLs without fixed dimensions
      <img
        src={badge.imageUrl}
        alt={badge.altText}
        className={clsx(
          "object-contain grayscale transition-all hover:grayscale-0",
          sizeClasses[size],
        )}
      />
    );

    if (badge.linkUrl) {
      return (
        <a
          href={badge.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-80"
        >
          {img}
        </a>
      );
    }

    return img;
  };

  return (
    <div
      className={clsx(
        variant === "row"
          ? "flex flex-wrap items-center justify-center gap-8"
          : "grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4",
        className,
      )}
    >
      {badges.map((badge) => (
        <BadgeImage key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

// ============================================
// Featured In Section
// ============================================

export interface FeaturedInProps {
  title?: string;
  badges: TrustBadge[];
  className?: string;
}

export function FeaturedIn({ title = "Featured in", badges, className }: FeaturedInProps) {
  return (
    <div className={clsx("text-center", className)}>
      <p className="mb-6 text-sm font-medium uppercase tracking-wider text-gray-500">{title}</p>
      <TrustBadges badges={badges} variant="row" size="medium" />
    </div>
  );
}

// Export all
export { AnimatedNumber, StatItem };
export default SocialProofBar;
