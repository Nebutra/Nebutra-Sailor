"use client";

import type { Ref } from "react";
import {
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
  type Variants,
} from "../shared/animation/motion";
import { cn } from "../utils/cn";

type MotionVariants = Variants;

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
  // "blue" and "grey"/"black" have a real 12-step token scale (blue-N,
  // neutral-N) to draw from, so they use it. Yellow/orange/red have no
  // design-token equivalent -- the scale only covers blue, cyan and neutral --
  // so those keep the Tailwind default palette (allow-palette per line) to
  // stay a genuine "red/orange/yellow folder", not a brand-tinted one.
  blue: {
    folder: "from-blue-7 to-blue-8",
    flap: "bg-blue-6/50",
    paperBack: "bg-blue-3/60",
    paperFront: "bg-blue-2",
    paperLine: "bg-blue-6/40",
    paperBorder: "border-blue-4",
    labelBg: "bg-blue-8/20",
    // allow-palette: glossy paper-material highlight on the folder edge -- same fixed sheen for every color variant, not brand chrome
    folderBorder: "border-white/30",
  },
  black: {
    folder: "from-neutral-8 to-neutral-9",
    flap: "bg-neutral-6/50",
    paperBack: "bg-neutral-5/60",
    paperFront: "bg-neutral-2",
    paperLine: "bg-neutral-4",
    paperBorder: "border-neutral-5",
    // allow-palette: label chip needs a light translucent tint against a near-black folder body regardless of brand or dark mode
    labelBg: "bg-white/10",
    // allow-palette: glossy paper-material highlight on the folder edge -- same fixed sheen for every color variant, not brand chrome
    folderBorder: "border-white/10",
  },
  yellow: {
    // allow-palette: categorical folder colour ("yellow folder") -- no yellow step exists in the blue/cyan/neutral token scale
    folder: "from-yellow-400 to-yellow-500",
    // allow-palette: categorical folder colour, see above
    flap: "bg-yellow-200/50",
    // allow-palette: categorical folder colour, see above
    paperBack: "bg-yellow-100/60",
    // allow-palette: categorical folder colour, see above
    paperFront: "bg-yellow-50",
    // allow-palette: categorical folder colour, see above
    paperLine: "bg-yellow-400/40",
    // allow-palette: categorical folder colour, see above
    paperBorder: "border-yellow-200",
    // allow-palette: categorical folder colour, see above
    labelBg: "bg-yellow-800/20",
    // allow-palette: glossy paper-material highlight on the folder edge -- same fixed sheen for every color variant, not brand chrome
    folderBorder: "border-white/30",
  },
  orange: {
    // allow-palette: categorical folder colour ("orange folder") -- no orange step exists in the blue/cyan/neutral token scale
    folder: "from-orange-400 to-orange-500",
    // allow-palette: categorical folder colour, see above
    flap: "bg-orange-300/50",
    // allow-palette: categorical folder colour, see above
    paperBack: "bg-orange-100/60",
    // allow-palette: categorical folder colour, see above
    paperFront: "bg-orange-50",
    // allow-palette: categorical folder colour, see above
    paperLine: "bg-orange-400/40",
    // allow-palette: categorical folder colour, see above
    paperBorder: "border-orange-200",
    // allow-palette: categorical folder colour, see above
    labelBg: "bg-orange-900/20",
    // allow-palette: glossy paper-material highlight on the folder edge -- same fixed sheen for every color variant, not brand chrome
    folderBorder: "border-white/30",
  },
  red: {
    // allow-palette: categorical folder colour ("red folder") -- no red step exists in the blue/cyan/neutral token scale
    folder: "from-red-400 to-red-500",
    // allow-palette: categorical folder colour, see above
    flap: "bg-red-300/50",
    // allow-palette: categorical folder colour, see above
    paperBack: "bg-red-100/60",
    // allow-palette: categorical folder colour, see above
    paperFront: "bg-red-50",
    // allow-palette: categorical folder colour, see above
    paperLine: "bg-red-400/40",
    // allow-palette: categorical folder colour, see above
    paperBorder: "border-red-200",
    // allow-palette: categorical folder colour, see above
    labelBg: "bg-red-900/20",
    // allow-palette: glossy paper-material highlight on the folder edge -- same fixed sheen for every color variant, not brand chrome
    folderBorder: "border-white/30",
  },
  grey: {
    folder: "from-neutral-6 to-neutral-7",
    flap: "bg-neutral-5/50",
    paperBack: "bg-neutral-4/60",
    paperFront: "bg-neutral-2",
    paperLine: "bg-neutral-6/40",
    paperBorder: "border-neutral-5",
    labelBg: "bg-neutral-9/20",
    // allow-palette: glossy paper-material highlight on the folder edge -- same fixed sheen for every color variant, not brand chrome
    folderBorder: "border-white/40",
  },
};

