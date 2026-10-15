"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorProps) {
  const tCopy = useTranslations("copy.webError");
  const tc = useTranslations("copy.webError");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error"
      title={tc("somethingWentWrong")}
      description={error.message || tCopy("anUnexpectedErrorOccurred")}
      primaryAction={{ label: tCopy("tryAgain"), onClick: reset }}
      secondaryAction={{ label: tCopy("goToDashboard"), href: "/workspace" }}
      meta={error.digest ? { errorId: error.digest } : undefined}
    />
  );
}
