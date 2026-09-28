"use client";

import { ArtifactShiftCard, ArtifactShiftCardPreview } from "@nebutra/ui/patterns";

const CODE = `import { getQueue, createJob } from "@nebutra/queue";

const queue = await getQueue();
await queue.enqueue(createJob("email", "send", { to: "dana@acme.com" }));`;

export function ArtifactShiftCardDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <ArtifactShiftCard>
        <p className="font-mono text-muted-foreground text-sm">packages/integrations/queue</p>
        <ArtifactShiftCardPreview
          filename="send-welcome.ts"
          language="ts"
          code={CODE}
          label="Usage"
        />
      </ArtifactShiftCard>
    </div>
  );
}
