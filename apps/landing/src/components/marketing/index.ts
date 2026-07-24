/**
 * Marketing components for landing page
 *
 * These are wrapper components that integrate @nebutra/marketing
 * with specific landing page needs and configurations.
 */

export { LaunchBannerWrapper } from "./LaunchBannerWrapper";
export { ProductHuntSection } from "./ProductHuntSection";
export { sampleTestimonials, TestimonialsSection } from "./TestimonialsSection";

export type SocialProofStats = {
  users?: number;
  rating?: number;
  productHuntUpvotes?: number;
};
