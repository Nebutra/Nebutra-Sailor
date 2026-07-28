export type TestimonialItem = {
  id: string | number;
  quote: string;
  author: string; // e.g. "Alex"
  title?: string; // e.g. "CTO"
  company?: string; // e.g. "TechCorp"
  avatarUrl?: string;
};

export type TestimonialsVariant = "stagger" | "marquee3d" | "marquee" | "grid" | "carousel";

export type TestimonialsCommonProps = {
  items: TestimonialItem[];
  className?: string | undefined;
  height?: number | undefined; // for fixed-height layouts like stagger/carousel
};
