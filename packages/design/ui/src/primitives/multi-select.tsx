"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import { Check, ChevronDown } from "@nebutra/icons";
import * as React from "react";
import { type MultiSelectWidth, multiSelectTokens } from "../tokens/components/multi-select";
import { cn } from "../utils/cn";

type MultiSelectCssVar =
  | "--multi-select-width"
  | "--multi-select-trigger-height"
  | "--multi-select-trigger-padding-x"
  | "--multi-select-trigger-gap"
  | "--multi-select-trigger-radius"
  | "--multi-select-trigger-font-size"
  | "--multi-select-trigger-icon-size"
  | "--multi-select-content-padding"
  | "--multi-select-content-radius"
  | "--multi-select-content-max-height"
  | "--multi-select-row-min-height"
  | "--multi-select-row-padding-x"
  | "--multi-select-row-padding-y"
  | "--multi-select-row-gap"
  | "--multi-select-row-radius"
  | "--multi-select-row-font-size"
  | "--multi-select-row-description-size"
  | "--multi-select-checkbox-size"
  | "--multi-select-checkbox-icon-size"
  | "--multi-select-action-min-width"
  | "--multi-select-duration"
  | "--multi-select-popover-duration"
  | "--multi-select-easing";

type MultiSelectCssVars = React.CSSProperties & Record<MultiSelectCssVar, string>;

type MultiSelectContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
};

const MultiSelectContext = React.createContext<MultiSelectContextValue | null>(null);

const ROW_SELECTOR = "[data-multi-select-row]";
const CHECKBOX_SELECTOR = "[data-multi-select-checkbox]";
const ACTION_SELECTOR = "[data-multi-select-action]";
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useMultiSelectContext(component: string) {
  const context = React.useContext(MultiSelectContext);
  if (!context) {
    throw new Error(`${component} must be used inside MultiSelectRoot.`);
  }
  return context;
}

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

function createMultiSelectCssVars(width: MultiSelectWidth): MultiSelectCssVars {
  return {
    "--multi-select-width": `${multiSelectTokens.width[width]}px`,
    "--multi-select-trigger-height": `${multiSelectTokens.trigger.height}px`,
    "--multi-select-trigger-padding-x": `${multiSelectTokens.trigger.paddingX}px`,
    "--multi-select-trigger-gap": `${multiSelectTokens.trigger.gap}px`,
    "--multi-select-trigger-radius": `${multiSelectTokens.trigger.radius}px`,
    "--multi-select-trigger-font-size": `${multiSelectTokens.trigger.fontSize}px`,
    "--multi-select-trigger-icon-size": `${multiSelectTokens.trigger.iconSize}px`,
    "--multi-select-content-padding": `${multiSelectTokens.content.padding}px`,
    "--multi-select-content-radius": `${multiSelectTokens.content.radius}px`,
    "--multi-select-content-max-height": `${multiSelectTokens.content.maxHeight}px`,
    "--multi-select-row-min-height": `${multiSelectTokens.row.minHeight}px`,
    "--multi-select-row-padding-x": `${multiSelectTokens.row.paddingX}px`,
    "--multi-select-row-padding-y": `${multiSelectTokens.row.paddingY}px`,
    "--multi-select-row-gap": `${multiSelectTokens.row.gap}px`,
    "--multi-select-row-radius": `${multiSelectTokens.row.radius}px`,
    "--multi-select-row-font-size": `${multiSelectTokens.row.fontSize}px`,
    "--multi-select-row-description-size": `${multiSelectTokens.row.descriptionSize}px`,
    "--multi-select-checkbox-size": `${multiSelectTokens.row.checkboxSize}px`,
    "--multi-select-checkbox-icon-size": `${multiSelectTokens.row.checkboxIconSize}px`,
    "--multi-select-action-min-width": `${multiSelectTokens.row.actionMinWidth}px`,
    "--multi-select-duration": `${multiSelectTokens.motion.duration}ms`,
    "--multi-select-popover-duration": `${multiSelectTokens.motion.popoverDuration}ms`,
    "--multi-select-easing": multiSelectTokens.motion.easing,
  };
}

