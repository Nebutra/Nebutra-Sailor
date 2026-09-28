"use client";

import { ProjectBanner } from "@nebutra/ui/primitives";

export function ProjectBannerDemo() {
  return (
    <div className="flex w-full flex-col gap-3 p-6">
      <ProjectBanner
        variant="warning"
        label="Your trial ends in 3 days."
        callToAction={{ label: "Choose a plan", href: "#" }}
      />
      <ProjectBanner variant="success" label="Domain acme.com is verified and serving traffic." />
    </div>
  );
}
