"use client";

import { Button, ConfirmDialog } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-center p-10">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Revoke API key
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        variant="destructive"
        title="Revoke this API key?"
        description="Requests signed with it start failing immediately. Services using it need a new key."
        confirmText="Revoke key"
        onConfirm={() => setOpen(false)}
      />
    </div>
  );
}
