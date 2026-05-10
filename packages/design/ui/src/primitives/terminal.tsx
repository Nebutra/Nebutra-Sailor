"use client";

import { type MotionProps, motion, useInView } from "motion/react";
import { Children, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Context
// =============================================================================

interface SequenceContextValue {
  completeItem: (index: number) => void;
  activeIndex: number;
  sequenceStarted: boolean;
}

const SequenceContext = createContext<SequenceContextValue | null>(null);
const useSequence = () => useContext(SequenceContext);

const ItemIndexContext = createContext<number | null>(null);
const useItemIndex = () => useContext(ItemIndexContext);

// =============================================================================
// Types
// =============================================================================

export interface AnimatedSpanProps extends MotionProps {
  /** Content to be faded in */
  children: React.ReactNode;
  /** Delay in ms before animation starts (when sequence is false) */
  delay?: number;
  /** Custom CSS class */
  className?: string;
  /** Wait for viewport visibility before animating when unsequenced */
  startOnView?: boolean;
}

export interface TypingAnimationProps extends MotionProps {
  /** Text to be typed (must be string) */
  children: string;
  /** Custom CSS class */
  className?: string;
  /** Milliseconds per character */
  duration?: number;
  /** Delay in ms before typing starts (when sequence is false) */
  delay?: number;
  /** The component type to render */
  as?: React.ElementType;
  /** Wait for viewport visibility before typing when unsequenced */
  startOnView?: boolean;
}

export interface TerminalProps {
  /** Terminal content: list of TypingAnimation/AnimatedSpan */
  children: React.ReactNode;
  /** Custom CSS class */
  className?: string;
  /** Enable auto sequencing so each line starts after previous */
  sequence?: boolean;
  /** Start sequencing when terminal enters viewport */
  startOnView?: boolean;
}

// =============================================================================
// AnimatedSpan Component
// =============================================================================

/**
 * AnimatedSpan - Fade-in animated content for Terminal
 *
 * @example
 * ```tsx
 * <AnimatedSpan>✔ Task completed successfully.</AnimatedSpan>
 * ```
 */
export function AnimatedSpan({
  children,
  delay = 0,
  className,
  startOnView = false,
  ...props
}: AnimatedSpanProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(elementRef as React.RefObject<Element>, {
    amount: 0.3,
    once: true,
  });

  const sequence = useSequence();
  const itemIndex = useItemIndex();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!sequence || itemIndex === null) return;
    if (!sequence.sequenceStarted) return;
    if (hasStarted) return;
    if (sequence.activeIndex === itemIndex) {
      setHasStarted(true);
    }
  }, [sequence?.activeIndex, sequence?.sequenceStarted, hasStarted, itemIndex, sequence]);

  const shouldAnimate = sequence ? hasStarted : startOnView ? isInView : true;

  return (
    <motion.div
      ref={elementRef}
      initial={{ opacity: 0, y: -5 }}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }}
      transition={{ duration: 0.3, delay: sequence ? 0 : delay / 1000 }}
      className={cn("grid text-sm font-normal tracking-tight", className)}
      onAnimationComplete={() => {
        if (!sequence) return;
        if (itemIndex === null) return;
        sequence.completeItem(itemIndex);
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// TypingAnimation Component
// =============================================================================

/**
 * TypingAnimation - Character-by-character typing effect
 *
 * @example
 * ```tsx
 * <TypingAnimation duration={50}>pnpm install @nebutra/ui</TypingAnimation>
 * ```
 */
export function TypingAnimation({
  children,
  className,
  duration = 60,
  delay = 0,
  as: Component = "span",
  startOnView = true,
  ...props
}: TypingAnimationProps) {
  if (typeof children !== "string") {
    throw new Error("TypingAnimation: children must be a string.");
  }

  const MotionComponent = useMemo(
    () =>
      motion.create(Component, {
        forwardMotionProps: true,
      }),
    [Component],
  );

  const [displayedText, setDisplayedText] = useState<string>("");
  const [started, setStarted] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const isInView = useInView(elementRef as React.RefObject<Element>, {
    amount: 0.3,
    once: true,
  });

  const sequence = useSequence();
  const itemIndex = useItemIndex();

  useEffect(() => {
    if (sequence && itemIndex !== null) {
      if (!sequence.sequenceStarted) return;
      if (started) return;
      if (sequence.activeIndex === itemIndex) {
        setStarted(true);
      }
      return;
    }

    if (!startOnView) {
      const startTimeout = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(startTimeout);
    }

    if (!isInView) return;

    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [
    delay,
    startOnView,
    isInView,
    started,
    sequence?.activeIndex,
    sequence?.sequenceStarted,
    itemIndex,
    sequence,
  ]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const typingEffect = setInterval(() => {
      if (i < children.length) {
        setDisplayedText(children.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingEffect);
        if (sequence && itemIndex !== null) {
          sequence.completeItem(itemIndex);
        }
      }
    }, duration);

    return () => {
      clearInterval(typingEffect);
    };
  }, [children, duration, started, sequence, itemIndex]);

  return (
    <MotionComponent
      ref={elementRef}
      className={cn("text-sm font-normal tracking-tight", className)}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  );
}

// =============================================================================
// Terminal Component
// =============================================================================

/**
 * Terminal - MacOS-style terminal UI with typing animations
 *
 * @description
 * A terminal component that displays command-line style content with
 * sequenced typing animations. Each child (TypingAnimation or AnimatedSpan)
 * starts when the previous one completes.
 *
 * @example Basic usage
 * ```tsx
 * <Terminal>
 *   <TypingAnimation>pnpm dlx shadcn@latest init</TypingAnimation>
 *   <AnimatedSpan>✔ Preflight checks.</AnimatedSpan>
 *   <AnimatedSpan>✔ Validating Tailwind CSS.</AnimatedSpan>
 *   <TypingAnimation>Success! Project initialized.</TypingAnimation>
 * </Terminal>
 * ```
 *
 * @example Without sequencing
 * ```tsx
 * <Terminal sequence={false}>
 *   <AnimatedSpan delay={0}>Line 1</AnimatedSpan>
 *   <AnimatedSpan delay={500}>Line 2</AnimatedSpan>
 *   <AnimatedSpan delay={1000}>Line 3</AnimatedSpan>
 * </Terminal>
 * ```
 */
export function Terminal({
  children,
  className,
  sequence = true,
  startOnView = true,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(containerRef as React.RefObject<Element>, {
    amount: 0.3,
    once: true,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const sequenceHasStarted = sequence ? !startOnView || isInView : false;

  const contextValue = useMemo<SequenceContextValue | null>(() => {
    if (!sequence) return null;
    return {
      completeItem: (index: number) => {
        setActiveIndex((current) => (index === current ? current + 1 : current));
      },
      activeIndex,
      sequenceStarted: sequenceHasStarted,
    };
  }, [sequence, activeIndex, sequenceHasStarted]);

  const wrappedChildren = useMemo(() => {
    if (!sequence) return children;
    const array = Children.toArray(children);
    return array.map((child, index) => (
      <ItemIndexContext.Provider key={index} value={index}>
        {child as React.ReactNode}
      </ItemIndexContext.Provider>
    ));
  }, [children, sequence]);

  const content = (
    <div
      ref={containerRef}
      className={cn(
        "border-border bg-background z-0 h-full max-h-[400px] w-full max-w-lg rounded-[var(--radius-xl)] border",
        className,
      )}
    >
      {/* Traffic lights */}
      <div className="border-border flex flex-col gap-y-2 border-b p-4">
        <div className="flex flex-row gap-x-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <div className="h-2 w-2 rounded-full bg-green-500" />
        </div>
      </div>
      {/* Content */}
      <pre className="p-4">
        <code className="grid gap-y-1 overflow-auto">{wrappedChildren}</code>
      </pre>
    </div>
  );

  if (!sequence) return content;

  return <SequenceContext.Provider value={contextValue}>{content}</SequenceContext.Provider>;
}
