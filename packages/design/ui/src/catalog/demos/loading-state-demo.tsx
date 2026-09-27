"use client";

import { LoadingState } from "@nebutra/ui/layout";

export function LoadingStateDemo() {
  return (
    <div className="w-full p-6">
      <LoadingState message="Loading your projects" size="medium" />
    </div>
  );
}
