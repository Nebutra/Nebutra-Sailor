"use client";

import { ChevronDown } from "@nebutra/icons";
import * as React from "react";
import { showMoreTokens } from "../tokens/components/show-more";
import { cn } from "../utils/cn";

type ShowMoreCssVar =
  | "--show-more-trigger-height"
  | "--show-more-trigger-padding-x"
  | "--show-more-divider-inset"
  | "--show-more-gap"
  | "--show-more-radius"
  | "--show-more-icon-size"
  | "--show-more-duration"
  | "--show-more-easing";

type ShowMoreBaseProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> & {
  /** Current disclosure state. */
  expanded: boolean;
  /** ID of the list/block whose hidden rows are controlled by the trigger. */
  controls: string;
  /** Number of rows/items hidden while collapsed. Used in the collapsed label. */
  hiddenCount?: number;
  /** Removes the divider rails while preserving the trigger affordance. */
  noBorder?: boolean;
  /** Label shown after expansion. */
  expandedLabel?: string;
  /** Label shown before expansion when `hiddenCount` is omitted. */
  collapsedLabel?: string;
  /** Focus target for the first newly revealed row. */
  focusTargetRef?: React.RefObject<HTMLElement | null>;
  /** Move focus to `focusTargetRef` after expansion. */
  focusOnExpand?: boolean;
  disabled?: boolean;
  buttonClassName?: string;
  dividerClassName?: string;
};

type ShowMoreControlledProps =
  | {
      onExpandedChange: (expanded: boolean) => void;
      /** Use `onExpandedChange`; this legacy callback shape is intentionally exclusive. */
      onClick?: never;
    }
  | {
      /** Legacy Geist-compatible callback. Prefer `onExpandedChange`. */
      onClick: (expanded: boolean) => void;
      onExpandedChange?: never;
    };

export type ShowMoreProps = ShowMoreBaseProps & ShowMoreControlledProps;

function getCollapsedLabel(hiddenCount?: number, collapsedLabel?: string) {
  if (collapsedLabel) {
    return collapsedLabel;
  }

  if (typeof hiddenCount === "number" && hiddenCount > 0) {
    return `Show ${hiddenCount} More`;
  }

  return "Show More";
}

function callExpandedChange(props: ShowMoreControlledProps, expanded: boolean) {
  const onExpandedChange = "onExpandedChange" in props ? props.onExpandedChange : undefined;

  if (typeof onExpandedChange === "function") {
    onExpandedChange(expanded);
    return;
  }

  const onClick = "onClick" in props ? props.onClick : undefined;
  onClick?.(expanded);
}

export const ShowMore = React.forwardRef<HTMLDivElement, ShowMoreProps>(
  (
    {
      expanded,
      controls,
      hiddenCount,
      noBorder = false,
      expandedLabel = "Show Less",
      collapsedLabel,
      focusTargetRef,
      focusOnExpand = true,
      disabled = false,
      className,
      buttonClassName,
      dividerClassName,
      onExpandedChange,
      onClick,
      style,
      ...props
    },
    ref,
  ) => {
    const wasExpanded = React.useRef(expanded);
    const label = expanded ? expandedLabel : getCollapsedLabel(hiddenCount, collapsedLabel);

    React.useEffect(() => {
      if (focusOnExpand && expanded && !wasExpanded.current) {
        focusTargetRef?.current?.focus();
      }

      wasExpanded.current = expanded;
    }, [expanded, focusOnExpand, focusTargetRef]);

    const cssVars = {
      "--show-more-trigger-height": `${showMoreTokens.triggerHeight}px`,
      "--show-more-trigger-padding-x": `${showMoreTokens.triggerPaddingX}px`,
      "--show-more-divider-inset": `${showMoreTokens.dividerInset}px`,
      "--show-more-gap": `${showMoreTokens.gap}px`,
      "--show-more-radius": `${showMoreTokens.radius}px`,
      "--show-more-icon-size": `${showMoreTokens.iconSize}px`,
      "--show-more-duration": `${showMoreTokens.motion.duration}ms`,
      "--show-more-easing": showMoreTokens.motion.easing,
      ...style,
    } satisfies React.CSSProperties & Record<ShowMoreCssVar, string | number>;

    const actionProps: ShowMoreControlledProps =
      typeof onExpandedChange === "function"
        ? { onExpandedChange }
        : { onClick: onClick as (expanded: boolean) => void };

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full items-center justify-center px-[var(--show-more-divider-inset)]",
          className,
        )}
        style={cssVars}
        {...props}
      >
        {!noBorder && (
          <div
            aria-hidden="true"
            className={cn("h-px flex-1 bg-[var(--neutral-7)]", dividerClassName)}
          />
        )}

        <div className="shrink-0 bg-[var(--neutral-1)] px-[var(--show-more-gap)]">
          <button
            type="button"
            aria-controls={controls}
            aria-expanded={expanded}
            disabled={disabled}
            className={cn(
              "inline-flex items-center justify-center gap-1 whitespace-nowrap border border-[var(--neutral-7)] bg-[var(--neutral-1)] text-[var(--neutral-12)] font-medium text-sm",
              "h-[var(--show-more-trigger-height)] rounded-[var(--show-more-radius)] px-[var(--show-more-trigger-padding-x)]",
              "transition-[background-color,border-color,color] duration-[var(--show-more-duration)] ease-[var(--show-more-easing)]",
              "hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--neutral-1)]",
              "disabled:pointer-events-none disabled:opacity-50",
              "motion-reduce:transition-none",
              buttonClassName,
            )}
            onClick={() => callExpandedChange(actionProps, !expanded)}
          >
            {label}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-[var(--show-more-icon-size)] transition-transform duration-[var(--show-more-duration)] ease-[var(--show-more-easing)] motion-reduce:transition-none",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>

        {!noBorder && (
          <div
            aria-hidden="true"
            className={cn("h-px flex-1 bg-[var(--neutral-7)]", dividerClassName)}
          />
        )}
      </div>
    );
  },
);
ShowMore.displayName = "ShowMore";
