"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "../utils/cn";

interface VerticalMarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
  onItemsRef?: (items: HTMLElement[]) => void;
}

function VerticalMarquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 30,
  onItemsRef,
}: VerticalMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onItemsRef && containerRef.current) {
      const items = Array.from(
        containerRef.current.querySelectorAll(".marquee-item"),
      ) as HTMLElement[];
      onItemsRef(items);
    }
  }, [onItemsRef]);

  return (
    <div
      ref={containerRef}
      className={cn("group flex flex-col overflow-hidden", className)}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 flex-col animate-marquee-vertical",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

// Default items for Nebutra SaaS
const defaultMarqueeItems = [
  "Enterprise Teams",
  "Startup Founders",
  "Product Managers",
  "Engineering Leads",
  "Growth Hackers",
];

export interface CTAWithVerticalMarqueeProps {
  /** CTA title */
  title?: string;
  /** CTA description */
  description?: string;
  /** Primary button text */
  primaryButtonText?: string;
  /** Primary button onClick handler */
  onPrimaryClick?: () => void;
  /** Primary button href (if link) */
  primaryHref?: string;
  /** Secondary button text */
  secondaryButtonText?: string;
  /** Secondary button onClick handler */
  onSecondaryClick?: () => void;
  /** Secondary button href (if link) */
  secondaryHref?: string;
  /** Items to show in the marquee */
  marqueeItems?: string[];
  /** Marquee scroll speed (seconds for full cycle) */
  marqueeSpeed?: number;
  /** Additional className */
  className?: string;
  /** Full screen height or auto */
  fullScreen?: boolean;
}

export default function CTAWithVerticalMarquee({
  title = "Ship Faster with Nebutra",
  description = "The enterprise-grade SaaS monorepo with multi-tenant support, AI-native features, and production-ready architecture. Start building in minutes.",
  primaryButtonText = "GET STARTED FREE",
  onPrimaryClick,
  primaryHref,
  secondaryButtonText = "VIEW DOCUMENTATION",
  onSecondaryClick,
  secondaryHref,
  marqueeItems = defaultMarqueeItems,
  marqueeSpeed = 20,
  className,
  fullScreen = true,
}: CTAWithVerticalMarqueeProps) {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marqueeContainer = marqueeRef.current;
    if (!marqueeContainer) return;

    const updateOpacity = () => {
      const items = marqueeContainer.querySelectorAll(".marquee-item");
      const containerRect = marqueeContainer.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      items.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterY = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(centerY - itemCenterY);
        const maxDistance = containerRect.height / 2;
        const normalizedDistance = Math.min(distance / maxDistance, 1);
        const opacity = 1 - normalizedDistance * 0.75;
        (item as HTMLElement).style.opacity = opacity.toString();
      });
    };

    const animationFrame = () => {
      updateOpacity();
      requestAnimationFrame(animationFrame);
    };

    const frame = requestAnimationFrame(animationFrame);

    return () => cancelAnimationFrame(frame);
  }, []);

  const PrimaryButton = primaryHref ? "a" : "button";
  const SecondaryButton = secondaryHref ? "a" : "button";

  return (
    <div
      className={cn(
        "bg-background text-foreground flex items-center justify-center px-6 py-12 overflow-hidden",
        fullScreen && "min-h-screen",
        className,
      )}
    >
      <div className="w-full max-w-7xl animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Left Content */}
          <div className="space-y-8 max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-tight tracking-tight text-foreground animate-fade-in-up [animation-delay:200ms]">
              {title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in-up [animation-delay:400ms]">
              {description}
            </p>
            {/* biome-ignore lint/a11y/useSemanticElements: ARIA headless structure */}
            <div
              className="flex flex-wrap gap-4 animate-fade-in-up [animation-delay:600ms]"
              role="group"
              aria-label="Call to action buttons"
            >
              <PrimaryButton
                {...(primaryHref ? { href: primaryHref } : {})}
                onClick={onPrimaryClick}
                className="group relative px-6 py-3 bg-foreground text-background rounded-[var(--radius-md)] font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="relative z-10">{primaryButtonText}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </PrimaryButton>
              <SecondaryButton
                {...(secondaryHref ? { href: secondaryHref } : {})}
                onClick={onSecondaryClick}
                className="group relative px-6 py-3 bg-secondary text-secondary-foreground rounded-[var(--radius-md)] font-medium overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="relative z-10">{secondaryButtonText}</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </SecondaryButton>
            </div>
          </div>

          {/* Right Marquee */}
          <div
            ref={marqueeRef}
            className="relative h-[32rem] lg:h-[40rem] flex items-center justify-center animate-fade-in-up [animation-delay:400ms]"
            aria-label="Scrolling list of target audiences"
            role="marquee"
          >
            <div className="relative w-full h-full">
              <VerticalMarquee speed={marqueeSpeed} className="h-full">
                {marqueeItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-light tracking-tight py-8 marquee-item"
                  >
                    {item}
                  </div>
                ))}
              </VerticalMarquee>

              {/* Top vignette */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-background via-background/50 to-transparent z-10"></div>

              {/* Bottom vignette */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/50 to-transparent z-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { VerticalMarquee };
