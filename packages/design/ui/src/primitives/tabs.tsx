"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import {
  type ControlStep,
  controlFontSize,
  controlHeight,
} from "../tokens/components/control-ladder";
import { type TabsSize, tabsSizes, tabsTokens } from "../tokens/components/tabs";
import { cn } from "../utils";
import { BaseDirectionScope, mergeRefs, useResolvedDirection } from "../utils/direction";
import { asPlainStyle, withHtmlProps } from "../utils/primitive-props";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

type BaseTabsRootChangeDetails = {
  activationDirection: "left" | "right" | "up" | "down" | "none";
};

const BaseRoot = withHtmlProps<
  "div",
  {
    defaultValue?: string | null | undefined;
    onValueChange?: ((value: string, eventDetails: BaseTabsRootChangeDetails) => void) | undefined;
    orientation?: "horizontal" | "vertical" | undefined;
    value?: string | null | undefined;
  }
>(BaseTabs.Root);
const BaseList = withHtmlProps<
  "div",
  {
    activateOnFocus?: boolean | undefined;
    loopFocus?: boolean | undefined;
  }
>(BaseTabs.List);
const BaseTrigger = withHtmlProps<
  "button",
  {
    value: string;
  }
>(BaseTabs.Tab);
const BaseContent = withHtmlProps<
  "div",
  {
    keepMounted?: boolean | undefined;
    value: string;
  }
>(BaseTabs.Panel);
const BaseIndicator = withHtmlProps<"span">(BaseTabs.Indicator);

/** Visual treatment of the tab list, triggers, and active indicator. */
export type TabsVariant = "default" | "button" | "line" | "secondary";
/** Corner treatment of the list and its triggers. */
export type TabsShape = "default" | "pill";
/** Whether moving keyboard focus also selects the focused tab. */
export type TabsActivationMode = "automatic" | "manual";

type TabsCssVar =
  | "--tabs-height"
  | "--tabs-padding"
  | "--tabs-gap"
  | "--tabs-trigger-gap"
  | "--tabs-trigger-padding-x"
  | "--tabs-trigger-min-width"
  | "--tabs-icon-size"
  | "--tabs-font-size"
  | "--tabs-radius"
  | "--tabs-trigger-radius"
  | "--tabs-pill-radius"
  | "--tabs-line-thickness"
  | "--tabs-focus-ring-width"
  | "--tabs-focus-ring-offset"
  | "--tabs-panel-gap"
  | "--tabs-badge-height"
  | "--tabs-badge-padding-x"
  | "--tabs-badge-font-size"
  | "--tabs-duration"
  | "--tabs-easing";

type TabsCssVars = React.CSSProperties & Record<TabsCssVar, string>;

const tabsListVariants = cva(
  "relative z-0 inline-flex max-w-full shrink-0 items-center overflow-x-auto overscroll-x-contain scrollbar-none",
  {
    variants: {
      variant: {
        default:
          "gap-[var(--tabs-gap)] rounded-[var(--tabs-radius)] bg-muted p-[var(--tabs-padding)] text-muted-foreground",
        button: "gap-[var(--tabs-gap)] text-muted-foreground",
        line: "gap-[calc(var(--tabs-gap)*3)] border-b border-border text-muted-foreground",
        secondary:
          "gap-[var(--tabs-gap)] rounded-[var(--tabs-radius)] bg-transparent text-muted-foreground",
      },
      shape: {
        default: "",
        pill: "[&_[role=tab]]:rounded-[var(--tabs-pill-radius)]",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        shape: "pill",
        className: "rounded-[var(--tabs-pill-radius)]",
      },
      {
        variant: "button",
        shape: "pill",
        className: "[&_[role=tab]]:rounded-[var(--tabs-pill-radius)]",
      },
      {
        variant: "secondary",
        shape: "pill",
        className: "rounded-[var(--tabs-pill-radius)]",
      },
    ],
    defaultVariants: {
      shape: "default",
      variant: "default",
    },
  },
);