function getRows(content: HTMLDivElement | null): HTMLElement[] {
  if (!content) return [];
  return Array.from(content.querySelectorAll<HTMLElement>(ROW_SELECTOR));
}

function getFocusableElements(content: HTMLDivElement | null): HTMLElement[] {
  if (!content) return [];
  return Array.from(content.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

function getControl(row: HTMLElement, part: "checkbox" | "action"): HTMLElement | null {
  const selector = part === "checkbox" ? CHECKBOX_SELECTOR : ACTION_SELECTOR;
  return row.querySelector<HTMLElement>(selector);
}

function getActiveRow(rows: readonly HTMLElement[]): HTMLElement | null {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return null;
  return rows.find((row) => row.contains(activeElement)) ?? null;
}

function getActivePart(row: HTMLElement | null): "checkbox" | "action" {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement) || !row) return "checkbox";
  const action = getControl(row, "action");
  return action?.contains(activeElement) ? "action" : "checkbox";
}

function focusRowControl(row: HTMLElement | undefined, part: "checkbox" | "action") {
  if (!row) return;
  const preferred = getControl(row, part);
  const fallback = getControl(row, part === "checkbox" ? "action" : "checkbox");
  (preferred ?? fallback)?.focus();
}

function focusFirstRow(content: HTMLDivElement | null) {
  const [firstRow] = getRows(content);
  if (firstRow) {
    focusRowControl(firstRow, "checkbox");
    return;
  }
  getFocusableElements(content)[0]?.focus();
}

type MultiSelectSmartActionInput = {
  checked: boolean;
  selectedCount: number;
  totalCount: number;
  onChange: () => void;
  onSelectOnly?: (() => void) | undefined;
  onSelectAll?: (() => void) | undefined;
  selectLabel?: string | undefined;
  deselectLabel?: string | undefined;
  selectOnlyLabel?: string | undefined;
  selectAllLabel?: string | undefined;
};

function getSmartAction({
  checked,
  selectedCount,
  totalCount,
  onChange,
  onSelectOnly,
  onSelectAll,
  selectLabel,
  deselectLabel,
  selectOnlyLabel,
  selectAllLabel,
}: MultiSelectSmartActionInput) {
  if (checked && selectedCount > 1 && onSelectOnly) {
    return { label: selectOnlyLabel ?? "Select Only", handler: onSelectOnly };
  }
  if (!checked && selectedCount === totalCount - 1 && totalCount > 1 && onSelectAll) {
    return { label: selectAllLabel ?? "Select All", handler: onSelectAll };
  }
  return {
    label: checked ? (deselectLabel ?? "Deselect") : (selectLabel ?? "Select"),
    handler: onChange,
  };
}

