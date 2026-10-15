"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuditError({ error, reset }: ErrorProps) {
  const tCopy = useTranslations("copy.auditError");
  const tc = useTranslations("copy.auditError");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error · Audit log"
      title={tc("failedToLoadAudit")}
      description={error.message || tCopy("anUnexpectedErrorOccurred")}
      primaryAction={{ label: tCopy("tryAgain"), onClick: reset }}
      secondaryAction={{ label: tCopy("goToDashboard"), href: "/workspace" }}
      meta={error.digest ? { errorId: error.digest } : undefined}
    />
  );
}
