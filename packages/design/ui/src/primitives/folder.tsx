"use client";

import { motion, type Variants } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "../utils/cn";

/* -------------------------------------------------------------------------- *\
 *  Folder — decorative animated folder with hover-reveal papers.
 *
 *  Aesthetic family: marketing / showcase tile. Sibling of feature-card,
 *  display-cards. Hover lifts the front paper and fans the back papers out.
 *
 *  Decorative vs. interactive mode:
 *    - Default (no `onClick`)  → <motion.div aria-hidden="true">, no cursor,
 *                                 no keyboard interaction. Pure decoration.
 *    - With `onClick` provided → <motion.button> with full keyboard support:
 *                                 Tab to focus, Enter/Space to activate, and
 *                                 `whileFocus="hover"` so the keyboard user
 *                                 sees the same hover animation that mouse
 *                                 users get. aria-label falls back to the
 *                                 `label` prop or "Open folder".
 *
 *  Color tokens (categorical, NOT brand chrome):
 *    Folder colors map to **categorical labels** ("red folder" / "yellow folder"),
 *    not to brand-derived semantic tokens. A user setting a red folder doesn't
 *    want their accent theme; they want a red folder. Hence the colorMap uses
 *    raw Tailwind palette (`blue-400`, `yellow-50`, …) rather than
 *    `bg-primary` / `bg-warning`. CLAUDE.md's semantic-token-only rule applies
 *    to brand chrome, not to categorical visual props.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type FolderColor = "blue" | "black" | "grey" | "yellow" | "orange" | "red";
export type FolderSize = "sm" | "md" | "lg";

export type FolderProps = {
  /** @default "blue" */
  color?: FolderColor;
  /** @default "lg" */
  size?: FolderSize;
  /** Optional pill label on the folder body. Doubles as `aria-label` when interactive. */
  label?: string;
  /** When provided, the folder renders as a real <button> with keyboard support. */
  onClick?: () => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Lookup tables
// ---------------------------------------------------------------------------

type FolderSizeTokens = {
  container: string;
  tabLeft: string;
  tabRight: string;
  tabBridge: string;
  flapBody: string;
  papers: string;
  paperOffset: string;
  paperH: string;
  paperContent: string;
  label: string;
  hoverY: number;
  hoverBackY: number;
};

const sizeMap: Readonly<Record<FolderSize, FolderSizeTokens>> = {
  sm: {
    container: "size-24 rounded-[24px]",
    tabLeft: "w-9 h-3 rounded-tl-lg",
    tabRight: "w-2 h-3 rounded-tr-[24px]",
    tabBridge: "w-2 h-2",
    flapBody: "h-9",
    papers: "inset-x-5 top-2",
    paperOffset: "top-1",
    paperH: "h-16",
    paperContent: "pt-2.5 px-2.5 space-y-1",
    label: "bottom-2 left-2 text-[9px] py-0.5 px-1.5",
    hoverY: -3,
    hoverBackY: -4,
  },
  md: {
    container: "size-32 rounded-[32px]",
    tabLeft: "w-12 h-4 rounded-tl-lg",
    tabRight: "w-2.5 h-4 rounded-tr-[32px]",
    tabBridge: "w-2.5 h-2.5",
    flapBody: "h-12",
    papers: "inset-x-6 top-3",
    paperOffset: "top-1.5",
    paperH: "h-24",
    paperContent: "pt-3 px-3 space-y-1",
    label: "bottom-3 left-3 text-[10px] py-0.5 px-1.5",
    hoverY: -3,
    hoverBackY: -5,
  },
  lg: {
    container: "size-40 rounded-[40px]",
    tabLeft: "w-16 h-5 rounded-tl-xl",
    tabRight: "w-3 h-5 rounded-tr-[40px]",
    tabBridge: "w-3 h-3",
    flapBody: "h-16",
    papers: "inset-x-8 top-4",
    paperOffset: "top-2",
    paperH: "h-28",
    paperContent: "pt-4 px-4 space-y-1.5",
    label: "bottom-4 left-4 text-xs py-1 px-2",
    hoverY: -4,
    hoverBackY: -6,
  },
};

type FolderColorTokens = {
  folder: string;
  flap: string;
  paperBack: string;
  paperFront: string;
  paperLine: string;
  paperBorder: string;
  labelBg: string;
  folderBorder: string;
};

