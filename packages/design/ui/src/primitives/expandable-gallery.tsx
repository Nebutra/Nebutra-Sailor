"use client";

import { ArrowLeft } from "@nebutra/icons";
import { type ReactNode, type Ref, useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "../shared/animation/motion";
import { cn } from "../utils/cn";

type MotionTransition = NonNullable<React.ComponentProps<typeof motion.div>["transition"]>;

/* -------------------------------------------------------------------------- *\
 *  ExpandableGallery — fanned photo stack that animates into a grid.
 *
 *  Two states, one LayoutGroup:
 *    - collapsed  → only the first `previewCount` photos render, fanned with
 *                   per-photo rotation/x/y. Each is a real <button>, so Tab +
 *                   Enter expands the gallery. `whileFocus="hover"` gives
 *                   keyboard users the same lift animation mouse users get.
 *    - expanded   → all photos render in a responsive grid. Cards become
 *                   decorative <motion.div aria-hidden> (no-op clicks would be
 *                   dishonest). The Back button collapses; clicking outside
 *                   collapses (unless `closeOnOutsideClick={false}`).
 *
 *  Controlled / uncontrolled:
 *    Provide `expanded` + `onExpandedChange` to drive externally; omit both
 *    and the component manages its own state (seeded by `defaultExpanded`).
 *
 *  Why <img> not <next/image>:
 *    This primitive ships outside Next.js (Storybook, CRA consumers, shadcn
 *    registry). Framework-coupled imports would break. Consumers on Next.js
 *    pass a pre-resolved URL; the `priority` hint is approximated via the
 *    native `loading="eager"` on preview cards.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type GalleryPhoto = {
  id: string;
  src: string;
  alt: string;
  /** Degrees. Applied only in collapsed state. */
  rotation?: number;
  /** Pixels of horizontal offset in collapsed state. */
  x?: number;
  /** Pixels of vertical offset in collapsed state. */
  y?: number;
  /** Stacking order in collapsed state. */
  zIndex?: number;
};

export type ExpandableGalleryProps = {
  photos: ReadonlyArray<GalleryPhoto>;
  /** Number of photos shown in the collapsed fanned stack. @default 3 */
  previewCount?: number;
  /** Controlled expansion state. Pair with `onExpandedChange`. */
  expanded?: boolean;
  /** Initial state when uncontrolled. @default false */
  defaultExpanded?: boolean;
  onExpandedChange?: (next: boolean) => void;
  /** Collapse when the user clicks outside the gallery in expanded state. @default true */
  closeOnOutsideClick?: boolean;
  /** Back-button label. @default "Go back" */
  backLabel?: string;
  /** Rendered below the stack while collapsed. Caller owns headline + CTA. */
  children?: ReactNode;
  className?: string;
};

// ---------------------------------------------------------------------------
// Motion config
// ---------------------------------------------------------------------------

const transition: MotionTransition = {
  type: "spring",
  stiffness: 160,
  damping: 18,
  mass: 1,
};

