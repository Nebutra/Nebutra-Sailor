"use client";

import { PageStatus } from "@/components/ui/PageStatus";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageStatus kind="error" label="Error" message="Something went wrong." showIcon reset={reset} />
  );
}