const colorMap: Readonly<Record<FolderColor, FolderColorTokens>> = {
  blue: {
    folder: "from-blue-400 to-blue-500",
    flap: "bg-blue-300/50",
    paperBack: "bg-blue-100/60",
    paperFront: "bg-blue-50",
    paperLine: "bg-blue-300/40",
    paperBorder: "border-blue-200",
    labelBg: "bg-blue-800/20",
    folderBorder: "border-white/30",
  },
  black: {
    folder: "from-neutral-800 to-neutral-900",
    flap: "bg-neutral-600/50",
    paperBack: "bg-neutral-500/60",
    paperFront: "bg-neutral-100",
    paperLine: "bg-neutral-300",
    paperBorder: "border-neutral-500",
    labelBg: "bg-white/10",
    folderBorder: "border-white/10",
  },
  yellow: {
    folder: "from-yellow-400 to-yellow-500",
    flap: "bg-yellow-200/50",
    paperBack: "bg-yellow-100/60",
    paperFront: "bg-yellow-50",
    paperLine: "bg-yellow-400/40",
    paperBorder: "border-yellow-200",
    labelBg: "bg-yellow-800/20",
    folderBorder: "border-white/30",
  },
  orange: {
    folder: "from-orange-400 to-orange-500",
    flap: "bg-orange-300/50",
    paperBack: "bg-orange-100/60",
    paperFront: "bg-orange-50",
    paperLine: "bg-orange-400/40",
    paperBorder: "border-orange-200",
    labelBg: "bg-orange-900/20",
    folderBorder: "border-white/30",
  },
  red: {
    folder: "from-red-400 to-red-500",
    flap: "bg-red-300/50",
    paperBack: "bg-red-100/60",
    paperFront: "bg-red-50",
    paperLine: "bg-red-400/40",
    paperBorder: "border-red-200",
    labelBg: "bg-red-900/20",
    folderBorder: "border-white/30",
  },
  grey: {
    folder: "from-gray-400 to-gray-500",
    flap: "bg-gray-300/50",
    paperBack: "bg-gray-200/60",
    paperFront: "bg-gray-100",
    paperLine: "bg-gray-400/40",
    paperBorder: "border-gray-300",
    labelBg: "bg-gray-800/20",
    folderBorder: "border-white/40",
  },
};

const spring = { type: "spring", stiffness: 300, damping: 22 } as const;

// ---------------------------------------------------------------------------
// Variants (shared between div + button render paths)
// ---------------------------------------------------------------------------

function buildPaperVariants(s: FolderSizeTokens): {
  backRight: Variants;
  backLeft: Variants;
  front: Variants;
} {
  return {
    backRight: {
      rest: { rotate: 4, y: 0, transition: spring },
      hover: { rotate: 6, y: s.hoverBackY, transition: spring },
    },
    backLeft: {
      rest: { rotate: -4, y: 0, transition: spring },
      hover: { rotate: -6, y: s.hoverBackY, transition: spring },
    },
    front: {
      rest: { y: 0, transition: spring },
      hover: { y: s.hoverY, transition: spring },
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Folder = forwardRef<HTMLDivElement | HTMLButtonElement, FolderProps>(function Folder(
  { color = "blue", size = "lg", label, onClick, className },
  ref,
) {
  const c = colorMap[color];
  const s = sizeMap[size];
  const v = buildPaperVariants(s);
  const interactive = typeof onClick === "function";

  const containerCls = cn(
    "relative overflow-hidden border-t-2 bg-gradient-to-b",
    interactive && "cursor-pointer",
    s.container,
    c.folder,
    c.folderBorder,
    className,
  );

  const children = (
    <>
      {/* Front flap */}
      <div className="absolute right-0 bottom-0 left-0 z-20">
        <div className="flex items-end">
          <div className={cn(s.tabLeft, "backdrop-blur-sm", c.flap)} />
          <div className={cn(s.tabRight, "backdrop-blur-sm", c.flap)} />
          <div
            className={cn(
              s.tabBridge,
              "mask-[radial-gradient(200%_200%_at_100%_0%,transparent_50%,black_50%)]",
              c.flap,
            )}
          />
        </div>
        <div className={cn(s.flapBody, "rounded-tr-xl backdrop-blur-sm", c.flap)} />
      </div>

      {/* Papers */}
      <div className={cn("absolute z-10", s.papers)}>
        <motion.div
          variants={v.backRight}
          style={{ originY: 1 }}
          className={cn("absolute inset-x-0 rounded-2xl", s.paperOffset, s.paperH, c.paperBack)}
        />
        <motion.div
          variants={v.backLeft}
          style={{ originY: 1 }}
          className={cn("absolute inset-x-0 rounded-2xl", s.paperOffset, s.paperH, c.paperBack)}
        />
        <motion.div
          variants={v.front}
          className={cn(
            "absolute inset-x-0 top-0 rounded-xl border-t",
            s.paperH,
            c.paperFront,
            c.paperBorder,
          )}
        >
          <div className={s.paperContent}>
            <div className={cn("h-1 w-3/4 rounded-full", c.paperLine)} />
            <div className={cn("h-1 w-1/2 rounded-full", c.paperLine)} />
            <div className={cn("h-1 w-2/3 rounded-full", c.paperLine)} />
          </div>
        </motion.div>
      </div>

      {/* Label */}
      {label && (
        <div className={cn("absolute z-20 rounded-full", s.label, c.labelBg)}>
          <span className="font-medium text-white">{label}</span>
        </div>
      )}
    </>
  );

  if (interactive) {
    return (
      <motion.button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        aria-label={label ?? "Open folder"}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileFocus="hover"
        className={cn(containerCls, "border-0 p-0")}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      ref={ref as React.Ref<HTMLDivElement>}
      aria-hidden="true"
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={containerCls}
    >
      {children}
    </motion.div>
  );
});
