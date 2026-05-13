"use client";

import { MoreHorizontal, Pin } from "lucide-react";
import * as React from "react";
import { Badge } from "../primitives/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { cn } from "../utils/cn";

/* ─────────────────────────────────────────────────────────────────────────────
 * GalleryCard
 *
 * Discovery card pattern modelled on MiniMax / OpenAI GPT Store / Vercel
 * templates. Renders an icon tile, title, description, metadata strip (author
 * + metric + optional trailing slot), action menu, and featured / pinned
 * indicators.
 *
 * The card can render as one of:
 *   - <a> (when `href` is provided — accessible link, full-card clickable)
 *   - <button> (when only `onClick` is provided)
 *   - <div> (no interaction)
 *
 * The action menu always stops propagation so it never triggers card
 * navigation when clicked.
 * ───────────────────────────────────────────────────────────────────────── */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GalleryCardIconTone =
  | "neutral"
  | "blue"
  | "cyan"
  | "purple"
  | "amber"
  | "green"
  | "pink";

export type GalleryCardBadgeTone = "beta" | "new" | "owner" | "featured" | "coming-soon";

export interface GalleryCardMetadata {
  /** Author / publisher name, e.g. "By MiniMax" */
  author?: string;
  /** Pre-formatted secondary metric, e.g. "710478 浏览量" or "1.2k uses" */
  metric?: string;
  /** Custom metadata slot at end (e.g. star count, last updated) */
  trailing?: React.ReactNode;
}

export interface GalleryCardBadge {
  label: string;
  tone: GalleryCardBadgeTone;
}

export interface GalleryCardAction {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export interface GalleryCardRenderLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

export interface GalleryCardProps {
  title: string;
  description?: string;
  /** Icon at top-left (16-24px). Common: emoji, lucide icon, or 32x32 avatar */
  icon?: React.ReactNode;
  /** Color hint for the icon background tile */
  iconTone?: GalleryCardIconTone;
  /** Optional badge rendered inline next to title (e.g. "Featured", "Beta") */
  badge?: GalleryCardBadge;
  /** Pin/star indicator at top-right (boolean) — renders a small Pin icon */
  pinned?: boolean;
  metadata?: GalleryCardMetadata;
  /** Dropdown action menu items at top-right (••• kebab) */
  actions?: GalleryCardAction[];
  /** Click handler for the whole card — makes the card behave as a button */
  onClick?: () => void;
  /** If provided, makes the card a link (renders <a> with onClick, accessible) */
  href?: string;
  /** Replace the rendered link element (e.g. Next.js Link) */
  renderLink?: (props: GalleryCardRenderLinkProps) => React.ReactElement;
  className?: string;
}

// ─── Token maps ───────────────────────────────────────────────────────────────

/**
 * Icon tile color pairs. Each tone resolves to a (background, foreground) pair
 * that works in both light and dark mode using semantic Tailwind palette steps.
 * `neutral` falls back to muted tokens so it always blends with the card.
 */
const iconToneStyles: Record<GalleryCardIconTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
  purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  green: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  pink: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300",
};

const badgeToneToVariant: Record<
  GalleryCardBadgeTone,
  "beta" | "new" | "owner" | "featured" | "coming-soon"
> = {
  beta: "beta",
  new: "new",
  owner: "owner",
  featured: "featured",
  "coming-soon": "coming-soon",
};

// ─── Shared className ─────────────────────────────────────────────────────────