const tabsTriggerVariants = cva(
  "relative inline-flex h-[calc(var(--tabs-height)-var(--tabs-padding)*2)] min-w-[var(--tabs-trigger-min-width)] shrink-0 cursor-pointer items-center justify-center gap-[var(--tabs-trigger-gap)] whitespace-nowrap rounded-[var(--tabs-trigger-radius)] px-[var(--tabs-trigger-padding-x)] font-medium text-[length:var(--tabs-font-size)] outline-none transition-[background-color,border-color,box-shadow,color,opacity] duration-[var(--tabs-duration)] ease-[var(--tabs-easing)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:size-[var(--tabs-icon-size)] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:text-foreground data-[active]:text-foreground",
        button:
          "bg-background text-muted-foreground shadow-xs ring-1 ring-inset ring-[var(--edge-soft)] hover:text-foreground hover:ring-[var(--edge-medium)] data-[active]:text-foreground data-[active]:ring-[var(--edge-medium)]",
        line: "min-w-0 rounded-none px-0 hover:text-foreground data-[active]:text-foreground",
        secondary:
          "hover:bg-muted hover:text-foreground data-[active]:bg-muted data-[active]:text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const tabsIndicatorVariants = cva(
  "pointer-events-none absolute transition-[left,top,width,height,bottom,background-color] duration-[var(--tabs-duration)] ease-[var(--tabs-easing)] motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "z-[-1] rounded-[var(--tabs-trigger-radius)] bg-background shadow-xs",
        button: "z-[-1] rounded-[var(--tabs-trigger-radius)] bg-muted",
        line: "bottom-0 h-[var(--tabs-line-thickness)] rounded-[var(--tabs-pill-radius)] bg-foreground",
        secondary: "z-[-1] rounded-[var(--tabs-trigger-radius)] bg-muted",
      },
      shape: {
        default: "",
        pill: "rounded-[var(--tabs-pill-radius)]",
      },
    },
    defaultVariants: {
      shape: "default",
      variant: "default",
    },
  },
);

const tabsContentVariants = cva(
  "mt-[var(--tabs-panel-gap)] text-[length:var(--tabs-font-size)] text-muted-foreground focus-visible:outline-none",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TabsContextValue = {
  activationMode: TabsActivationMode;
  disabled: boolean;
  shape: TabsShape;
  size: TabsSize;
  variant: TabsVariant;
};

const TabsContext = React.createContext<TabsContextValue>({
  activationMode: "manual",
  disabled: false,
  shape: "default",
  size: "md",
  variant: "default",
});

export interface TabsItem {
  /** Supplementary content displayed after the tab title, such as a count. */
  badge?: React.ReactNode;
  /** Panel content rendered for this value; omit when panels are managed elsewhere. */
  content?: React.ReactNode;
  /** Prevents this generated tab from being selected or receiving keyboard focus. */
  disabled?: boolean;
  /** Leading visual displayed before the tab title. */
  icon?: React.ReactNode;
  /** Visible label for the generated tab trigger. */
  title: React.ReactNode;
  /** Optional hover and focus hint attached to the generated trigger's wrapper. */
  tooltip?: React.ReactNode;
  /** Unique key linking the trigger, selected value, and corresponding panel. */
  value: string;
}

export interface TabsProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange"> {
  /**
   * Selects on focus in automatic mode; manual mode requires explicit activation.
   * @default "manual"
   */
  activationMode?: TabsActivationMode;
  /** Initial uncontrolled selection; falls back to the first enabled tabs item. */
  defaultValue?: string;
  /** Disables generated tabs and supplies the default disabled state for composed triggers. */
  disabled?: boolean;
  /** Classes applied to the generated list when using the tabs array. */
  listClassName?: string;
  /** Called with the newly selected tab value. */
  onValueChange?: (value: string) => void;
  /** Orientation used by the tab root for keyboard navigation. */
  orientation?: "horizontal" | "vertical";
  /** Controlled selection alias that takes precedence over value. */
  selected?: string;
  /** Selection callback alias called alongside onValueChange. */
  setSelected?: (value: string) => void;
  /** Corner treatment shared by the list and triggers. */
  shape?: TabsShape;
  /** Control size shared by the list, triggers, icons, and typography. */
  size?: TabsSize;
  /** Items used to generate a list and any supplied panels, replacing children. */
  tabs?: readonly TabsItem[];
  /** Controlled selection, used when selected is not supplied. */
  value?: string;
  /** Visual treatment shared by the list, triggers, and active indicator. */
  variant?: TabsVariant;
  /** Composed TabsList and TabsContent elements used when tabs is omitted. */
  children?: React.ReactNode;
}

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof tabsListVariants> {
  /** Overrides the root's visual treatment for this list and its triggers. */
  variant?: VariantProps<typeof tabsListVariants>["variant"];
  /** Overrides the root's corner treatment for this list and its triggers. */
  shape?: VariantProps<typeof tabsListVariants>["shape"];
  /** Overrides activationMode: true selects a tab as it receives keyboard focus. */
  activateOnFocus?: boolean;
  /** Wraps keyboard focus from the last trigger to the first and vice versa. */
  loop?: boolean;
}

