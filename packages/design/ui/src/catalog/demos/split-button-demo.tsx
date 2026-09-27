"use client";

import { SplitButton, SplitButtonMenuItem } from "@nebutra/ui/primitives";

export function SplitButtonDemo() {
  return (
    <div className="flex items-center justify-center p-10">
      <SplitButton
        buttonProps={{ onClick: () => {} }}
        menuButtonLabel="More deploy options"
        menuItems={
          <>
            <SplitButtonMenuItem
              title="Deploy to preview"
              description="Build this branch without promoting it"
            />
            <SplitButtonMenuItem
              title="Deploy and promote"
              description="Replace production once checks pass"
            />
            <SplitButtonMenuItem
              title="Redeploy without cache"
              description="Rebuild every dependency from scratch"
            />
          </>
        }
      >
        Deploy
      </SplitButton>
    </div>
  );
}
