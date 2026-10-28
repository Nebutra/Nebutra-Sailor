"use client";

import * as React from "react";
import { emptyStateTokens } from "../tokens/components/empty-state";
import { cn } from "../utils/cn";
import { GhostPreview, type GhostPreviewKind } from "./ghost-preview";

export type EmptyStateVariant =
  | "blank-slate"
  | "informational"
  | "educational"
  | "guide"
  | "no-results"
  | "cleared"
  | "permission"
  | "error";

export type EmptyStateSize = "sm" | "md" | "lg";
export type EmptyStateAlign = "center" | "start";

export interface EmptyStateRootProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "children"> {
  /** Main empty-state message rendered as an h3; explain what is missing or what to do next. */
  title: React.ReactNode;
  /** Supporting copy rendered below the heading as a paragraph. */
  description?: React.ReactNode;
  /** Visual slot above the message; hide decorative content from assistive technology. */
  icon?: React.ReactNode;
  /** Preferred CTA slot. Use real Button/Link elements. */
  children?: React.ReactNode;
  /** Compatibility alias for the primary CTA. Prefer children for new code. */
  action?: React.ReactNode;
  /** Compatibility alias for the secondary CTA. Prefer children for new code. */
  link?: React.ReactNode;
  /**
   * Chooses the surface and icon tone for the empty-state scenario.
   * @default "blank-slate"
   */
  variant?: EmptyStateVariant;
  /**
   * Sets minimum height, insets and type scale.
   * @default "md"
   */
  size?: EmptyStateSize;
  /**
   * Aligns copy, visuals and actions to the center or the start edge.
   * @default "center"
   */
  align?: EmptyStateAlign;
  /**
   * Add a polite live region for empty states appearing after asynchronous filtering.
   * @default false
   */
  live?: boolean;
}

export interface EmptyStateIconProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Decorative visual rendered inside an aria-hidden tile; include meaningful information in the title. */
  icon: React.ReactNode;
}

const variantClassName: Record<EmptyStateVariant, string> = {
  "blank-slate": "border border-dashed border-border bg-background",
  informational: "border border-border bg-card",
  educational: "border border-border bg-card",
  guide: "border border-border bg-muted/30",
  "no-results": "border border-dashed border-border bg-background",
  cleared: "border border-dashed border-border bg-muted/20",
  permission: "border border-border bg-card",
  error: "border border-destructive/25 bg-destructive/5",
};

const iconToneClassName: Record<EmptyStateVariant, string> = {
  "blank-slate": "text-muted-foreground",
  informational: "text-primary",
  educational: "text-primary",
  guide: "text-primary",
  "no-results": "text-muted-foreground",
  cleared: "text-muted-foreground",
  permission: "text-muted-foreground",
  error: "text-destructive-strong",
};

type EmptyStateCssVar =
  | "--empty-state-min-height"
  | "--empty-state-padding-x"
  | "--empty-state-padding-y"
  | "--empty-state-radius"
  | "--empty-state-content-max-width"
  | "--empty-state-description-max-width"
  | "--empty-state-stack-gap"
  | "--empty-state-copy-gap"
  | "--empty-state-actions-gap"
  | "--empty-state-icon-size"
  | "--empty-state-icon-radius"
  | "--empty-state-title-size"
  | "--empty-state-description-size"
  | "--empty-state-title-weight"
  | "--empty-state-title-line-height"
  | "--empty-state-description-line-height";

