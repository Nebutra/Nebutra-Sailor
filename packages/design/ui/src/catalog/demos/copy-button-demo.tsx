"use client";

import { CopyButton } from "@nebutra/ui/primitives";

export function CopyButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-6">
      <CopyButton value="npx create-sailor@latest my-app" label="Copy command" showToast={false} />
      <CopyButton
        value="prj_8Fq2mW4nZt"
        iconType="hash"
        label="Copy project ID"
        variant="tertiary"
        showToast={false}
      />
      <CopyButton
        value="https://acme.com/invite/7Hq2"
        iconType="link"
        label="Copy invite link"
        variant="secondary"
        showToast={false}
      />
    </div>
  );
}
