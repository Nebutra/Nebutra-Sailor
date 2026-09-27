"use client";

import { FullPageStatus } from "@nebutra/ui/layout";

export function FullPageStatusDemo() {
  return (
    <div className="w-full">
      <FullPageStatus
        variant="section"
        code="404"
        title="This page moved"
        description="The link you followed points at a page that no longer exists."
        primaryAction={{ label: "Go to dashboard", href: "#" }}
        secondaryAction={{ label: "Contact support", href: "#" }}
      />
    </div>
  );
}
