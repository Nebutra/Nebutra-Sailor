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
  className?: string;
  height?: number; // for fixed-height layouts like stagger/carousel
};
