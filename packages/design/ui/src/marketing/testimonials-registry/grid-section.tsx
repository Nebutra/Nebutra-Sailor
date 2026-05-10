"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "../../utils/cn";
import { GridPattern } from "../grid-pattern";
import type { TestimonialsCommonProps } from "./types";

// Default testimonials for Nebutra SaaS
const defaultTestimonials = [
  {
    quote:
      "Nebutra transformed how we handle multi-tenant SaaS operations. The architecture is clean, scalable, and production-ready.",
    name: "Sarah Chen",
    role: "Engineering Lead",
    company: "CloudScale Inc",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "The AI-native features and recommendation system integration saved us months of development time. Highly impressed.",
    name: "Marcus Johnson",
    role: "CTO",
    company: "DataFlow Labs",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "Event-driven architecture with Inngest workflows made our background jobs reliable and easy to maintain.",
    name: "Emily Rodriguez",
    role: "Senior Developer",
    company: "TechVenture",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "The white-label system is incredibly flexible. We deployed multiple branded instances in just days.",
    name: "David Park",
    role: "Product Manager",
    company: "BrandForge",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "Supabase + Prisma combo with Row-Level Security gave us enterprise-grade data isolation out of the box.",
    name: "Lisa Wang",
    role: "Backend Architect",
    company: "SecureStack",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "The MCP integration for AI agent tool calling is next-level. Perfect for building AI-powered features.",
    name: "Alex Turner",
    role: "AI Engineer",
    company: "NeuralPath",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "From Stripe billing to Shopify sync, the microservices architecture handles everything seamlessly.",
    name: "Rachel Kim",
    role: "Full-Stack Developer",
    company: "CommerceHub",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "The observability setup with OpenTelemetry and Sentry made debugging production issues effortless.",
    name: "James Mitchell",
    role: "DevOps Lead",
    company: "InfraCore",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
  },
  {
    quote:
      "Clean monorepo structure with Turborepo. Finally, a SaaS template that scales with your team.",
    name: "Nina Patel",
    role: "Tech Lead",
    company: "ScaleUp Studios",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
  },
];

export interface GridTestimonialsProps extends TestimonialsCommonProps {
  title?: string;
  description?: string;
  showHeader?: boolean;
}

export function GridTestimonials({
  items,
  className,
  title = "What Developers Are Saying",
  description = "See how teams are building faster with Nebutra — real stories, real impact, real growth.",
  showHeader = true,
}: GridTestimonialsProps) {
  // Map TestimonialItem to internal format, or use defaults
  const testimonials =
    items.length > 0
      ? items.map((item) => ({
          name: item.author,
          role: item.title || "",
          company: item.company || "",
          quote: item.quote,
          image:
            item.avatarUrl ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        }))
      : defaultTestimonials;

  return (
    <section className={cn("relative w-full pt-10 pb-20 px-4", className)}>
      {/* Background decorations */}
      <div aria-hidden className="absolute inset-0 isolate z-0 contain-strict pointer-events-none">
        <div className="bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsl(var(--foreground)/0.06)_0,hsla(0,0%,55%,0.02)_50%,hsl(var(--foreground)/0.01)_80%)] absolute top-0 left-0 h-[320px] w-[140px] -translate-y-[87.5px] -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--foreground)/0.04)_0,hsl(var(--foreground)/0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[320px] w-[60px] translate-x-[5%] -translate-y-1/2 -rotate-45 rounded-full" />
        <div className="bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--foreground)/0.04)_0,hsl(var(--foreground)/0.01)_80%,transparent_100%)] absolute top-0 left-0 h-[320px] w-[60px] -translate-y-[87.5px] -rotate-45 rounded-full" />
      </div>

      <div className="mx-auto max-w-5xl space-y-8">
        {showHeader && (
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base lg:text-lg">{description}</p>
          </div>
        )}

        <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map(({ name, role, company, quote, image }, index) => (
            <motion.div
              initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
              whileInView={{
                filter: "blur(0px)",
                translateY: 0,
                opacity: 1,
              }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index + 0.1, duration: 0.8 }}
              key={index}
              className="border-foreground/25 relative grid grid-cols-[auto_1fr] gap-x-3 overflow-hidden border border-dashed p-4"
            >
              {/* Grid pattern overlay */}
              <div className="pointer-events-none absolute top-0 left-1/2 -mt-2 -ml-20 h-full w-full [mask-image:linear-gradient(white,transparent)]">
                <div className="from-foreground/5 to-foreground/2 absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
                  <GridPattern
                    width={25}
                    height={25}
                    x={-12}
                    y={4}
                    strokeDasharray="3"
                    className="stroke-foreground/20 absolute inset-0 h-full w-full mix-blend-overlay"
                  />
                </div>
              </div>

              {/* Avatar */}
              <Image
                alt={name}
                src={image}
                className="size-9 rounded-full object-cover"
                width={400}
                height={400}
              />

              {/* Content */}
              <div>
                <div className="-mt-0.5 -space-y-0.5">
                  <p className="text-sm md:text-base font-medium">{name}</p>
                  <span className="text-muted-foreground block text-xs font-light tracking-tight">
                    {role}
                    {company && ` at ${company}`}
                  </span>
                </div>
                <blockquote className="mt-3">
                  <p className="text-foreground text-sm font-light tracking-wide">{quote}</p>
                </blockquote>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
