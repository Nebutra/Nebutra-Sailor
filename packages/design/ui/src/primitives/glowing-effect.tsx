"use client";

import { animate } from "motion/react";
import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

export interface GlowingEffectProps {
  /** Blur amount in pixels for the glow effect */
  blur?: number;
  /** Inactive zone ratio (0-1) from center where effect won't activate */
  inactiveZone?: number;
  /** Proximity distance in pixels to activate the effect */
  proximity?: number;
  /** Spread angle of the glow in degrees */
  spread?: number;
  /** Color variant of the glow */
  variant?: "default" | "white";
  /** Whether glow is always visible */
  glow?: boolean;
  /** Additional className */
  className?: string;
  /** Whether the effect is disabled */
  disabled?: boolean;
  /** Animation duration in seconds */
  movementDuration?: number;
  /** Border width in pixels */
  borderWidth?: number;
}

/**
 * GlowingEffect - Mouse-tracking glowing border effect
 *
 * Creates an animated glow that follows the mouse cursor around the element.
 * Typically used as an overlay on cards or containers.
 *
 * @example
 * ```tsx
 * <div className="relative rounded-[var(--radius-xl)] border p-4">
 *   <GlowingEffect
 *     spread={40}
 *     glow={true}
 *     disabled={false}
 *     proximity={64}
 *   />
 *   <div className="relative">Content</div>
 * </div>
 * ```
 */
const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);

    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } = element.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          const center: [number, number] = [left + width * 0.5, top + height * 0.5];
          const distanceFromCenter = Math.hypot(mouseX - center[0], mouseY - center[1]);
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          const currentAngle = parseFloat(element.style.getPropertyValue("--start")) || 0;
          const targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => {
              element.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration],
    );

    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e: PointerEvent) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);

    return (
      <>
        {/* Static border fallback when disabled */}
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border border-border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            disabled && "!block",
          )}
          aria-hidden="true"
        />
        {/* Animated glow container */}
        <div
          ref={containerRef}
          style={
            {
              "--blur": `${blur}px`,
              "--spread": spread,
              "--start": "0",
              "--active": "0",
              "--glowingeffect-border-width": `${borderWidth}px`,
              "--repeating-conic-gradient-times": "5",
              "--gradient":
                variant === "white"
                  ? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
                  : `radial-gradient(circle, #0033FE 10%, #0033FE00 20%),
                radial-gradient(circle at 40% 40%, #0BF1C3 5%, #0BF1C300 15%),
                radial-gradient(circle at 60% 60%, #5c7cfa 10%, #5c7cfa00 20%),
                radial-gradient(circle at 40% 60%, #1af7c8 10%, #1af7c800 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #0033FE 0%,
                  #0BF1C3 calc(25% / var(--repeating-conic-gradient-times)),
                  #5c7cfa calc(50% / var(--repeating-conic-gradient-times)),
                  #1af7c8 calc(75% / var(--repeating-conic-gradient-times)),
                  #0033FE calc(100% / var(--repeating-conic-gradient-times))
                )`,
            } as React.CSSProperties
          }
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-[var(--blur)]",
            className,
            disabled && "!hidden",
          )}
          aria-hidden="true"
        >
          <div
            className={cn(
              "glow",
              "rounded-[inherit]",
              'after:content-[""] after:rounded-[inherit] after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:[background:var(--gradient)] after:[background-attachment:fixed]",
              "after:opacity-[var(--active)] after:transition-opacity after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:[mask-composite:intersect]",
              "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]",
            )}
          />
        </div>
      </>
    );
  },
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
