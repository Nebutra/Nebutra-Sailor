"use client";

import { getProductHuntUrl, LaunchBanner, useLaunchBannerState } from "@nebutra/marketing";

interface LaunchBannerWrapperProps {
  postSlug: string;
  launchDate?: string;
  isLaunching?: boolean;
}

/**
 * Launch banner wrapper with dismissal state management
 */
export function LaunchBannerWrapper({
  postSlug,
  launchDate,
  isLaunching = false,
}: LaunchBannerWrapperProps) {
  const { isDismissed, dismiss } = useLaunchBannerState("product-hunt-launch");

  // Don't show if not launching or dismissed
  if (!isLaunching || isDismissed) {
    return null;
  }

  const phUrl = getProductHuntUrl(postSlug);
  const hasCountdown = !!launchDate && new Date(launchDate) > new Date();

  return (
    <LaunchBanner
      title="Live on Product Hunt"
      subtitle="The launch page is open for review"
      ctaText="Vote on Product Hunt"
      ctaLink={phUrl}
      variant="top"
      theme="product-hunt"
      dismissible
      onDismiss={dismiss}
      showCountdown={hasCountdown}
      countdownEndDate={launchDate}
    />
  );
}

export default LaunchBannerWrapper;
