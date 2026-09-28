"use client";

import { ErrorState } from "@nebutra/ui/layout";

export function ErrorStateDemo() {
  return (
    <div className="w-full p-6">
      <ErrorState
        title="Couldn't load invoices"
        message="The billing service did not answer in time. Your data is safe."
        onRetry={() => {}}
        errorId="req_7f3a91"
      />
    </div>
  );
}