export interface TabsTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  /** Supplementary content displayed after the trigger's label. */
  badge?: React.ReactNode;
  /** Leading visual displayed before the trigger's label. */
  icon?: React.ReactNode;
  /** Selection key matching the corresponding TabsContent value. */
  value: string;
  /** Visible label for the tab. */
  children?: React.ReactNode;
}

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof tabsContentVariants> {
  /** Panel styling variant; currently only the default treatment is available. */
  variant?: VariantProps<typeof tabsContentVariants>["variant"];
  /** Keeps an inactive panel mounted when keepMounted is not supplied. */
  forceMount?: true;
  /** Keeps an inactive panel in the DOM; takes precedence over forceMount. */
  keepMounted?: boolean;
  /** Selection key matching the trigger that displays this panel. */
  value: string;
}

const TABS_STEP: Record<TabsSize, ControlStep> = { xs: "tiny", sm: "sm", md: "md", lg: "lg" };

function getTabsStyle(size: TabsSize, style: unknown): TabsCssVars {
  const token = tabsSizes[size];
  const step = TABS_STEP[size];

  return {
    // The bar is a control row: same height, type size and corner family as
    // the Button and Input beside it, under every language's density.
    "--tabs-height": controlHeight(step, token.height),
    "--tabs-padding": `${token.padding}px`,
    "--tabs-gap": `${token.gap}px`,
    "--tabs-trigger-gap": `${token.triggerGap}px`,
    "--tabs-trigger-padding-x": `${token.paddingX}px`,
    "--tabs-trigger-min-width": `${token.minWidth}px`,
    "--tabs-icon-size": `${token.iconSize}px`,
    "--tabs-font-size": controlFontSize(step, token.fontSize),
    // Concentric corners: the bar's radius is the tab's plus the inset between
    // them, so the two curves stay parallel at any language's control radius.
    "--tabs-radius": `calc(var(--radius-md, ${tabsTokens.triggerRadius}px) + ${token.padding}px)`,
    "--tabs-trigger-radius": `var(--radius-md, ${tabsTokens.triggerRadius}px)`,
    "--tabs-pill-radius": `${tabsTokens.pillRadius}px`,
    "--tabs-line-thickness": `${tabsTokens.lineThickness}px`,
    "--tabs-focus-ring-width": `${tabsTokens.focusRingWidth}px`,
    "--tabs-focus-ring-offset": `${tabsTokens.focusRingOffset}px`,
    "--tabs-panel-gap": `${tabsTokens.panelGap}px`,
    "--tabs-badge-height": `${tabsTokens.badgeHeight}px`,
    "--tabs-badge-padding-x": `${tabsTokens.badgePaddingX}px`,
    "--tabs-badge-font-size": `${tabsTokens.badgeFontSize}px`,
    "--tabs-duration": `${tabsTokens.motion.duration}ms`,
    "--tabs-easing": tabsTokens.motion.easing,
    ...asPlainStyle(style),
  };
}

function getFirstEnabledValue(tabs: readonly TabsItem[] | undefined) {
  return tabs?.find((tab) => !tab.disabled)?.value;
}

/**
 * Coordinates single-selection tabs and panels with keyboard navigation.
 * Use a tabs array for generated content or compose TabsList, TabsTrigger, and TabsContent.
 * Arrow keys follow the reading direction: under `dir="rtl"` (on the root or any ancestor) the
 * Left arrow moves to the next tab and the Right arrow to the previous one.
 */
function Tabs({
  "aria-label": ariaLabel,
  activationMode = "manual",
  className,
  defaultValue,
  disabled = false,
  listClassName,
  onValueChange,
  orientation = "horizontal",
  selected,
  setSelected,
  shape = "default",
  size = "md",
  style,
  tabs,
  value,
  variant = "default",
  children,
  ref,
  ...props
}: TabsProps & { ref?: React.Ref<HTMLDivElement> | undefined }) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = React.useMemo(() => mergeRefs(rootRef, ref), [ref]);
  // Base UI mirrors arrow keys from its DirectionProvider, not from the DOM `dir`.
  const direction = useResolvedDirection(rootRef);
  const rootValue = selected ?? value;
  const rootDefaultValue = defaultValue ?? getFirstEnabledValue(tabs);
  const context = React.useMemo<TabsContextValue>(
    () => ({ activationMode, disabled, shape, size, variant }),
    [activationMode, disabled, shape, size, variant],
  );

  function handleValueChange(nextValue: string) {
    onValueChange?.(nextValue);
    setSelected?.(nextValue);
  }

  return (
    <TabsContext.Provider value={context}>
      <BaseDirectionScope direction={direction}>
        <BaseRoot
          ref={mergedRef}
          data-slot="tabs"
          data-disabled={disabled ? "" : undefined}
          value={rootValue}
          defaultValue={rootValue === undefined ? rootDefaultValue : undefined}
          onValueChange={handleValueChange}
          orientation={orientation}
          className={cn("w-full", className)}
          style={getTabsStyle(size, style)}
          {...props}
        >
          {tabs ? (
            <TabsCollection
              tabs={tabs}
              ariaLabel={ariaLabel}
              className={listClassName}
              variant={variant}
              shape={shape}
              disabled={disabled}
            />
          ) : (
            children
          )}
        </BaseRoot>
      </BaseDirectionScope>
    </TabsContext.Provider>
  );
}

