"use client";

import { Button, Toaster, useToasts } from "@nebutra/ui/primitives";

export function ToastDemo() {
  const toasts = useToasts();

  return (
    <div className="relative flex min-h-[300px] w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          onClick={() => {
            toasts.message({ text: "Deployment canceled" });
          }}
        >
          Message
        </Button>
        <Button
          variant="default"
          onClick={() => {
            toasts.success("Domain added");
          }}
        >
          Success
        </Button>
        <Button
          variant="warning"
          onClick={() => {
            toasts.warning("Deployment completed with skipped routes");
          }}
        >
          Warning
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            toasts.error("Couldn’t verify domain. Try again.");
          }}
        >
          Error
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            toasts.message({
              text: "Project archived",
              onUndoAction: () => {
                toasts.success("Project restored");
              },
            });
          }}
        >
          Undo
        </Button>
      </div>
      <Toaster />
    </div>
  );
}
