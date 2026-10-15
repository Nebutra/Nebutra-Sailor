import type React from "react";
import { cn } from "../utils";

export interface SettingsSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Section title. */
  title?: React.ReactNode;
  /** One or two sentences under the title. */
  description?: React.ReactNode;
  /** Status chip or link shown at the title row's end (e.g. "Credential attached"). */
  badge?: React.ReactNode;
  /** `danger` marks destructive settings: title and footer take the destructive tone. */
  tone?: "default" | "danger";
  children?: React.ReactNode;
}

/**
 * SettingsSection — one settings group on a settings page, the way Vercel and
 * Linear lay them out: full width, separated from its neighbour by a hairline
 * rule, title and description at the top, the controls below, and an action
 * bar (`SettingsSectionFooter`) at the bottom. Not a bordered card per group.
 *
 * Put `SettingsSectionFooter` inside your `<form>` so its submit button still
 * submits it.
 *
 * @status stable
 *
 * @example
 * ```tsx
 * <SettingsSection title="Organization name" description="Shown on invoices and invites.">
 *   <form onSubmit={save}>
 *     <Input name="name" />
 *     <SettingsSectionFooter hint="Up to 48 characters.">
 *       <Button type="submit">Save</Button>
 *     </SettingsSectionFooter>
 *   </form>
 * </SettingsSection>
 * ```
 */
export function SettingsSection({
  title,
  description,
  badge,
  tone = "default",
  className,
  children,
  ...props
}: SettingsSectionProps) {
  const hasHeader = title !== undefined || description !== undefined || badge !== undefined;
  return (
    <section
      data-tone={tone}
      className={cn(
        "group/settings-section border-t border-border py-8 first:border-t-0 first:pt-0",
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {title !== undefined ? (
              <h2
                className={cn(
                  "text-base text-foreground",
                  tone === "danger" && "text-destructive-strong",
                )}
              >
                {title}
              </h2>
            ) : null}
            {description !== undefined ? (
              <p className="mt-1 max-w-2xl text-sm text-neutral-11">{description}</p>
            ) : null}
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export interface SettingsSectionFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Helper text at the bar's start — a limit, a consequence, a link to docs. */
  hint?: React.ReactNode;
  /** Actions, end-aligned. */
  children?: React.ReactNode;
}

/**
 * The action bar at the bottom of a SettingsSection: helper text on the left,
 * actions on the right, on a quiet tinted strip. In a `danger` section it
 * takes the destructive tint.
 */
export function SettingsSectionFooter({
  hint,
  className,
  children,
  ...props
}: SettingsSectionFooterProps) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-3 rounded-lg bg-muted/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        "group-data-[tone=danger]/settings-section:bg-destructive/5",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 text-sm text-neutral-11">{hint}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}
