"use client";

import { PageStatus } from "@/components/ui/PageStatus";
import { Link } from "@/i18n/navigation";

export default function LocaleError({
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
      showIcon
      reset={reset}
      LocaleLink={Link}
    />
  );
}
