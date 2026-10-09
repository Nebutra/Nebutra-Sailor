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
      title="This page didn't load."
      description="Something went wrong on our side. Try again; it usually works the second time."
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Go home", href: "/" }}
      {...(error.digest ? { meta: { errorId: error.digest } } : {})}
    />
  );
}
