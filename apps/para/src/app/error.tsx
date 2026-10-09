"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import { useEffect } from "react";

/**
 * A route segment threw. The root layout still stands, so this keeps the app's
 * chrome; `reset` re-renders the segment in place rather than reloading.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest ties this browser log to the server's entry for the same error.
    console.error(error.digest ?? error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error"
      title="这一页没打开。"
      description="是我们这边出了问题。再试一次，通常就好了。"
      primaryAction={{ label: "再试一次", onClick: reset }}
      secondaryAction={{ label: "回首页", href: "/" }}
      {...(error.digest ? { meta: { errorId: error.digest } } : {})}
    />
  );
}
