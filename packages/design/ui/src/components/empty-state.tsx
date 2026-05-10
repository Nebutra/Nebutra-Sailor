"use client";

import { domAnimation, LazyMotion, motion } from "framer-motion";
import type React from "react";
import { forwardRef, memo, useId } from "react";
import { cn } from "../utils/cn";

type Theme = "light" | "dark" | "neutral";
type Variant = "default" | "subtle" | "error";
type Size = "sm" | "default" | "lg";

const ICON_VARIANTS = {
  left: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      x: 0,
      y: 0,
      rotate: -6,
      transition: { duration: 0.4, delay: 0.1 },
    },
    hover: { x: -22, y: -5, rotate: -15, scale: 1.1, transition: { duration: 0.2 } },
  },
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
    hover: { y: -10, scale: 1.15, transition: { duration: 0.2 } },
  },
  right: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 6,
      transition: { duration: 0.4, delay: 0.3 },
    },
    hover: { x: 22, y: -5, rotate: 15, scale: 1.1, transition: { duration: 0.2 } },
  },
};

const CONTENT_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
};

const BUTTON_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.3 } },
};

interface IconContainerProps {
  children: React.ReactNode;
  variant: "left" | "center" | "right";
  className?: string;
  theme: Theme;
}

const IconContainer = memo(function IconContainer({
  children,
  variant,
  className = "",
  theme,
}: IconContainerProps) {
  return (
    <motion.div
      variants={ICON_VARIANTS[variant]}
      className={cn(
        "w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center relative shadow-lg transition-all duration-300",
        theme === "dark" &&
          "bg-neutral-800 border border-neutral-700 group-hover:shadow-xl group-hover:border-neutral-600",
        theme === "neutral" &&
          "bg-stone-100 border border-stone-200 group-hover:shadow-xl group-hover:border-stone-300",
        (!theme || theme === "light") &&
          "bg-white border border-[var(--neutral-6)] group-hover:shadow-xl group-hover:border-[var(--neutral-7)]",
        className,
      )}
    >
      <div
        className={cn(
          "text-sm transition-colors duration-300",
          theme === "dark" && "text-neutral-400 group-hover:text-neutral-200",
          theme === "neutral" && "text-stone-500 group-hover:text-stone-700",
          (!theme || theme === "light") &&
            "text-[var(--neutral-9)] group-hover:text-[var(--neutral-11)]",
        )}
      >
        {children}
      </div>
    </motion.div>
  );
});

interface MultiIconDisplayProps {
  icons: React.ReactNode[];
  theme: Theme;
}

const MultiIconDisplay = memo(function MultiIconDisplay({ icons, theme }: MultiIconDisplayProps) {
  if (!icons || icons.length < 3) return null;

  return (
    <div className="flex justify-center isolate relative">
      <IconContainer variant="left" className="left-2 top-1 z-10" theme={theme}>
        {icons[0]}
      </IconContainer>
      <IconContainer variant="center" className="z-20" theme={theme}>
        {icons[1]}
      </IconContainer>
      <IconContainer variant="right" className="right-2 top-1 z-10" theme={theme}>
        {icons[2]}
      </IconContainer>
    </div>
  );
});

function Background() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500"
      style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    />
  );
}

export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Optional icon to display before label */
  icon?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
}

export interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Array of 3 icons to display */
  icons?: React.ReactNode[];
  /** Action button configuration */
  action?: EmptyStateAction;
  /** Visual variant */
  variant?: Variant;
  /** Size variant */
  size?: Size;
  /** Color theme */
  theme?: Theme;
  /** Whether icons animate on hover */
  isIconAnimated?: boolean;
  /** Additional className */
  className?: string;
}

const baseClasses =
  "group transition-all duration-300 rounded-[var(--radius-xl)] relative overflow-hidden text-center flex flex-col items-center justify-center";

const sizeClasses: Record<Size, string> = {
  sm: "p-6",
  default: "p-8",
  lg: "p-12",
};