const emptyStateCssVars = (size: EmptyStateSize) =>
  ({
    "--empty-state-min-height": `${emptyStateTokens.root.minHeight[size]}px`,
    "--empty-state-padding-x": `${emptyStateTokens.root.paddingX[size]}px`,
    "--empty-state-padding-y": `${emptyStateTokens.root.paddingY[size]}px`,
    "--empty-state-radius": `${emptyStateTokens.root.radius}px`,
    "--empty-state-content-max-width": `${emptyStateTokens.content.maxWidth}px`,
    "--empty-state-description-max-width": `${emptyStateTokens.content.descriptionMaxWidth}px`,
    "--empty-state-stack-gap": `${emptyStateTokens.content.stackGap}px`,
    "--empty-state-copy-gap": `${emptyStateTokens.content.copyGap}px`,
    "--empty-state-actions-gap": `${emptyStateTokens.content.actionsGap}px`,
    "--empty-state-icon-size": `${emptyStateTokens.icon.size}px`,
    "--empty-state-icon-radius": `${emptyStateTokens.icon.radius}px`,
    "--empty-state-title-size": `${emptyStateTokens.typography.title[size]}px`,
    "--empty-state-description-size": `${emptyStateTokens.typography.description[size]}px`,
    "--empty-state-title-weight": `${emptyStateTokens.typography.titleWeight}`,
    "--empty-state-title-line-height": `${emptyStateTokens.typography.titleLineHeight}px`,
    "--empty-state-description-line-height": `${emptyStateTokens.typography.descriptionLineHeight}px`,
  }) satisfies React.CSSProperties & Record<EmptyStateCssVar, string>;

/** Decorative bordered icon tile, hidden from assistive technology. */
const EmptyStateIcon = ({
  className,
  icon,
  ref,
  ...props
}: EmptyStateIconProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn(
      // A quiet bordered glyph tile, not a filled block: the icon is a hint, not the subject.
      "flex size-10 shrink-0 items-center justify-center rounded-[var(--empty-state-icon-radius)] border border-border bg-background text-muted-foreground shadow-xs [&_svg]:size-5",
      className,
    )}
    {...props}
  >
    {icon}
  </div>
);
EmptyStateIcon.displayName = "EmptyState.Icon";