function TabsCollection({
  ariaLabel,
  tabs,
  className,
  variant,
  shape,
  disabled,
}: {
  ariaLabel?: string | undefined;
  className?: string | undefined;
  disabled: boolean;
  shape: TabsShape;
  tabs: readonly TabsItem[];
  variant: TabsVariant;
}) {
  const hasTooltip = tabs.some((tab) => tab.tooltip);
  const list = (
    <TabsList
      aria-label={ariaLabel ?? "Sections"}
      className={className}
      variant={variant}
      shape={shape}
    >
      {tabs.map((tab) => (
        <TabsCollectionTrigger key={tab.value} disabled={disabled} tab={tab} />
      ))}
    </TabsList>
  );

  return (
    <>
      {hasTooltip ? <TooltipProvider delayDuration={150}>{list}</TooltipProvider> : list}
      {tabs.map((tab) =>
        tab.content === undefined ? null : (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ),
      )}
    </>
  );
}

function TabsCollectionTrigger({ tab, disabled }: { disabled: boolean; tab: TabsItem }) {
  const trigger = (
    <TabsTrigger
      value={tab.value}
      disabled={disabled || tab.disabled}
      icon={tab.icon}
      badge={tab.badge}
    >
      {tab.title}
    </TabsTrigger>
  );

  if (!tab.tooltip) return trigger;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{trigger}</span>
      </TooltipTrigger>
      <TooltipContent>{tab.tooltip}</TooltipContent>
    </Tooltip>
  );
}

/** Groups tab triggers with an active indicator and configurable focus activation. */
function TabsList({
  activateOnFocus,
  className,
  loop = true,
  shape,
  variant,
  children,
  ...props
}: TabsListProps) {
  const context = React.use(TabsContext);
  const resolvedVariant = variant ?? context.variant;
  const resolvedShape = shape ?? context.shape;
  const resolvedActivateOnFocus = activateOnFocus ?? context.activationMode === "automatic";
  const listContext = React.useMemo<TabsContextValue>(
    () => ({ ...context, shape: resolvedShape, variant: resolvedVariant }),
    [context, resolvedShape, resolvedVariant],
  );

  return (
    <TabsContext.Provider value={listContext}>
      <BaseList
        data-slot="tabs-list"
        activateOnFocus={resolvedActivateOnFocus}
        loopFocus={loop}
        className={cn(
          tabsListVariants({ variant: resolvedVariant, shape: resolvedShape }),
          className,
        )}
        {...props}
      >
        <BaseIndicator
          aria-hidden="true"
          data-slot="tabs-indicator"
          className={tabsIndicatorVariants({ variant: resolvedVariant, shape: resolvedShape })}
          style={{
            left: "var(--active-tab-left)",
            top: resolvedVariant === "line" ? "auto" : "var(--active-tab-top)",
            bottom: resolvedVariant === "line" ? "0" : "auto",
            width: "var(--active-tab-width)",
            height:
              resolvedVariant === "line"
                ? "var(--tabs-line-thickness)"
                : "var(--active-tab-height)",
          }}
        />
        {children}
      </BaseList>
    </TabsContext.Provider>
  );
}

/** Selects the panel matching its value, with optional leading icon and trailing badge. */
function TabsTrigger({ badge, children, className, disabled, icon, ...props }: TabsTriggerProps) {
  const context = React.use(TabsContext);
  const isDisabled = disabled ?? context.disabled;

  return (
    <BaseTrigger
      data-slot="tabs-trigger"
      disabled={isDisabled}
      className={cn(tabsTriggerVariants({ variant: context.variant }), className)}
      {...props}
    >
      {icon}
      <span className="truncate">{children}</span>
      {badge ? (
        <span className="inline-flex h-[var(--tabs-badge-height)] items-center rounded-[var(--tabs-pill-radius)] bg-muted px-[var(--tabs-badge-padding-x)] text-[length:var(--tabs-badge-font-size)] text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </BaseTrigger>
  );
}

/** Displays the panel associated with the selected trigger's value. */
function TabsContent({ className, forceMount, keepMounted, variant, ...props }: TabsContentProps) {
  return (
    <BaseContent
      data-slot="tabs-content"
      keepMounted={keepMounted ?? forceMount}
      className={cn(tabsContentVariants({ variant }), className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsContentVariants,
  tabsIndicatorVariants,
  tabsListVariants,
  tabsTriggerVariants,
};