const hoverTransition: MotionTransition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ExpandableGallery = function ExpandableGallery({
  ref,
  photos,
  previewCount = 3,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  closeOnOutsideClick = true,
  backLabel = "Go back",
  children,
  className,
}: ExpandableGalleryProps & { ref?: Ref<HTMLDivElement> | undefined }) {
  const [internalOpen, setInternalOpen] = useState(defaultExpanded);
  const isOpen: boolean = expanded !== undefined ? expanded : internalOpen;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutGroupId = useId();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const activeTransition = shouldReduceMotion ? { duration: 0 } : transition;

  const setOpen = useCallback(
    (next: boolean) => {
      if (expanded === undefined) setInternalOpen(next);
      onExpandedChange?.(next);
    },
    [expanded, onExpandedChange],
  );

  // Outside-click collapse — inlined (single call site, no useOutsideClick hook needed).
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const node = containerRef.current;
      if (!node) return;
      if (node.contains(event.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, closeOnOutsideClick, setOpen]);

  return (
    <LayoutGroup id={layoutGroupId}>
      <div
        ref={ref}
        className={cn("relative mx-auto flex w-full max-w-6xl flex-col items-center", className)}
      >
        {/* Back-button row — reserved height to prevent layout shift on toggle */}
        <div className="mb-2 flex h-12 w-full items-center justify-between px-4">
          <AnimatePresence>
            {isOpen && (
              <motion.button
                key="back-button"
                type="button"
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
                transition={activeTransition}
                onClick={() => setOpen(false)}
                className="group z-50 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="rounded-full bg-muted p-2 text-foreground transition-colors group-hover:bg-accent">
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-medium">{backLabel}</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          ref={containerRef}
          layout={!shouldReduceMotion}
          transition={activeTransition}
          className={cn(
            "relative w-full",
            isOpen
              ? "grid grid-cols-2 gap-6 px-4 md:gap-8 lg:grid-cols-3"
              : "flex flex-col items-center justify-start pt-4",
          )}
        >
          <div
            className={cn(
              "relative",
              isOpen ? "contents" : "mb-8 flex h-[450px] w-full items-center justify-center",
            )}
          >
            {photos.map((photo, index) => {
              const isPrimary = index < previewCount;
              if (!isPrimary && !isOpen) return null;

              const rotation = photo.rotation ?? 0;
              const x = photo.x ?? 0;
              const y = photo.y ?? 0;
              const z = photo.zIndex ?? index;

              const sharedClass = cn(
                "overflow-hidden bg-muted",
                isOpen
                  ? "relative aspect-square rounded-[2rem] border-4 border-background shadow-lg md:rounded-[3rem] md:border-[6px]"
                  : "absolute h-44 w-44 cursor-pointer rounded-[2.5rem] border-[6px] border-background shadow-[0_20px_50px_rgba(0,0,0,0.15)] md:h-60 md:w-60 md:rounded-[3rem]",
              );

              const inner = (
                <motion.div
                  layout={shouldReduceMotion ? false : "position"}
                  transition={activeTransition}
                  className="relative h-full w-full"
                  {...(shouldReduceMotion ? {} : { layoutId: `gallery-image-${photo.id}` })}
                >
                  {/* biome-ignore lint/performance/noImgElement: framework-neutral primitive — consumers may not be on Next.js */}
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading={isPrimary ? "eager" : "lazy"}
                    className="pointer-events-none h-full w-full select-none object-cover"
                    draggable={false}
                  />
                </motion.div>
              );

              if (isOpen) {
                return (
                  <motion.div
                    key={`card-${photo.id}`}
                    layout={!shouldReduceMotion}
                    aria-hidden="true"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1, zIndex: 10 }
                        : { opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, zIndex: 10 }
                    }
                    transition={activeTransition}
                    className={sharedClass}
                    {...(shouldReduceMotion
                      ? {}
                      : { layoutId: `gallery-card-${photo.id}`, whileHover: { scale: 1.02 } })}
                  >
                    {inner}
                  </motion.div>
                );
              }

              return (
                <motion.button
                  key={`card-${photo.id}`}
                  type="button"
                  layout={!shouldReduceMotion}
                  aria-label={photo.alt}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1, zIndex: z }
                      : { opacity: 1, scale: 1, rotate: rotation, x, y, zIndex: z }
                  }
                  transition={activeTransition}
                  onClick={() => setOpen(true)}
                  className={cn(sharedClass, "appearance-none p-0")}
                  {...(shouldReduceMotion
                    ? {}
                    : {
                        layoutId: `gallery-card-${photo.id}`,
                        whileHover: {
                          scale: 1.05,
                          y: y - 15,
                          rotate: rotation * 0.8,
                          zIndex: 50,
                          transition: hoverTransition,
                        },
                        whileFocus: {
                          scale: 1.05,
                          y: y - 15,
                          rotate: rotation * 0.8,
                          zIndex: 50,
                          transition: hoverTransition,
                        },
                      })}
                >
                  {inner}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {!isOpen && children && (
              <motion.div
                key="collapsed-slot"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl space-y-8 text-center"
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </LayoutGroup>
  );
};
