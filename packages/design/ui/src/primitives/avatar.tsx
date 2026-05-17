"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import * as React from "react";
import { type AvatarSize as AvatarPresetSize, avatarTokens } from "../tokens/components/avatar";
import { cn } from "../utils/cn";

export type AvatarSize = AvatarPresetSize | number;

const sizeClasses = {
  xs: { root: "h-5 w-5", fallback: "text-[8px]" },
  sm: { root: "h-8 w-8", fallback: "text-xs" },
  md: { root: "h-10 w-10", fallback: "text-sm" },
  lg: { root: "h-14 w-14", fallback: "text-xl" },
  xl: { root: "h-20 w-20", fallback: "text-2xl" },
} as const;

const numericAvatarClass = "h-[var(--avatar-size)] w-[var(--avatar-size)]";

type AvatarContextValue = {
  size: AvatarSize;
  title?: string;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function isPresetSize(size: AvatarSize): size is AvatarPresetSize {
  return typeof size === "string";
}

export function getAvatarSizePx(size: AvatarSize): number {
  if (typeof size === "number") return size;
  return avatarTokens.size[size].dimension;
}

function getAvatarRootClass(size: AvatarSize): string {
  return isPresetSize(size) ? sizeClasses[size].root : numericAvatarClass;
}

function getAvatarFallbackClass(size: AvatarSize): string {
  return isPresetSize(size) ? sizeClasses[size].fallback : "text-[var(--avatar-font-size)]";
}

function getAvatarStyle(
  size: AvatarSize,
  style?: React.CSSProperties,
): React.CSSProperties | undefined {
  if (typeof size !== "number") return style;
  return {
    "--avatar-size": `${size}px`,
    "--avatar-font-size": `${Math.max(10, Math.round(size * 0.375))}px`,
    ...style,
  } as React.CSSProperties;
}

export function getAvatarInitials(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return "";

  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();

  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function githubAvatarSrc(username: string, size: AvatarSize): string {
  return `https://github.com/${username}.png?size=${getAvatarSizePx(size) * 2}`;
}

function normalizeAvatarLabel({
  alt,
  title,
  username,
}: {
  alt?: string | undefined;
  title?: string | undefined;
  username?: string | undefined;
}): string {
  return title ?? alt ?? username ?? "Avatar";
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export type AvatarProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Root>,
  "children"
> & {
  /** Size preset or explicit pixel size. */
  size?: AvatarSize;
  /** Convenience image source. For composition, use AvatarImage as a child. */
  src?: string;
  /** Image alt text. Prefer title for entity name and alt for explicit image labels. */
  alt?: string;
  /** Literal entity name used for fallback initials and accessible labels. */
  title?: string;
  /** Explicit initials fallback. Keep this to 1-2 uppercase characters. */
  letter?: string;
  /** Convenience username fallback. */
  username?: string;
  /** Loading shell. Do not use as permanent fallback. */
  placeholder?: boolean;
  /** Delay before fallback appears. */
  fallbackDelayMs?: number;
  children?: React.ReactNode;
};

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      size = "md",
      src,
      alt,
      title,
      letter,
      username,
      placeholder,
      fallbackDelayMs,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const label = normalizeAvatarLabel({ alt, title, username });
    const fallback = letter ?? getAvatarInitials(title ?? username ?? alt ?? "");
    const contextTitle = title ?? alt ?? username;
    const contextValue: AvatarContextValue =
      contextTitle === undefined ? { size } : { size, title: contextTitle };
    const shouldRenderConvenienceContent =
      children === undefined && (src !== undefined || placeholder === true || fallback.length > 0);

    return (
      <AvatarContext.Provider value={contextValue}>
        <BaseAvatar.Root
          ref={ref}
          className={cn(
            "relative flex shrink-0 overflow-hidden rounded-full bg-muted",
            getAvatarRootClass(size),
            className,
          )}
          style={getAvatarStyle(size, style)}
          {...props}
        >
          {shouldRenderConvenienceContent ? (
            <>
              {src && <AvatarImage src={src} alt={label} />}
              <AvatarFallback size={size} delay={fallbackDelayMs}>
                {placeholder ? <span className="sr-only">Loading avatar</span> : fallback}
              </AvatarFallback>
            </>
          ) : (
            children
          )}
        </BaseAvatar.Root>
      </AvatarContext.Provider>
    );
  },
);
Avatar.displayName = "Avatar";

// ─── AvatarImage ──────────────────────────────────────────────────────────────

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ComponentPropsWithoutRef<typeof BaseAvatar.Image>
>(({ className, ...props }, ref) => (
  <BaseAvatar.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

// ─── AvatarFallback ───────────────────────────────────────────────────────────

export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback> & {
  /** Pass the same size as the parent Avatar for correct font size */
  size?: AvatarSize;
};

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, size, children, "aria-label": ariaLabel, style, ...props }, ref) => {
    const context = React.useContext(AvatarContext);
    const resolvedSize = size ?? context?.size ?? "md";
    const fallbackLabel =
      ariaLabel ??
      (typeof children === "string" && children.trim().length > 0
        ? `Avatar with initials: ${children}`
        : context?.title);

    return (
      <BaseAvatar.Fallback
        ref={ref}
        aria-label={fallbackLabel}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
          getAvatarFallbackClass(resolvedSize),
          className,
        )}
        style={getAvatarStyle(resolvedSize, style)}
        {...props}
      >
        {children}
      </BaseAvatar.Fallback>
    );
  },
);
AvatarFallback.displayName = "AvatarFallback";

