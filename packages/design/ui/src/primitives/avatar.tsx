"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import * as React from "react";
import { cn } from "../utils/cn";

// ─── Size Map ─────────────────────────────────────────────────────────────────
// Matches avatarTokens: xs=20 sm=32 md=40 lg=56 xl=80

const sizeClasses = {
  xs: { root: "h-5 w-5", fallback: "text-[8px]" },
  sm: { root: "h-8 w-8", fallback: "text-xs" },
  md: { root: "h-10 w-10", fallback: "text-sm" },
  lg: { root: "h-14 w-14", fallback: "text-xl" },
  xl: { root: "h-20 w-20", fallback: "text-2xl" },
} as const;

type AvatarSize = keyof typeof sizeClasses;

// Base UI handles standard HTML props natively.

// ─── Avatar ───────────────────────────────────────────────────────────────────

export type AvatarProps = React.ComponentPropsWithoutRef<typeof BaseAvatar.Root> & {
  /** Size preset — xs=20px sm=32px md=40px lg=56px xl=80px */
  size?: AvatarSize;
};

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size = "md", ...props }, ref) => (
    <BaseAvatar.Root
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size].root,
        className,
      )}
      {...props}
    />
  ),
);
Avatar.displayName = "Avatar";

// ─── AvatarImage ──────────────────────────────────────────────────────────────

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Image>
>(({ className, ...props }, ref) => (
  <BaseAvatar.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = "AvatarImage";

// ─── AvatarFallback ───────────────────────────────────────────────────────────

export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback> & {
  /** Pass the same size as the parent Avatar for correct font size */
  size?: AvatarSize;
};

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, size = "md", ...props }, ref) => (
    <BaseAvatar.Fallback
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        sizeClasses[size].fallback,
        className,
      )}
      {...props}
    />
  ),
);
AvatarFallback.displayName = "AvatarFallback";

// ─── AvatarGroup ──────────────────────────────────────────────────────────────

export interface AvatarGroupItem {
  src?: string;
  alt: string;
  fallback: string;
}

export interface AvatarGroupProps {
  items: AvatarGroupItem[];
  /** Maximum avatars to show before collapsing to "+N" */
  max?: number;
  /** Size of each avatar in the group */
  size?: AvatarSize;
  className?: string;
}

function AvatarGroup({ items, max = 4, size = "sm", className }: AvatarGroupProps) {
  // Show max-1 real avatars; if items.length === max show last one too,
  // if items.length > max show +N badge instead of last slot.
  // Use built-in Tailwind z-index utilities (z-10..z-60) so they are
  // guaranteed to exist without arbitrary-value scanning.
  const Z = ["z-10", "z-20", "z-30", "z-40", "z-50", "z-60"] as const;
  const visibleCount = items.length >= max ? max - 1 : items.length;
  const visible = items.slice(0, visibleCount);
  const lastItem = items.length === max ? items[max - 1] : null;
  const overflowCount = items.length > max ? items.length - max + 1 : 0;
  const lastZ = Z[Math.min(max - 1, Z.length - 1)];

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((item, index) => (
        // relative is required for z-index to take effect on non-flex-item contexts
        <span
          key={item.alt}
          className={cn("relative inline-flex items-center", index !== 0 && "-ml-2", Z[index])}
        >
          <Avatar
            size={size}
            className="border border-black/[0.08] dark:border-white/[0.14] bg-background"
          >
            {item.src && <AvatarImage src={item.src} alt={item.alt} />}
            <AvatarFallback size={size}>{item.fallback}</AvatarFallback>
          </Avatar>
        </span>
      ))}

      {/* Exact limit: show the last real avatar */}
      {lastItem && (
        <span className={cn("relative inline-flex items-center -ml-2", lastZ)}>
          <Avatar
            size={size}
            className="border border-black/[0.08] dark:border-white/[0.14] bg-background"
          >
            {lastItem.src && <AvatarImage src={lastItem.src} alt={lastItem.alt} />}
            <AvatarFallback size={size}>{lastItem.fallback}</AvatarFallback>
          </Avatar>
        </span>
      )}

      {/* Over limit: +N overflow badge */}
      {overflowCount > 0 && (
        <span className={cn("relative inline-flex items-center -ml-2", lastZ)}>
          <Avatar size={size} className="border border-black/[0.08] dark:border-white/[0.14]">
            <AvatarFallback
              size={size}
              className="bg-muted text-[0.625rem] font-semibold leading-none text-muted-foreground"
            >
              +{overflowCount}
            </AvatarFallback>
          </Avatar>
        </span>
      )}
    </div>
  );
}

export { Avatar, AvatarFallback, AvatarGroup, AvatarImage };
