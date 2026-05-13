"use client";

import { PageStatus } from "@/components/ui/PageStatus";
import { Link } from "@/i18n/navigation";

export default function RouteError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageStatus
      kind="error"
      label="Error"
      message="Something went wrong."
      reset={reset}
      LocaleLink={Link}
    />
  );
}
