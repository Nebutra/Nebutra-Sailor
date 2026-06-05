"use client";

import { ChevronRight } from "@nebutra/icons";
import Image from "next/image";
import Link from "next/link";
import { AnimatedGroup } from "../primitives/animated-group";
import { cn } from "../utils/cn";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring",
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export interface CustomerLogo {
  /** Logo image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Logo height in pixels */
  height: number;
}

export interface CustomersSectionProps {
  /** Array of customer logos to display */
  customers: CustomerLogo[];
  /** Link text for "Meet Our Customers" */
  linkText?: string;
  /** Link href */
  linkHref?: string;
  /** Additional className */
  className?: string;
}

/**
 * CustomersSection - Animated logo cloud with hover reveal
 *
 * Displays customer/partner logos in a grid with staggered animation.
 * On hover, shows a "Meet Our Customers" link overlay.
 *
 * @example
 * ```tsx
 * <CustomersSection
 *   customers={[
 *     { src: "/logos/nvidia.svg", alt: "Nvidia", height: 20 },
 *     { src: "/logos/github.svg", alt: "GitHub", height: 16 },
 *   ]}
 * />
 * ```
 */
export function CustomersSection({
  customers = [],
  linkText = "Meet Our Customers",
  linkHref = "/customers",
  className,
}: CustomersSectionProps) {
  return (
    <section
      className={cn("bg-background pb-16 pt-16 md:pb-32", className)}
      aria-label="Our customers"
    >
      <div className="group relative m-auto max-w-5xl px-6">
        {/* Hover overlay with link */}
        <div
          className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100"
          aria-hidden="true"
        >
          <Link
            href={linkHref}
            className="block text-sm text-foreground duration-150 hover:opacity-75 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-sm)]"
          >
            <span>{linkText}</span>
            <ChevronRight className="ml-1 inline-block size-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Logo grid */}
        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.75,
                },
              },
            },
            ...transitionVariants,
          }}
          className="mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-[filter,opacity] duration-500 group-hover:opacity-50 group-hover:blur-sm motion-reduce:transition-opacity motion-reduce:group-hover:blur-none sm:gap-x-16 sm:gap-y-14"
        >
          {customers.map((logo, index) => (
            <div key={index} className="flex">
              <Image
                className="mx-auto h-auto w-fit dark:invert"
                src={logo.src}
                alt={logo.alt}
                width={logo.width || 400}
                height={logo.height || 400}
              />
            </div>
          ))}
        </AnimatedGroup>
      </div>
    </section>
  );
}
