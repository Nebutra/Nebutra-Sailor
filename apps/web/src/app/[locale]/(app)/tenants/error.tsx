"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TenantsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error · Tenants"
      title="Failed to load tenants."
      description={
        error.message ||
        "An unexpected error occurred while loading tenants. Try again, or return to the dashboard."
      }
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Go to dashboard", href: "/" }}
      meta={error.digest ? { errorId: error.digest } : undefined}
    />
  );
}
