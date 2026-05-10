"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { getProductHuntBadgeUrl, getProductHuntUrl, PRODUCT_HUNT_COLORS } from "../config";
import type { ProductHuntBadgeProps } from "../types";

// ============================================
// Size Configuration
// ============================================

const sizeConfig = {
  small: {
    width: 180,
    height: 40,
    fontSize: "text-xs",
    padding: "px-3 py-1.5",
    iconSize: 16,
  },
  medium: {
    width: 250,
    height: 54,
    fontSize: "text-sm",
    padding: "px-4 py-2",
    iconSize: 20,
  },
  large: {
    width: 300,
    height: 64,
    fontSize: "text-base",
    padding: "px-5 py-3",
    iconSize: 24,
  },
} as const;

// ============================================
// Product Hunt Cat Icon (SVG)
// ============================================

function ProductHuntIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z"
        fill={PRODUCT_HUNT_COLORS.primary}
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
  );
}

// ============================================
// Badge Variants
// ============================================

/**
 * Official Product Hunt Embed Badge
 * Uses PH's official widget image
 */
export function ProductHuntEmbedBadge({
  postSlug,
  postId,
  theme = "light",
  altText,
  className,
  openInNewTab = true,
}: ProductHuntBadgeProps) {
  if (!postId) {
    return null;
  }

  const badgeUrl = getProductHuntBadgeUrl(postId, theme);
  const postUrl = getProductHuntUrl(postSlug);
  const alt = altText || `${postSlug} on Product Hunt`;

  return (
    <a
      href={postUrl}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={clsx("inline-block transition-opacity hover:opacity-90", className)}
    >
      <Image src={badgeUrl} alt={alt} width={250} height={54} style={{ width: 250, height: 54 }} />
    </a>
  );
}

/**
 * Custom Styled Product Hunt Badge
 * Nebutra-styled badge with PH branding
 */
export function ProductHuntBadge({
  postSlug,
  theme: _theme = "light",
  size = "medium",
  altText,
  className,
  openInNewTab = true,
}: ProductHuntBadgeProps) {
  const postUrl = getProductHuntUrl(postSlug);
  const config = sizeConfig[size];

  return (
    <a
      href={postUrl}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={clsx(
        "inline-flex items-center gap-3 rounded-lg transition-all duration-200",
        config.padding,
        className,
      )}
      style={{
        backgroundColor: "var(--marketing-card-bg)",
        border: "1px solid var(--marketing-card-border)",
        boxShadow: "var(--marketing-card-shadow)",
        color: "var(--marketing-fg-default)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--marketing-card-shadow-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--marketing-card-shadow)";
      }}
      aria-label={altText || `View on Product Hunt`}
    >
      <ProductHuntIcon size={config.iconSize} />
      <div className="flex flex-col items-start">
        <span className={clsx("font-semibold leading-tight", config.fontSize)}>Featured on</span>
        <span
          className={clsx("font-bold leading-tight", config.fontSize)}
          style={{ color: "var(--marketing-ph-primary)" }}
        >
          Product Hunt
        </span>
      </div>
    </a>
  );
}

/**
 * Upvote-style Badge with CTA
 */
export function ProductHuntUpvoteBadge({
  postSlug,
  theme: _theme = "light",
  size = "medium",
  className,
  openInNewTab = true,
}: ProductHuntBadgeProps) {
  const postUrl = getProductHuntUrl(postSlug);
  const config = sizeConfig[size];

  return (
    <a
      href={postUrl}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full font-semibold transition-all duration-200",
        "shadow-md hover:shadow-lg active:scale-95",
        config.padding,
        config.fontSize,
        className,
      )}
      style={{
        backgroundColor: "var(--marketing-ph-primary)",
        color: "var(--marketing-fg-on-emphasis)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--marketing-ph-primary-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--marketing-ph-primary)";
      }}
      aria-label="Support us on Product Hunt"
    >
      <ProductHuntIcon size={config.iconSize} />
      <span>Support us on Product Hunt</span>
      <svg
        className="ml-1"
        width={config.iconSize * 0.75}
        height={config.iconSize * 0.75}
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 2L6 10M6 2L3 5M6 2L9 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

/**
 * Minimal text link badge
 */
export function ProductHuntTextBadge({
  postSlug,
  theme: _theme = "light",
  className,
  openInNewTab = true,
}: ProductHuntBadgeProps) {
  const postUrl = getProductHuntUrl(postSlug);

  return (
    <a
      href={postUrl}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      className={clsx(
        "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
        className,
      )}
      style={{ color: "var(--marketing-fg-muted)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--marketing-ph-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--marketing-fg-muted)";
      }}
    >
      <ProductHuntIcon size={16} />
      <span>Check us out on Product Hunt</span>
      <svg
        width={12}
        height={12}
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 9L9 3M9 3H4M9 3V8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

// Default export for convenience
export default ProductHuntBadge;
