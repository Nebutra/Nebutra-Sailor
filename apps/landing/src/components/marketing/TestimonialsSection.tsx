"use client";

import { TestimonialsWall } from "@nebutra/marketing";

type TestimonialSource = "product-hunt" | "twitter" | "linkedin" | "g2" | "direct";

interface Testimonial {
  id: string;
  authorName: string;
  authorRole?: string;
  authorCompany?: string;
  content: string;
  rating?: number;
  source: TestimonialSource;
  date?: string;
  featured?: boolean;
}

interface TestimonialsSectionProps {
  title?: string;
  subtitle?: string;
  testimonials: Testimonial[];
  variant?: "grid" | "masonry" | "marquee";
  className?: string;
}

/**
 * Testimonials section for landing page
 */
export function TestimonialsSection({
  title = "Loved by developers worldwide",
  subtitle = "See what our users are saying about Nebutra",
  testimonials,
  variant = "grid",
  className,
}: TestimonialsSectionProps) {
  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <div className="mx-auto max-w-[1400px] px-4 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Testimonials */}
        <TestimonialsWall
          testimonials={testimonials}
          variant={variant}
          columns={3}
          showSourceIcons
          showRatings
          scrollSpeed="normal"
          maxItems={testimonials.length}
          filterSource={[]}
          className=""
        />
      </div>
    </section>
  );
}

/**
 * Sample testimonials for demo/development
 */
export const sampleTestimonials: Testimonial[] = [
  {
    id: "1",
    authorName: "Sarah Chen",
    authorRole: "CTO",
    authorCompany: "TechStart AI",
    content:
      "Nebutra cut our development time in half. The multi-tenant architecture and AI features are exactly what we needed to scale our SaaS.",
    rating: 5,
    source: "product-hunt" as TestimonialSource,
    date: "2025-01-15",
    featured: true,
  },
  {
    id: "2",
    authorName: "Marcus Johnson",
    authorRole: "Lead Developer",
    authorCompany: "DataFlow Inc",
    content:
      "The best monorepo setup I've worked with. Everything just works - from the design system to the API gateway.",
    rating: 5,
    source: "twitter" as TestimonialSource,
    date: "2025-01-10",
  },
  {
    id: "3",
    authorName: "Emma Wilson",
    authorRole: "Founder",
    authorCompany: "CloudSync",
    content:
      "We went from idea to production in 3 weeks. Nebutra's architecture handled our growth seamlessly.",
    rating: 5,
    source: "linkedin" as TestimonialSource,
    date: "2025-01-08",
  },
  {
    id: "4",
    authorName: "Alex Rivera",
    authorRole: "Engineering Manager",
    authorCompany: "FinTech Co",
    content:
      "The caching strategies and rate limiting packages saved us months of work. Enterprise-ready out of the box.",
    rating: 4,
    source: "g2" as TestimonialSource,
    date: "2025-01-05",
  },
  {
    id: "5",
    authorName: "Yuki Tanaka",
    authorRole: "Solo Founder",
    authorCompany: "IndieHacker",
    content:
      "Perfect for indie hackers who want enterprise-grade infrastructure. The i18n support is fantastic for global launches.",
    rating: 5,
    source: "product-hunt" as TestimonialSource,
    date: "2025-01-03",
  },
  {
    id: "6",
    authorName: "David Park",
    authorRole: "VP Engineering",
    authorCompany: "ScaleUp",
    content:
      "We evaluated 10+ boilerplates. Nebutra was the only one with proper multi-tenant support and observability built-in.",
    rating: 5,
    source: "direct" as TestimonialSource,
    date: "2025-01-01",
  },
];

export default TestimonialsSection;
