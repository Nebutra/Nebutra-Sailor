"use client";

import { Button, useConfirm, usePrompt } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ConfirmDialogUseConfirmDemo() {
  const [confirm, confirmDialog] = useConfirm();
  const [prompt, promptDialog] = usePrompt();
  const [log, setLog] = useState("Nothing yet.");

  return (
    <div className="flex flex-col items-center gap-4 p-10">
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="destructive"
          onClick={async () => {
            const ok = await confirm({
              title: "Revoke API Key",
              description: "Requests signed with it start failing immediately.",
              confirmLabel: "Revoke",
              tone: "destructive",
            });
            setLog(ok ? "Key revoked." : "Kept the key.");
          }}
        >
          Revoke key
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const name = await prompt({
              title: "New Project",
              label: "Project name",
              confirmLabel: "Create",
            });
            setLog(name ? `Created ${name}.` : "Cancelled.");
          }}
        >
          New project
        </Button>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {log}
      </p>
      {confirmDialog}
      {promptDialog}
    </div>
  );
}