/** Composable empty-state section with a heading, supporting copy, visual and action slots. */
const EmptyStateRoot = ({
  className,
  title,
  description,
  icon,
  children,
  action,
  link,
  style,
  variant = "blank-slate",
  size = "md",
  align = "center",
  live = false,
  ref,
  ...props
}: EmptyStateRootProps & { ref?: React.Ref<HTMLElement> | undefined }) => {
  // toArray keys the legacy action/link pair — rendering the bare array warned
  // "each child in a list should have a unique key" on every EmptyState.
  const actions = children ?? React.Children.toArray([action, link].filter(Boolean));
  const hasActions = React.Children.toArray(actions).length > 0;

  return (
    <section
      ref={ref}
      aria-live={live ? "polite" : undefined}
      className={cn(
        "flex min-h-[var(--empty-state-min-height)] w-full flex-col justify-center rounded-[var(--empty-state-radius)] px-[var(--empty-state-padding-x)] py-[var(--empty-state-padding-y)]",
        variantClassName[variant],
        align === "center" ? "items-center text-center" : "items-start text-start",
        className,
      )}
      style={{ ...emptyStateCssVars(size), ...style }}
      {...props}
    >
      <div
        className={cn(
          "flex max-w-[var(--empty-state-content-max-width)] flex-col gap-[var(--empty-state-stack-gap)]",
          align === "center" ? "items-center" : "items-start",
        )}
      >
        {icon ? <div className={iconToneClassName[variant]}>{icon}</div> : null}

        <div className="space-y-[var(--empty-state-copy-gap)]">
          <h3 className="font-[var(--empty-state-title-weight)] text-[length:var(--empty-state-title-size)] leading-[var(--empty-state-title-line-height)] text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="max-w-[var(--empty-state-description-max-width)] text-[length:var(--empty-state-description-size)] leading-[var(--empty-state-description-line-height)] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {hasActions ? (
          <div
            className={cn(
              "flex flex-wrap gap-[var(--empty-state-actions-gap)]",
              align === "center" ? "justify-center" : "justify-start",
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
};
EmptyStateRoot.displayName = "EmptyState.Root";

type EmptyStateTone = "default" | "branded" | "subtle";

export interface EmptyStateProps {
  /** Main message rendered as an h3; identify the missing content or the next useful step. */
  title: string;
  /** Supporting description. */
  description?: string;
  /** Visual anchor shown above the title. */
  mascot?: React.ReactNode;
  /** Inline icon shown above the title. Ignored when `mascot` is provided. */
  icon?: React.ReactNode;
  /** Primary call-to-action node. */
  action?: React.ReactNode;
  /** Secondary call-to-action node. */
  secondaryAction?: React.ReactNode;
  /**
   * Visual tone.
   * - `default`: neutral bordered state
   * - `branded`: first-touch panel (bordered card surface; pass `mascot` for a visual)
   * - `subtle`: quieter inline state
   * Ignored when a preview supplies its own layout and surface.
   * @default "default"
   */
  tone?: EmptyStateTone;
  /**
   * Sets the root's height, padding and type scale when no preview is rendered.
   * @default "md"
   */
  size?: EmptyStateSize;
  /**
   * Show the shape of the content this surface will hold — a ghost chart,
   * table, list or metric row in hairlines — behind the message, instead of an
   * icon. Pass a kind, or your own decorative node.
   */
  preview?: GhostPreviewKind | React.ReactNode;
  /**
   * Where the preview sits. `behind` (default) fades it under a centred
   * message. `beside` gives it its own column, unmasked, with the message and
   * its one action to the right — for a product glimpse that should be seen,
   * not just hinted at (ElevenLabs' create cards). Stacks on a phone.
   * @default "behind"
   */
  previewPlacement?: "behind" | "beside";
  /** Classes applied to the outer empty-state section in either preview or icon layouts. */
  className?: string;
}

const toneVariant: Record<EmptyStateTone, EmptyStateVariant> = {
  default: "blank-slate",
  branded: "informational",
  subtle: "guide",
};

/** The simple form: props in, a composed Root out. */
function EmptyStateSimple({
  title,
  description,
  mascot,
  icon,
  action,
  secondaryAction,
  tone = "default",
  size = "md",
  preview,
  previewPlacement = "behind",
  className,
}: EmptyStateProps) {
  if (preview) {
    const ghost =
      typeof preview === "string" ? (
        <GhostPreview kind={preview as GhostPreviewKind} />
      ) : (
        <div aria-hidden="true">{preview}</div>
      );
    if (previewPlacement === "beside") {
      return (
        <section
          className={cn(
            "grid w-full items-center gap-8 overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
            className,
          )}
        >
          <div className="pointer-events-none select-none">{ghost}</div>
          <div className="flex flex-col items-start gap-1.5 text-start">
            <h3 className="text-base text-foreground">{title}</h3>
            {description ? (
              <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>
            ) : null}
            {action || secondaryAction ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {action}
                {secondaryAction}
              </div>
            ) : null}
          </div>
        </section>
      );
    }
    return (
      <section
        className={cn(
          // One grid cell holds both layers, so the panel grows with whichever is
          // taller — the message never clips on a narrow screen.
          "grid w-full overflow-hidden rounded-xl border border-border bg-card",
          className,
        )}
      >
        <div className="[grid-area:1/1] [mask-image:radial-gradient(ellipse_55%_60%_at_50%_50%,transparent_25%,black_80%)]">
          {ghost}
        </div>
        <div className="[grid-area:1/1] flex flex-col items-center justify-center gap-1.5 px-6 py-8 text-center">
          <h3 className="text-sm text-foreground">{title}</h3>
          {description ? (
            <p className="max-w-md text-balance text-sm text-muted-foreground">{description}</p>
          ) : null}
          {action || secondaryAction ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {action}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </section>
    );
  }
  const visual = mascot ?? icon ?? null;
  return (
    <EmptyStateRoot
      action={action}
      className={cn(tone === "subtle" && "border-0 bg-transparent", className)}
      description={description}
      icon={visual ? <EmptyStateIcon icon={visual} /> : undefined}
      link={secondaryAction}
      size={size}
      title={title}
      variant={toneVariant[tone]}
    />
  );
}

/**
 * Explains missing content and offers next steps through a simple prop API or composed Root and Icon.
 * Supports decorative content previews; action slots should contain named buttons or links.
 */
export const EmptyState = Object.assign(EmptyStateSimple, {
  /** Composable section with rich heading content, alignment and optional polite live announcements. */
  Root: EmptyStateRoot,
  /** Decorative icon tile hidden from assistive technology; convey its meaning in the message. */
  Icon: EmptyStateIcon,
});

export { EmptyStateIcon, EmptyStateRoot };
