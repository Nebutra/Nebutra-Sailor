"use client";

import { CheckCircle, type IconProps, Information, Warning as WarningIcon } from "@nebutra/icons";
import type * as React from "react";
import { type NoteSize, type NoteTone, noteTokens } from "../tokens/components";
import { cn } from "../utils/cn";

type NoteToneProps =
  | {
      /** Semantic tone. Prefer this over the Geist-compatible `type` alias. */
      tone?: NoteTone;
      type?: never;
    }
  | {
      /** Geist-compatible alias for `tone`; do not pass both. */
      type?: NoteTone;
      tone?: never;
    };

type NoteCssVariable =
  | "--note-bg"
  | "--note-border"
  | "--note-fg"
  | "--note-label"
  | "--note-icon"
  | "--note-link"
  | "--note-radius"
  | "--note-min-height"
  | "--note-px"
  | "--note-py"
  | "--note-gap"
  | "--note-icon-size"
  | "--note-font-size"
  | "--note-line-height"
  | "--note-label-font-weight"
  | "--note-motion-duration"
  | "--note-motion-easing";

type NoteStyle = React.CSSProperties & Record<NoteCssVariable, string | number>;

type NoteIconComponent = React.ComponentType<IconProps>;

export interface NoteBaseProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "role"> {
  /** Inline contextual message body. Keep it to one sentence when possible. */
  children: React.ReactNode;
  /** @default "medium" */
  size?: NoteSize;
  /** Filled variants use a stronger background, not a new semantic meaning. */
  fill?: boolean;
  /** Prefix label. Pass `false` for icon-only tone, or a short Title Case label. */
  label?: string | false;
  /** Optional single inline action. Disabled notes make this subtree inert. */
  action?: React.ReactNode;
  /** Custom leading icon. Pass `false` to remove the default tone icon. */
  icon?: React.ReactNode | false;
  /** Disabled notes communicate unavailable contextual information. */
  disabled?: boolean;
  /** `error` defaults to alert; every other tone defaults to note. */
  role?: "note" | "alert" | "status";
  ref?: React.Ref<HTMLDivElement>;
}

export type NoteProps = NoteBaseProps & NoteToneProps;

const defaultLabels = {
  default: false,
  secondary: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
  cyan: "Signal",
} as const satisfies Record<NoteTone, string | false>;

const toneIcons = {
  default: Information,
  secondary: Information,
  success: CheckCircle,
  warning: WarningIcon,
  error: WarningIcon,
  cyan: Information,
} as const satisfies Record<NoteTone, NoteIconComponent>;

function resolveTone(tone?: NoteTone, type?: NoteTone): NoteTone {
  return tone ?? type ?? "default";
}

function resolveLabel(label: NoteProps["label"], tone: NoteTone): string | false {
  return label === undefined ? defaultLabels[tone] : label;
}

function getNoteStyle(size: NoteSize, tone: NoteTone, fill: boolean): NoteStyle {
  const sizeTokens = noteTokens.size[size];
  const toneTokens = noteTokens.tone[tone];

  return {
    "--note-bg": fill ? toneTokens.filledBackground : toneTokens.background,
    "--note-border": toneTokens.border,
    "--note-fg": toneTokens.foreground,
    "--note-label": toneTokens.label,
    "--note-icon": toneTokens.icon,
    "--note-link": toneTokens.link,
    "--note-radius": `${noteTokens.radius}px`,
    "--note-min-height": `${sizeTokens.minHeight}px`,
    "--note-px": `${sizeTokens.paddingX}px`,
    "--note-py": `${sizeTokens.paddingY}px`,
    "--note-gap": `${sizeTokens.gap}px`,
    "--note-icon-size": `${sizeTokens.iconSize}px`,
    "--note-font-size": `${sizeTokens.fontSize}px`,
    "--note-line-height": `${sizeTokens.lineHeight}px`,
    "--note-label-font-weight": noteTokens.label.fontWeight,
    "--note-motion-duration": `${noteTokens.motion.duration}ms`,
    "--note-motion-easing": noteTokens.motion.easing,
  };
}

export function Note({
  action,
  children,
  className,
  disabled = false,
  fill = false,
  icon,
  label,
  ref,
  role,
  size = "medium",
  style,
  tone,
  type,
  ...props
}: NoteProps) {
  const resolvedTone = resolveTone(tone, type);
  const Label = resolveLabel(label, resolvedTone);
  const Icon = toneIcons[resolvedTone];
  const resolvedRole = role ?? (resolvedTone === "error" ? "alert" : "note");

  return (
    <div
      {...props}
      ref={ref}
      role={resolvedRole}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-fill={fill || undefined}
      data-size={size}
      data-slot="note"
      data-tone={resolvedTone}
      style={{ ...getNoteStyle(size, resolvedTone, fill), ...style }}
      className={cn(
        "flex min-h-[var(--note-min-height)] w-full items-start gap-[var(--note-gap)] rounded-[var(--note-radius)] border border-[color:var(--note-border)] bg-[var(--note-bg)] px-[var(--note-px)] py-[var(--note-py)] font-sans text-[length:var(--note-font-size)] leading-[var(--note-line-height)] text-[color:var(--note-fg)] transition-[background-color,border-color,color,opacity] duration-[var(--note-motion-duration)] ease-[var(--note-motion-easing)]",
        "[&_a]:font-medium [&_a]:text-[color:var(--note-link)] [&_a]:underline [&_a]:underline-offset-4",
        "data-[disabled=true]:opacity-60",
        className,
      )}
    >
      {icon !== false && (
        <span
          aria-hidden="true"
          data-slot="note-icon"
          className="mt-[calc((var(--note-line-height)-var(--note-icon-size))/2)] flex size-[var(--note-icon-size)] shrink-0 items-center justify-center text-[color:var(--note-icon)]"
        >
          {icon ?? <Icon size="var(--note-icon-size)" />}
        </span>
      )}

      <div data-slot="note-copy" className="min-w-0 flex-1">
        {Label && (
          <span
            data-slot="note-label"
            className="mr-1.5 inline font-[var(--note-label-font-weight)] text-[color:var(--note-label)]"
          >
            {Label}:
          </span>
        )}
        <span data-slot="note-content">{children}</span>
      </div>

      {action && (
        <div
          data-slot="note-action"
          inert={disabled || undefined}
          className="ml-auto shrink-0 self-start data-[disabled=true]:pointer-events-none"
          data-disabled={disabled || undefined}
        >
          {action}
        </div>
      )}
    </div>
  );
}
