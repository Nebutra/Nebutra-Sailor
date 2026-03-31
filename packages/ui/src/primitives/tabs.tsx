"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils";
import { withHtmlProps } from "../utils/primitive-props";

// Radix types don't resolve HTML props with React 19 + exactOptionalPropertyTypes.
const RadixRoot = withHtmlProps<"div">(BaseTabs.Root);
const RadixList = withHtmlProps<"div">(BaseTabs.List);
const RadixTrigger = withHtmlProps<"button">(BaseTabs.Tab);
const RadixContent = withHtmlProps<"div">(BaseTabs.Panel);

// =============================================================================
// Variants
// =============================================================================

const tabsListVariants = cva("flex items-center shrink-0", {
  variants: {
    variant: {
      default: "bg-accent p-1",
      button: "",
      line: "border-b border-border",
    },
    shape: {
      default: "",
      pill: "",
    },
    size: {
      lg: "gap-2.5",
      md: "gap-2",
      sm: "gap-1.5",
      xs: "gap-1",
    },
  },
  compoundVariants: [
    { variant: "default", size: "lg", className: "p-1.5 gap-2.5" },
    { variant: "default", size: "md", className: "p-1 gap-2" },
    { variant: "default", size: "sm", className: "p-1 gap-1.5" },
    { variant: "default", size: "xs", className: "p-1 gap-1" },

    {
      variant: "default",
      shape: "default",
      size: "lg",
      className: "rounded-[var(--radius-lg)]",
    },
    {
      variant: "default",
      shape: "default",
      size: "md",
      className: "rounded-[var(--radius-lg)]",
    },
    {
      variant: "default",
      shape: "default",
      size: "sm",
      className: "rounded-[var(--radius-md)]",
    },
    {
      variant: "default",
      shape: "default",
      size: "xs",
      className: "rounded-[var(--radius-md)]",
    },

    { variant: "line", size: "lg", className: "gap-9" },
    { variant: "line", size: "md", className: "gap-8" },
    { variant: "line", size: "sm", className: "gap-4" },
    { variant: "line", size: "xs", className: "gap-4" },

    {
      variant: "default",
      shape: "pill",
      className: "rounded-full [&_[role=tab]]:rounded-full",
    },
    {
      variant: "button",
      shape: "pill",
      className: "rounded-full [&_[role=tab]]:rounded-full",
    },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

const tabsTriggerVariants = cva(
  "shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-center items-center font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&:hover_svg]:text-primary [&[data-selected]_svg]:text-primary",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:text-foreground data-[selected]:text-foreground",
        button:
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-lg)] text-accent-foreground hover:text-foreground data-[selected]:text-foreground",
        line: "text-muted-foreground hover:text-primary data-[selected]:text-primary",
      },
      size: {
        lg: "gap-2.5 [&_svg]:size-5 text-sm",
        md: "gap-2 [&_svg]:size-4 text-sm",
        sm: "gap-1.5 [&_svg]:size-3.5 text-xs",
        xs: "gap-1 [&_svg]:size-3.5 text-xs",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        size: "lg",
        className: "py-2.5 px-4 rounded-[var(--radius-md)]",
      },
      {
        variant: "default",
        size: "md",
        className: "py-1.5 px-3 rounded-[var(--radius-md)]",
      },
      {
        variant: "default",
        size: "sm",
        className: "py-1.5 px-2.5 rounded-[var(--radius-sm)]",
      },
      {
        variant: "default",
        size: "xs",
        className: "py-1 px-2 rounded-[var(--radius-sm)]",
      },

      {
        variant: "button",
        size: "lg",
        className: "py-3 px-4 rounded-[var(--radius-lg)]",
      },
      {
        variant: "button",
        size: "md",
        className: "py-2.5 px-3 rounded-[var(--radius-lg)]",
      },
      {
        variant: "button",
        size: "sm",
        className: "py-2 px-2.5 rounded-[var(--radius-md)]",
      },
      {
        variant: "button",
        size: "xs",
        className: "py-1.5 px-2 rounded-[var(--radius-md)]",
      },

      { variant: "line", size: "lg", className: "py-3" },
      { variant: "line", size: "md", className: "py-2.5" },
      { variant: "line", size: "sm", className: "py-2" },
      { variant: "line", size: "xs", className: "py-1.5" },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const tabsContentVariants = cva(
  "mt-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

// =============================================================================
// Types
// =============================================================================

/**
 * Tabs variant types
 */
export type TabsVariant = "default" | "button" | "line";

/**
 * Tabs size types
 */
export type TabsSize = "xs" | "sm" | "md" | "lg";

/**
 * Tabs shape types
 */
export type TabsShape = "default" | "pill";

// Context
type TabsContextType = {
  variant?: TabsVariant;
  size?: TabsSize;
};

const TabsContext = React.createContext<TabsContextType>({
  variant: "default",
  size: "md",
});

/**
 * Props for Tabs component
 *
 * @description
 * A tabbed interface component with multiple visual variants.
 * Supports default (segmented), button, and line (underline) styles.
 *
 * **UX Scenarios:**
 * - Content organization/switching
 * - Settings panels
 * - Dashboard views
 * - Form sections
 * - Navigation within a page
 *
 * **Accessibility:**
 * - ARIA tablist/tab/tabpanel roles
 * - Keyboard navigation (arrows, Home, End)
 * - Focus management
 */
export type TabsProps = React.ComponentPropsWithoutRef<"div"> & {
  /** The value for the selected tab, if controlled */
  value?: string;
  /** The value of the tab to select by default, if uncontrolled */
  defaultValue?: string;
  /** A function called when a new tab is selected */
  onValueChange?: (value: string) => void;
  /** The orientation the tabs are laid out */
  orientation?: "horizontal" | "vertical";
  /** The direction of navigation */
  dir?: "ltr" | "rtl";
  /** Whether a tab is activated automatically or manually */
  activationMode?: "automatic" | "manual";
};

export type TabsListProps = React.ComponentPropsWithoutRef<"div"> &
  VariantProps<typeof tabsListVariants> & {
    loop?: boolean;
  };

export type TabsTriggerProps = React.ComponentPropsWithoutRef<"button"> & {
  value: string;
};

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof tabsContentVariants> {
  value: string;
  forceMount?: true;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Tabs - Root container for tabbed interface
 *
 * @example
 * ```tsx
 * import { Tabs, TabsList, TabsTrigger, TabsContent } from "@nebutra/ui";
 * import { UserRound, ShieldCheck, Bell } from "lucide-react";
 *
 * // Default variant (segmented control style)
 * <Tabs defaultValue="profile">
 *   <TabsList>
 *     <TabsTrigger value="profile"><UserRound /> Profile</TabsTrigger>
 *     <TabsTrigger value="security"><ShieldCheck /> Security</TabsTrigger>
 *     <TabsTrigger value="notifications"><Bell /> Notifications</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="profile">Profile content</TabsContent>
 *   <TabsContent value="security">Security content</TabsContent>
 *   <TabsContent value="notifications">Notifications content</TabsContent>
 * </Tabs>
 *
 * // Button variant
 * <Tabs defaultValue="tab1">
 *   <TabsList variant="button">
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 * </Tabs>
 *
 * // Line variant (underline tabs)
 * <Tabs defaultValue="tab1">
 *   <TabsList variant="line">
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 * </Tabs>
 *
 * // Different sizes
 * <TabsList size="xs">...</TabsList>
 * <TabsList size="sm">...</TabsList>
 * <TabsList size="md">...</TabsList>
 * <TabsList size="lg">...</TabsList>
 *
 * // Pill shape
 * <TabsList shape="pill">...</TabsList>
 * ```
 */
function Tabs({ className, ...props }: TabsProps) {
  return <RadixRoot data-slot="tabs" className={cn("", className)} {...props} />;
}

/**
 * TabsList - Container for tab triggers
 */
function TabsList({
  className,
  variant = "default",
  shape = "default",
  size = "md",
  children,
  ...props
}: TabsListProps) {
  return (
    <TabsContext.Provider value={{ variant: variant || "default", size: size || "md" }}>
      <RadixList
        data-slot="tabs-list"
        className={cn(tabsListVariants({ variant, shape, size }), "relative z-0", className)}
        {...props}
      >
        <BaseTabs.Indicator
          className={cn(
            "absolute z-[-1] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            variant === "default" && "bg-background shadow-sm rounded-md",
            variant === "button" && "bg-accent rounded-md",
            variant === "line" && "bg-primary rounded-none",
            shape === "pill" && "rounded-full",
          )}
          style={{
            left: "var(--active-tab-left)",
            width: "var(--active-tab-width)",
            top: variant === "line" ? "auto" : "var(--active-tab-top)",
            bottom: variant === "line" ? "0" : "auto",
            height: variant === "line" ? "2px" : "var(--active-tab-height)",
          }}
        />
        {children}
      </RadixList>
    </TabsContext.Provider>
  );
}

/**
 * TabsTrigger - Individual tab button
 */
function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  const { variant, size } = React.useContext(TabsContext);

  return (
    <RadixTrigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/**
 * TabsContent - Content panel for a tab
 */
function TabsContent({ className, variant, ...props }: TabsContentProps) {
  return (
    <RadixContent
      data-slot="tabs-content"
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
  tabsListVariants,
  tabsTriggerVariants,
};
