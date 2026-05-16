"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { type TabsSize, tabsSizes, tabsTokens } from "../tokens/components/tabs";
import { cn } from "../utils";
import { withHtmlProps } from "../utils/primitive-props";
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

export type TabsVariant = "default" | "button" | "line" | "secondary";
export type TabsShape = "default" | "pill";
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
          "gap-[var(--tabs-gap)] rounded-[var(--tabs-radius)] border border-border bg-muted p-[var(--tabs-padding)] text-muted-foreground",
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
  "relative inline-flex h-[calc(var(--tabs-height)-var(--tabs-padding)*2)] min-w-[var(--tabs-trigger-min-width)] shrink-0 cursor-pointer items-center justify-center gap-[var(--tabs-trigger-gap)] whitespace-nowrap rounded-[var(--tabs-trigger-radius)] px-[var(--tabs-trigger-padding-x)] font-medium text-[length:var(--tabs-font-size)] outline-none transition-[background-color,border-color,box-shadow,color,opacity] duration-[var(--tabs-duration)] ease-[var(--tabs-easing)] focus-visible:ring-[length:var(--tabs-focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--tabs-focus-ring-offset)] focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 [&_svg]:size-[var(--tabs-icon-size)] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:text-foreground data-[active]:text-foreground",
        button:
          "border border-border bg-background text-muted-foreground shadow-[var(--shadow-xs)] hover:border-ring/40 hover:text-foreground data-[active]:border-ring/40 data-[active]:text-foreground",
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
        default:
          "z-[-1] rounded-[var(--tabs-trigger-radius)] bg-background shadow-[var(--shadow-xs)]",
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
  "mt-[var(--tabs-panel-gap)] text-[length:var(--tabs-font-size)] text-muted-foreground focus-visible:outline-none focus-visible:ring-[length:var(--tabs-focus-ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--tabs-focus-ring-offset)] focus-visible:ring-offset-background",
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
  badge?: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  title: React.ReactNode;
  tooltip?: React.ReactNode;
  value: string;
}

export interface TabsProps
  extends Omit<React.ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange"> {
  activationMode?: TabsActivationMode;
  defaultValue?: string;
  disabled?: boolean;
  listClassName?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  selected?: string;
  setSelected?: (value: string) => void;
  shape?: TabsShape;
  size?: TabsSize;
  tabs?: readonly TabsItem[];
  value?: string;
  variant?: TabsVariant;
  children?: React.ReactNode;
}

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof tabsListVariants> {
  activateOnFocus?: boolean;
  loop?: boolean;
}

export interface TabsTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  value: string;
  children?: React.ReactNode;
}

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof tabsContentVariants> {
  forceMount?: true;
  keepMounted?: boolean;
  value: string;
}

function getTabsStyle(size: TabsSize, style: React.CSSProperties | undefined): TabsCssVars {
  const token = tabsSizes[size];

  return {
    "--tabs-height": `${token.height}px`,
    "--tabs-padding": `${token.padding}px`,
    "--tabs-gap": `${token.gap}px`,
    "--tabs-trigger-gap": `${token.triggerGap}px`,
    "--tabs-trigger-padding-x": `${token.paddingX}px`,
    "--tabs-trigger-min-width": `${token.minWidth}px`,
    "--tabs-icon-size": `${token.iconSize}px`,
    "--tabs-font-size": `${token.fontSize}px`,
    "--tabs-radius": `${tabsTokens.radius}px`,
    "--tabs-trigger-radius": `${tabsTokens.triggerRadius}px`,
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
    ...style,
  };
}

function getFirstEnabledValue(tabs: readonly TabsItem[] | undefined) {
  return tabs?.find((tab) => !tab.disabled)?.value;
}

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
  ...props
}: TabsProps) {
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
      <BaseRoot
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

function TabsList({
  activateOnFocus,
  className,
  loop = true,
  shape,
  variant,
  children,
  ...props
}: TabsListProps) {
  const context = React.useContext(TabsContext);
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

function TabsTrigger({ badge, children, className, disabled, icon, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
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