export interface MultiSelectRootProps {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MultiSelectRoot({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
}: MultiSelectRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const isControlled = open !== undefined;
  const resolvedOpen = open ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const contextValue = React.useMemo<MultiSelectContextValue>(
    () => ({ open: resolvedOpen, setOpen, triggerRef, contentRef }),
    [resolvedOpen, setOpen],
  );

  return (
    <MultiSelectContext.Provider value={contextValue}>
      <BasePopover.Root open={resolvedOpen} onOpenChange={setOpen}>
        <div className="relative inline-flex">{children}</div>
      </BasePopover.Root>
    </MultiSelectContext.Provider>
  );
}

export interface MultiSelectTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BasePopover.Trigger>, "children"> {
  children: React.ReactNode;
  width?: MultiSelectWidth;
}

export const MultiSelectTrigger = React.forwardRef<HTMLButtonElement, MultiSelectTriggerProps>(
  ({ children, className, style, width = "md", "aria-label": ariaLabel, ...props }, ref) => {
    const { open, triggerRef } = useMultiSelectContext("MultiSelectTrigger");
    const cssVars = createMultiSelectCssVars(width);
    const accessibleName = ariaLabel ?? (typeof children === "string" ? children : "Multi select");

    return (
      <BasePopover.Trigger
        ref={composeRefs(triggerRef, ref)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={accessibleName}
        className={cn(
          "inline-flex h-[var(--multi-select-trigger-height)] w-[var(--multi-select-width)] items-center justify-between",
          "gap-[var(--multi-select-trigger-gap)] rounded-[var(--multi-select-trigger-radius)] border border-input bg-background",
          "px-[var(--multi-select-trigger-padding-x)] text-left text-[length:var(--multi-select-trigger-font-size)] text-foreground shadow-[var(--shadow-xs)]",
          "transition-[background-color,border-color,box-shadow,color] duration-[var(--multi-select-duration)] ease-[var(--multi-select-easing)]",
          "hover:bg-accent/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        style={{ ...cssVars, ...style }}
        {...props}
      >
        <span className="min-w-0 truncate">{children}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-[var(--multi-select-trigger-icon-size)] shrink-0 text-muted-foreground",
            "transition-transform duration-[var(--multi-select-duration)] ease-[var(--multi-select-easing)]",
            open && "rotate-180",
          )}
        />
      </BasePopover.Trigger>
    );
  },
);
MultiSelectTrigger.displayName = "MultiSelectTrigger";

export interface MultiSelectContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BasePopover.Popup>, "children"> {
  children: React.ReactNode;
  align?: React.ComponentProps<typeof BasePopover.Positioner>["align"];
  side?: React.ComponentProps<typeof BasePopover.Positioner>["side"];
  sideOffset?: React.ComponentProps<typeof BasePopover.Positioner>["sideOffset"];
  alignOffset?: React.ComponentProps<typeof BasePopover.Positioner>["alignOffset"];
  width?: MultiSelectWidth;
}

export const MultiSelectContent = React.forwardRef<HTMLDivElement, MultiSelectContentProps>(
  (
    {
      children,
      className,
      style,
      align = "start",
      side = "bottom",
      sideOffset = 6,
      alignOffset = 0,
      width = "md",
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const { open, setOpen, triggerRef, contentRef } = useMultiSelectContext("MultiSelectContent");
    const cssVars = createMultiSelectCssVars(width);

    React.useEffect(() => {
      if (!open) return;
      const frame = window.requestAnimationFrame(() => focusFirstRow(contentRef.current));
      return () => window.cancelAnimationFrame(frame);
    }, [contentRef, open]);

    return (
      <BasePopover.Portal>
        <BasePopover.Positioner
          align={align}
          alignOffset={alignOffset}
          className="z-50"
          side={side}
          sideOffset={sideOffset}
        >
          <BasePopover.Popup
            ref={composeRefs(contentRef, ref)}
            role="dialog"
            aria-label="Multi select options"
            className={cn(
              "z-50 max-h-[var(--multi-select-content-max-height)] w-[var(--multi-select-width)] overflow-y-auto",
              "rounded-[var(--multi-select-content-radius)] border border-border bg-popover p-[var(--multi-select-content-padding)] text-popover-foreground shadow-md outline-none",
              "transition-[opacity,transform,display] duration-[var(--multi-select-popover-duration)] ease-[var(--multi-select-easing)]",
              "data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:translate-y-1 data-ending-style:opacity-0",
              "motion-reduce:transition-none motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-y-0",
              className,
            )}
            style={{ ...cssVars, ...style }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              if (event.defaultPrevented) return;

              const rows = getRows(contentRef.current);
              const activeRow = getActiveRow(rows);
              const activePart = getActivePart(activeRow);

              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
                return;
              }

              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const currentIndex = activeRow ? rows.indexOf(activeRow) : -1;
                const nextIndex =
                  event.key === "ArrowDown"
                    ? Math.min(rows.length - 1, currentIndex + 1)
                    : Math.max(0, currentIndex - 1);
                focusRowControl(rows[nextIndex] ?? rows[0], activePart);
                return;
              }

              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                focusRowControl(
                  activeRow ?? rows[0],
                  event.key === "ArrowLeft" ? "checkbox" : "action",
                );
                return;
              }

              if (event.key === "Tab") {
                const focusables = getFocusableElements(contentRef.current);
                if (focusables.length === 0) return;
                const activeElement = document.activeElement;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (!(activeElement instanceof HTMLElement)) {
                  event.preventDefault();
                  first?.focus();
                  return;
                }
                if (event.shiftKey && activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
            {...props}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    );
  },
);
MultiSelectContent.displayName = "MultiSelectContent";

export interface MultiSelectRowProps
  extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "disabled" | "onChange"> {
  name: string;
  checked: boolean;
  onChange: () => void;
  selectedCount: number;
  totalCount: number;
  description?: React.ReactNode;
  count?: number;
  disabled?: boolean;
  onSelectOnly?: () => void;
  onSelectAll?: () => void;
  selectLabel?: string;
  deselectLabel?: string;
  selectOnlyLabel?: string;
  selectAllLabel?: string;
}

export const MultiSelectRow = React.forwardRef<HTMLFieldSetElement, MultiSelectRowProps>(
  (
    {
      name,
      checked,
      onChange,
      selectedCount,
      totalCount,
      description,
      count,
      disabled = false,
      onSelectOnly,
      onSelectAll,
      selectLabel,
      deselectLabel,
      selectOnlyLabel,
      selectAllLabel,
      className,
      ...props
    },
    ref,
  ) => {
    const action = getSmartAction({
      checked,
      selectedCount,
      totalCount,
      onChange,
      onSelectOnly,
      onSelectAll,
      selectLabel,
      deselectLabel,
      selectOnlyLabel,
      selectAllLabel,
    });

    return (
      <fieldset
        ref={ref}
        aria-label={name}
        data-multi-select-row=""
        data-state={checked ? "checked" : "unchecked"}
        disabled={disabled}
        className={cn(
          "group m-0 flex min-h-[var(--multi-select-row-min-height)] w-full min-w-0 items-center gap-[var(--multi-select-row-gap)] rounded-[var(--multi-select-row-radius)] border-0",
          "px-[var(--multi-select-row-padding-x)] py-[var(--multi-select-row-padding-y)] text-[length:var(--multi-select-row-font-size)]",
          "transition-colors duration-[var(--multi-select-duration)] ease-[var(--multi-select-easing)]",
          "hover:bg-accent focus-within:bg-accent",
          disabled && "opacity-50",
          className,
        )}
        {...props}
      >
        <span className="relative inline-flex size-[var(--multi-select-checkbox-size)] shrink-0 items-center justify-center">
          <input
            type="checkbox"
            aria-label={`Select ${name}`}
            data-multi-select-checkbox=""
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onChange();
              }
            }}
            className={cn(
              "peer size-[var(--multi-select-checkbox-size)] appearance-none rounded-[var(--radius-sm)] border border-input bg-background",
              "transition-[background-color,border-color,box-shadow] duration-[var(--multi-select-duration)] ease-[var(--multi-select-easing)]",
              "hover:border-ring checked:border-primary checked:bg-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          />
          <Check
            aria-hidden="true"
            className="pointer-events-none absolute size-[var(--multi-select-checkbox-icon-size)] text-primary-foreground opacity-0 transition-opacity duration-[var(--multi-select-duration)] peer-checked:opacity-100"
            strokeWidth={2.25}
          />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
            {typeof count === "number" && (
              <span className="shrink-0 text-[length:var(--multi-select-row-description-size)] text-muted-foreground">
                {count}
              </span>
            )}
          </div>
          {description && (
            <div className="truncate text-[length:var(--multi-select-row-description-size)] text-muted-foreground">
              {description}
            </div>
          )}
        </div>

        <button
          type="button"
          data-multi-select-action=""
          disabled={disabled}
          onClick={action.handler}
          className={cn(
            "min-w-[var(--multi-select-action-min-width)] shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-right text-[length:var(--multi-select-row-description-size)] font-medium text-muted-foreground",
            "opacity-0 transition-[background-color,color,opacity] duration-[var(--multi-select-duration)] ease-[var(--multi-select-easing)]",
            "hover:bg-background hover:text-foreground focus-visible:bg-background focus-visible:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          {action.label}
        </button>
      </fieldset>
    );
  },
);
MultiSelectRow.displayName = "MultiSelectRow";
