"use client";

import { type ApprovalDecision, EditTool } from "@nebutra/ui/primitives";
import { useState } from "react";

const oldContent = `export const metadata = { title: 'Old' };

export default function Page() {
  return <div>Old content</div>;
}
`;

const newContent = `export const metadata = { title: 'Updated' };

export default function Page() {
  return (
    <div>
      <h1>Release notes</h1>
      <p>New layout applied.</p>
    </div>
  );
}
`;

export function EditToolDemo() {
  const [decision, setDecision] = useState<ApprovalDecision>(null);
  return (
    <div className="w-full max-w-xl">
      <EditTool
        state={decision === "approved" ? "pending" : "completed"}
        filePath="/app/page.tsx"
        oldContent={oldContent}
        newContent={newContent}
        approval={{
          decision,
          onDecisionChange: setDecision,
          approveLabel: "Apply",
          rejectLabel: "Skip",
        }}
      />
    </div>
  );
}