const cardClassName = cn(
  "group relative block rounded-xl border border-border bg-card text-card-foreground p-5 text-left",
  "transition-all duration-150",
  "hover:border-neutral-7 hover:shadow-sm hover:-translate-y-px",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface GalleryCardActionsMenuProps {
  actions: GalleryCardAction[];
  title: string;
}

/**
 * Action menu trigger + popup. Mounted in a wrapper that stops both pointer
 * down and click events so the surrounding link / button never fires when the
 * user opens the menu or selects an item.
 */
function GalleryCardActionsMenu({ actions, title }: GalleryCardActionsMenuProps) {
  const stop = React.useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <div onClickCapture={stop} onPointerDownCapture={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Actions for ${title}`}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-md",
                "text-muted-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          }
        />
        <DropdownMenuContent align="end" sideOffset={6}>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={(event) => {
                event.stopPropagation();
                action.onSelect();
              }}
              className={cn(
                action.destructive &&
                  "text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive",
              )}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface GalleryCardBodyProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconTone: GalleryCardIconTone;
  badge?: GalleryCardBadge;
  pinned?: boolean;
  metadata?: GalleryCardMetadata;
  actions?: GalleryCardAction[];
}

/**
 * Inner card body — does not include the outer interactive wrapper. Pure
 * presentation, identical regardless of whether the card is link, button or
 * div on the outside.
 */
function GalleryCardBody({
  title,
  description,
  icon,
  iconTone,
  badge,
  pinned,
  metadata,
  actions,
}: GalleryCardBodyProps) {
  const hasActions = Boolean(actions && actions.length > 0);
  const hasMetadataStrip = Boolean(metadata?.author || metadata?.metric || metadata?.trailing);

  return (
    <>
      {/* Top row: icon + (pin, actions) */}
      <div className="mb-3 flex items-start justify-between gap-2">
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base",
              iconToneStyles[iconTone],
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        ) : (
          <span className="h-10 w-10 shrink-0" aria-hidden="true" />
        )}

        {(pinned || hasActions) && (
          <div className="flex items-center gap-1">
            {pinned && (
              <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-label="Pinned" />
            )}
            {hasActions && actions ? (
              <GalleryCardActionsMenu actions={actions} title={title} />
            ) : null}
          </div>
        )}
      </div>

      {/* Title + optional inline badge */}
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="line-clamp-1 text-[15px] font-semibold leading-tight">{title}</h3>
        {badge && (
          <Badge variant={badgeToneToVariant[badge.tone]} size="sm">
            {badge.label}
          </Badge>
        )}
      </div>

      {/* Description (always reserves space so cards align in a grid) */}
      <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {description ?? " "}
      </p>

      {/* Metadata strip */}
      {hasMetadataStrip && (
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="truncate">{metadata?.author ?? ""}</span>
          <span className="flex items-center gap-2">
            {metadata?.metric && <span className="tabular-nums">{metadata.metric}</span>}
            {metadata?.trailing}
          </span>
        </div>
      )}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export function GalleryCard(props: GalleryCardProps): React.ReactElement {
  const {
    title,
    description,
    icon,
    iconTone = "neutral",
    badge,
    pinned,
    metadata,
    actions,
    onClick,
    href,
    renderLink,
    className,
  } = props;

  const body = (
    <GalleryCardBody
      title={title}
      description={description}
      icon={icon}
      iconTone={iconTone}
      badge={badge}
      pinned={pinned}
      metadata={metadata}
      actions={actions}
    />
  );

  const composedClassName = cn(cardClassName, "cursor-pointer", className);

  // 1. Link variant (preferred for navigation — accessible, right-clickable)
  if (href) {
    if (renderLink) {
      return renderLink({
        href,
        className: composedClassName,
        "aria-label": title,
        children: body,
      });
    }
    return (
      <a href={href} aria-label={title} className={composedClassName} onClick={onClick}>
        {body}
      </a>
    );
  }

  // 2. Button variant — full-card click without navigation
  if (onClick) {
    return (
      <button type="button" aria-label={title} className={composedClassName} onClick={onClick}>
        {body}
      </button>
    );
  }

  // 3. Static variant — no interaction; keep hover affordance off
  return <div className={cn(cardClassName, "cursor-default", className)}>{body}</div>;
}

GalleryCard.displayName = "GalleryCard";
