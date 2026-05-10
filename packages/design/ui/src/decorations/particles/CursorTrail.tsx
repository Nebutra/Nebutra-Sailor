"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import * as React from "react";
import { cn } from "../../utils/cn";

export interface CursorTrailProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Color of the trail particles.
   * Use CSS custom properties for theme compatibility.
   */
  color?: string;
  /** Number of trail particles (default: 8) */
  particleCount?: number;
  /** Size of the main cursor dot in pixels (default: 12) */
  cursorSize?: number;
  /** Size of trail particles in pixels (default: 6) */
  particleSize?: number;
  /** Spring stiffness for cursor movement (default: 300) */
  stiffness?: number;
  /** Spring damping for cursor movement (default: 30) */
  damping?: number;
  /** Whether the trail is enabled (default: true) */
  enabled?: boolean;
  /** Whether to show only in the container or globally */
  containerOnly?: boolean;
}

interface TrailParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

/**
 * CursorTrail - Animated cursor follower with trailing light particles.
 *
 * Creates an elegant mouse trail effect with a primary cursor dot
 * followed by smaller particles that fade out. Perfect for hero sections
 * and interactive areas.
 *
 * @example
 * // Basic usage - covers entire viewport
 * <CursorTrail color="hsl(var(--accent))" />
 *
 * @example
 * // Container-scoped trail
 * <div className="relative">
 *   <CursorTrail containerOnly color="hsl(var(--primary))" />
 *   <HeroContent />
 * </div>
 */
export const CursorTrail = React.forwardRef<HTMLDivElement, CursorTrailProps>(
  (
    {
      color = "hsl(var(--accent))",
      particleCount = 8,
      cursorSize = 12,
      particleSize = 6,
      stiffness = 300,
      damping = 30,
      enabled = true,
      containerOnly = false,
      className,
      ...props
    },
    ref,
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = React.useState(false);
    const [particles, setParticles] = React.useState<TrailParticle[]>([]);
    const particleIdRef = React.useRef(0);

    // Mouse position with spring animation
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springX = useSpring(mouseX, { stiffness, damping });
    const springY = useSpring(mouseY, { stiffness, damping });

    // Track mouse movement
    React.useEffect(() => {
      if (!enabled || shouldReduceMotion) return;

      const handleMouseMove = (e: MouseEvent) => {
        const container = containerRef.current;

        if (containerOnly && container) {
          const rect = container.getBoundingClientRect();
          const isInside =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;

          setIsHovering(isInside);

          if (isInside) {
            mouseX.set(e.clientX - rect.left);
            mouseY.set(e.clientY - rect.top);
          }
        } else {
          setIsHovering(true);
          mouseX.set(e.clientX);
          mouseY.set(e.clientY);
        }
      };

      const handleMouseLeave = () => {
        if (containerOnly) {
          setIsHovering(false);
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      if (containerOnly && containerRef.current) {
        containerRef.current.addEventListener("mouseleave", handleMouseLeave);
      }

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        if (containerOnly && containerRef.current) {
          containerRef.current.removeEventListener("mouseleave", handleMouseLeave);
        }
      };
    }, [enabled, shouldReduceMotion, containerOnly, mouseX, mouseY]);

    // Generate trail particles on mouse move
    React.useEffect(() => {
      if (!enabled || shouldReduceMotion || !isHovering) return;

      const unsubscribeX = springX.on("change", (x) => {
        const y = springY.get();

        // Add new particle
        const newParticle: TrailParticle = {
          id: particleIdRef.current++,
          x,
          y,
          scale: 1,
          opacity: 0.6,
        };

        setParticles((prev) => {
          const updated = [...prev, newParticle].slice(-particleCount);
          return updated;
        });
      });

      return () => unsubscribeX();
    }, [enabled, shouldReduceMotion, isHovering, springX, springY, particleCount]);

    // Cleanup old particles
    React.useEffect(() => {
      if (!enabled || particles.length === 0) return;

      const timer = setTimeout(() => {
        setParticles((prev) => prev.slice(1));
      }, 100);

      return () => clearTimeout(timer);
    }, [enabled, particles]);

    if (!enabled || shouldReduceMotion) {
      return null;
    }

    const TrailContent = (
      <>
        {/* Trail particles */}
        {particles.map((particle, index) => {
          const progress = index / particles.length;
          const scale = 0.3 + progress * 0.7;
          const opacity = progress * 0.5;

          return (
            <motion.div
              key={particle.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: particle.x,
                top: particle.y,
                width: particleSize,
                height: particleSize,
                backgroundColor: color,
                x: -particleSize / 2,
                y: -particleSize / 2,
                scale,
                opacity,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale, opacity }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          );
        })}

        {/* Main cursor dot */}
        {isHovering && (
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              left: springX,
              top: springY,
              width: cursorSize,
              height: cursorSize,
              backgroundColor: color,
              x: -cursorSize / 2,
              y: -cursorSize / 2,
              boxShadow: `0 0 ${cursorSize}px ${color}, 0 0 ${cursorSize * 2}px ${color}`,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.8 }}
            exit={{ scale: 0, opacity: 0 }}
          />
        )}
      </>
    );

    if (containerOnly) {
      return (
        <div
          ref={(node) => {
            containerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          className={cn("absolute inset-0 overflow-hidden pointer-events-none z-50", className)}
          aria-hidden="true"
          {...props}
        >
          {TrailContent}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("fixed inset-0 overflow-hidden pointer-events-none z-50", className)}
        aria-hidden="true"
        {...props}
      >
        {TrailContent}
      </div>
    );
  },
);

CursorTrail.displayName = "CursorTrail";
