"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TenantsError({ error, reset }: ErrorProps) {
  const tCopy = useTranslations("copy.tenantsError");
  const tc = useTranslations("copy.tenantsError");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error · Tenants"
      title={tc("failedToLoadTenants")}
      description={error.message || tCopy("anUnexpectedErrorOccurred")}
      primaryAction={{ label: tCopy("tryAgain"), onClick: reset }}
      secondaryAction={{ label: tCopy("goToDashboard"), href: "/workspace" }}
      meta={error.digest ? { errorId: error.digest } : undefined}
    />
  );
}
