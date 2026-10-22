"use client";

import { Button, toast } from "@nebutra/ui/primitives";

/**
 * Toasts stack bottom-right and pause on hover. Mount `<Toaster />` once at your
 * app root (this page already does); call `toast` from anywhere.
 */
export function ToastStack() {
  const deploy = () =>
    toast.promise(new Promise((resolve) => setTimeout(resolve, 1800)), {
      loading: "Deploying forge-web…",
      success: "forge-web is live",
      error: "Deploy failed",
    });

  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <Button
        onClick={() =>
          toast.success("Key created", { description: "Copy it now; it is shown once." })
        }
        size="sm"
        variant="outline"
      >
        Success
      </Button>
      <Button
        onClick={() =>
          toast.warning("Usage at 85% of plan", { description: "Upgrade to avoid throttling." })
        }
        size="sm"
        variant="outline"
      >
        Warning
      </Button>
      <Button
        onClick={() =>
          toast.error("Webhook delivery failed", {
            description: "Endpoint returned 502.",
            action: { label: "Retry", onClick: () => toast.message("Retrying…") },
          })
        }
        size="sm"
        variant="outline"
      >
        Error with action
      </Button>
      <Button onClick={deploy} size="sm" variant="outline">
        Promise
      </Button>
      <Button onClick={() => toast.dismiss()} size="sm" variant="ghost">
        Dismiss all
      </Button>
    </div>
  );
}
