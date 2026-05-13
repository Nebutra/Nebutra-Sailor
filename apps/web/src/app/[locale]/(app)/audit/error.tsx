"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuditError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error · Audit log"
      title="Failed to load audit log."
      description={
        error.message ||
        "An unexpected error occurred while loading the audit log. Try again, or return to the dashboard."
      }
      primaryAction={{ label: "Try again", onClick: reset }}
      secondaryAction={{ label: "Go to dashboard", href: "/" }}
      meta={error.digest ? { errorId: error.digest } : undefined}
    />
  );
}