const getVariantClasses = (variant: Variant, theme: Theme): string => {
  const variants: Record<Variant, Record<Theme, string>> = {
    default: {
      light:
        "bg-white border-dashed border-2 border-[var(--neutral-7)] hover:border-[var(--neutral-8)] hover:bg-[var(--neutral-2)]",
      dark: "bg-neutral-900 border-dashed border-2 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/50",
      neutral:
        "bg-stone-50 border-dashed border-2 border-stone-300 hover:border-stone-400 hover:bg-stone-100/50",
    },
    subtle: {
      light: "bg-white border border-transparent hover:bg-[var(--neutral-2)]",
      dark: "bg-neutral-900 border border-transparent hover:bg-neutral-800/30",
      neutral: "bg-stone-50 border border-transparent hover:bg-stone-100/30",
    },
    error: {
      light: "bg-white border border-red-200 bg-red-50/50 hover:bg-red-50/80",
      dark: "bg-neutral-900 border border-red-800 bg-red-950/50 hover:bg-red-950/80",
      neutral: "bg-stone-50 border border-red-300 bg-red-50/50 hover:bg-red-50/80",
    },
  };
  return variants[variant][theme];
};

const getTextClasses = (type: "title" | "description", size: Size, theme: Theme): string => {
  const sizes: Record<"title" | "description", Record<Size, string>> = {
    title: {
      sm: "text-base",
      default: "text-lg",
      lg: "text-xl",
    },
    description: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    },
  };

  const colors: Record<"title" | "description", Record<Theme, string>> = {
    title: {
      light: "text-[var(--neutral-12)]",
      dark: "text-neutral-100",
      neutral: "text-stone-900",
    },
    description: {
      light: "text-[var(--neutral-10)]",
      dark: "text-neutral-400",
      neutral: "text-stone-600",
    },
  };

  return cn(
    sizes[type][size],
    colors[type][theme],
    type === "title" && "font-semibold",
    "transition-colors duration-200",
  );
};

const getButtonClasses = (size: Size, theme: Theme): string => {
  const sizeCls: Record<Size, string> = {
    sm: "text-xs px-3 py-1.5",
    default: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };

  const themeCls: Record<Theme, string> = {
    light:
      "border-[var(--neutral-7)] bg-white hover:bg-[var(--neutral-2)] text-[var(--neutral-11)]",
    dark: "border-neutral-600 bg-neutral-800 hover:bg-neutral-700 text-neutral-200",
    neutral: "border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700",
  };

  return cn(
    "inline-flex items-center gap-2 border rounded-[var(--radius-md)] font-medium shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group/button disabled:opacity-50 disabled:cursor-not-allowed",
    sizeCls[size],
    themeCls[theme],
  );
};

/**
 * EmptyState - Interactive empty state component with animated icons
 *
 * Displays a visually rich empty state with support for multiple themes,
 * sizes, and variants. Icons animate on hover for enhanced interactivity.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No Projects"
 *   description="Create your first project to get started"
 *   icons={[<FolderIcon />, <PlusIcon />, <RocketIcon />]}
 *   action={{ label: "Create Project", onClick: () => {} }}
 *   theme="light"
 * />
 * ```
 */
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(function EmptyState(
  {
    title,
    description,
    icons,
    action,
    variant = "default",
    size = "default",
    theme = "light",
    isIconAnimated = true,
    className = "",
    ...props
  },
  ref,
) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <LazyMotion features={domAnimation}>
      <motion.section
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(baseClasses, sizeClasses[size], getVariantClasses(variant, theme), className)}
        initial="initial"
        animate="animate"
        whileHover={isIconAnimated ? "hover" : "animate"}
        {...props}
      >
        <Background />
        <div className="relative z-10 flex flex-col items-center">
          {icons && icons.length >= 3 && (
            <div className="mb-6">
              <MultiIconDisplay icons={icons} theme={theme} />
            </div>
          )}

          <motion.div variants={CONTENT_VARIANTS} className="space-y-2 mb-6">
            <h2 id={titleId} className={getTextClasses("title", size, theme)}>
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className={cn(
                  getTextClasses("description", size, theme),
                  "max-w-md leading-relaxed",
                )}
              >
                {description}
              </p>
            )}
          </motion.div>

          {action && (
            <motion.div variants={BUTTON_VARIANTS}>
              <motion.button
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={getButtonClasses(size, theme)}
                whileTap={{ scale: 0.98 }}
              >
                {action.icon && (
                  <motion.div
                    className="transition-transform group-hover/button:rotate-90"
                    whileHover={{ rotate: 90 }}
                  >
                    {action.icon}
                  </motion.div>
                )}
                <span className="relative z-10">{action.label}</span>
              </motion.button>
            </motion.div>
          )}
        </div>
      </motion.section>
    </LazyMotion>
  );
});
