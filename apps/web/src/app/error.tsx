"use client";

import { FullPageStatus } from "@nebutra/ui/layout";
import { useTranslations } from "next-intl";
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
  const tCopy = useTranslations("copy.webError");
  const tc = useTranslations("copy.webError");
  useEffect(() => {
    // The digest ties this browser log to the server's entry for the same error.
    console.error(error.digest ?? error);
  }, [error]);

  return (
    <FullPageStatus
      variant="section"
      code="Error"
      title={tc("thisPageDidnT")}
      description={tc("somethingWentWrongOn")}
      primaryAction={{ label: tCopy("tryAgain"), onClick: reset }}
      secondaryAction={{ label: tCopy("goHome"), href: "/" }}
      {...(error.digest ? { meta: { errorId: error.digest } } : {})}
    />
  );
}
