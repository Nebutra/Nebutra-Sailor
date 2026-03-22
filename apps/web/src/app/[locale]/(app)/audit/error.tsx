"use client";

import { AnimateIn } from "@nebutra/ui/components";
import { ErrorState } from "@nebutra/ui/layout";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuditError({ error, reset }: ErrorProps) {
  useEffect(() => {}, []);

  return (
    <section className="mx-auto w-full max-w-7xl" role="alert" aria-label="Audit error">
      <AnimateIn preset="fadeUp">
        <ErrorState
          title="Failed to load audit log"
          message={error.message || "An unexpected error occurred. Please try again."}
          onRetry={reset}
        />
      </AnimateIn>
    </section>
  );
}