// ─── AvatarGroup ──────────────────────────────────────────────────────────────

export interface AvatarGroupItem {
  src?: string;
  alt?: string;
  fallback?: string;
  title?: string;
  username?: string;
}

export interface AvatarGroupProps {
  /** Nebutra composable API. */
  items?: AvatarGroupItem[];
  /** Geist-compatible API. */
  members?: AvatarGroupItem[];
  /** Maximum avatars to show before collapsing to "+N" */
  max?: number;
  /** Geist-compatible alias for max. */
  limit?: number;
  /** Size of each avatar in the group */
  size?: AvatarSize;
  className?: string;
  "aria-label"?: string;
}

function normalizeGroupItem(item: AvatarGroupItem, size: AvatarSize): Required<AvatarGroupItem> {
  const label = normalizeAvatarLabel({
    alt: item.alt,
    title: item.title,
    username: item.username,
  });
  return {
    alt: label,
    title: item.title ?? label,
    fallback: item.fallback ?? getAvatarInitials(label),
    username: item.username ?? "",
    src: item.src ?? (item.username ? githubAvatarSrc(item.username, size) : ""),
  };
}

function AvatarGroup({
  items,
  members,
  max,
  limit,
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: AvatarGroupProps) {
  const sourceItems = items ?? members ?? [];
  const resolvedMax = Math.max(1, max ?? limit ?? 4);
  const normalizedItems = sourceItems.map((item) => normalizeGroupItem(item, size));
  // Show max-1 real avatars; if items.length === max show last one too,
  // if items.length > max show +N badge instead of last slot.
  // Use built-in Tailwind z-index utilities (z-10..z-60) so they are
  // guaranteed to exist without arbitrary-value scanning.
  const Z = ["z-10", "z-20", "z-30", "z-40", "z-50", "z-60"] as const;
  const visibleCount =
    normalizedItems.length >= resolvedMax ? resolvedMax - 1 : normalizedItems.length;
  const visible = normalizedItems.slice(0, visibleCount);
  const lastItem = normalizedItems.length === resolvedMax ? normalizedItems[resolvedMax - 1] : null;
  const overflowCount =
    normalizedItems.length > resolvedMax ? normalizedItems.length - resolvedMax + 1 : 0;
  const lastZ = Z[Math.min(resolvedMax - 1, Z.length - 1)];
  const groupLabel =
    ariaLabel ?? `${normalizedItems.length} ${normalizedItems.length === 1 ? "member" : "members"}`;

  return (
    <div role="img" aria-label={groupLabel} className={cn("flex items-center", className)}>
      {visible.map((item, index) => (
        // relative is required for z-index to take effect on non-flex-item contexts
        <span
          key={item.alt}
          aria-hidden="true"
          className={cn("relative inline-flex items-center", index !== 0 && "-ml-2", Z[index])}
        >
          <Avatar size={size} className="border border-border bg-background">
            {item.src && <AvatarImage src={item.src} alt="" />}
            <AvatarFallback size={size}>{item.fallback}</AvatarFallback>
          </Avatar>
        </span>
      ))}

      {/* Exact limit: show the last real avatar */}
      {lastItem && (
        <span aria-hidden="true" className={cn("relative inline-flex items-center -ml-2", lastZ)}>
          <Avatar size={size} className="border border-border bg-background">
            {lastItem.src && <AvatarImage src={lastItem.src} alt="" />}
            <AvatarFallback size={size}>{lastItem.fallback}</AvatarFallback>
          </Avatar>
        </span>
      )}

      {/* Over limit: +N overflow badge */}
      {overflowCount > 0 && (
        <span aria-hidden="true" className={cn("relative inline-flex items-center -ml-2", lastZ)}>
          <Avatar size={size} className="border border-border">
            <AvatarFallback
              size={size}
              className="bg-muted text-[0.625rem] font-semibold leading-none text-foreground"
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
