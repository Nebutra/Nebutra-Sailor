"use client";

import * as React from "react";
import { emptyStateTokens } from "../tokens/components/empty-state";
import { cn } from "../utils/cn";

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
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Preferred CTA slot. Use real Button/Link elements. */
  children?: React.ReactNode;
  /** Compatibility alias for the primary CTA. Prefer children for new code. */
  action?: React.ReactNode;
  /** Compatibility alias for the secondary CTA. Prefer children for new code. */
  link?: React.ReactNode;
  variant?: EmptyStateVariant;
  size?: EmptyStateSize;
  align?: EmptyStateAlign;
  /** Use for empty states that appear after async filtering changes. */
  live?: boolean;
}

export interface EmptyStateIconProps extends React.HTMLAttributes<HTMLDivElement> {
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
  error: "text-destructive",
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

const EmptyStateIcon = React.forwardRef<HTMLDivElement, EmptyStateIconProps>(
  ({ className, icon, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "flex size-[var(--empty-state-icon-size)] shrink-0 items-center justify-center rounded-[var(--empty-state-icon-radius)] bg-muted",
        className,
      )}
      {...props}
    >
      {icon}
    </div>
  ),
);
EmptyStateIcon.displayName = "EmptyState.Icon";

const EmptyStateRoot = React.forwardRef<HTMLElement, EmptyStateRootProps>(
  (
    {
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
      ...props
    },
    ref,
  ) => {
    const actions = children ?? [action, link].filter(Boolean);
    const hasActions = React.Children.toArray(actions).length > 0;

    return (
      <section
        ref={ref}
        aria-live={live ? "polite" : undefined}
        className={cn(
          "flex min-h-[var(--empty-state-min-height)] w-full flex-col justify-center rounded-[var(--empty-state-radius)] px-[var(--empty-state-padding-x)] py-[var(--empty-state-padding-y)]",
          variantClassName[variant],
          align === "center" ? "items-center text-center" : "items-start text-left",
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
          {icon ? (
            <div className={cn("[&>div]:bg-muted", iconToneClassName[variant])}>{icon}</div>
          ) : null}

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
  },
);
EmptyStateRoot.displayName = "EmptyState.Root";

export const EmptyState = {
  Root: EmptyStateRoot,
  Icon: EmptyStateIcon,
} as const;

export { EmptyStateIcon, EmptyStateRoot };
