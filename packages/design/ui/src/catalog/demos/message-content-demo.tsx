"use client";

import { MessageContent } from "@nebutra/ui/primitives";

const REPLY = `Your usage is **38% higher** than last month. Most of it comes from two places:

1. \`/v1/embeddings\` — batch jobs moved from nightly to hourly.
2. \`/v1/chat\` — the support assistant launched on Tuesday.

\`\`\`ts
await metering.getQuota("org_123", "api_calls");
\`\`\`

Want me to set an alert at 80% of the quota?`;

export function MessageContentDemo() {
  return (
    <div className="w-full max-w-xl p-6">
      <MessageContent>{REPLY}</MessageContent>
    </div>
  );
}