const spring = { type: "spring", stiffness: 300, damping: 22 } as const;
const instant = { duration: 0 } as const;

// ---------------------------------------------------------------------------
// Variants (shared between div + button render paths)
// ---------------------------------------------------------------------------

function buildPaperVariants(
  s: FolderSizeTokens,
  shouldReduceMotion: boolean,
): {
  backRight: MotionVariants;
  backLeft: MotionVariants;
  front: MotionVariants;
} {
  const transition = shouldReduceMotion ? instant : spring;
  return {
    backRight: {
      rest: { rotate: 4, y: 0, transition },
      hover: shouldReduceMotion
        ? { rotate: 4, y: 0, transition }
        : { rotate: 6, y: s.hoverBackY, transition },
    },
    backLeft: {
      rest: { rotate: -4, y: 0, transition },
      hover: shouldReduceMotion
        ? { rotate: -4, y: 0, transition }
        : { rotate: -6, y: s.hoverBackY, transition },
    },
    front: {
      rest: { y: 0, transition },
      hover: shouldReduceMotion ? { y: 0, transition } : { y: s.hoverY, transition },
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Folder = function Folder({
  ref,
  color = "blue",
  size = "lg",
  label,
  onClick,
  className,
}: FolderProps & { ref?: Ref<HTMLDivElement | HTMLButtonElement> | undefined }) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const c = colorMap[color];
  const s = sizeMap[size];
  const v = buildPaperVariants(s, shouldReduceMotion);
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
        <m.div
          variants={v.backRight}
          style={{ originY: 1 }}
          className={cn(
            "absolute inset-x-0 rounded-[var(--radius-2xl)]",
            s.paperOffset,
            s.paperH,
            c.paperBack,
          )}
        />
        <m.div
          variants={v.backLeft}
          style={{ originY: 1 }}
          className={cn(
            "absolute inset-x-0 rounded-[var(--radius-2xl)]",
            s.paperOffset,
            s.paperH,
            c.paperBack,
          )}
        />
        <m.div
          variants={v.front}
          className={cn(
            "absolute inset-x-0 top-0 rounded-[var(--radius-xl)] border-t",
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
        </m.div>
      </div>

      {/* Label */}
      {label && (
        <div className={cn("absolute z-20 rounded-full", s.label, c.labelBg)}>
          {/* allow-palette: label chip text needs a fixed light colour against every translucent folder-colour tint (yellow, red, blue...), not the brand foreground */}
          <span className="font-medium text-white">{label}</span>
        </div>
      )}
    </>
  );

  if (interactive) {
    return (
      <LazyMotion features={domAnimation}>
        <m.button
          // Double-cast bridges framer-motion's bundled React types vs @types/react.
          ref={ref as unknown as never}
          type="button"
          onClick={onClick}
          aria-label={label ?? "Open folder"}
          initial="rest"
          animate="rest"
          className={cn(containerCls, "border-0 p-0")}
          {...(shouldReduceMotion ? {} : { whileHover: "hover", whileFocus: "hover" })}
        >
          {children}
        </m.button>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        // Double-cast: framer-motion's React types ≠ @types/react despite same name.
        ref={ref as unknown as never}
        aria-hidden="true"
        initial="rest"
        animate="rest"
        className={containerCls}
        {...(shouldReduceMotion ? {} : { whileHover: "hover" })}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
};
