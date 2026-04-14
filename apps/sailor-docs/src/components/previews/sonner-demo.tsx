"use client";

import { Button } from "@nebutra/ui/primitives";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

export function SonnerDemo() {
  const [showToast, setShowToast] = useState(false);

  return (
    <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
      <Button
        variant="default"
        onClick={() => {
          setShowToast(false);
          setTimeout(() => setShowToast(true), 100);
        }}
      >
        Show Toast Notification
      </Button>

      {/* Mock Sonner Toast */}
      {showToast && (
        <div className="bottom-4 right-4 animate-in slide-in-from-bottom-5 fade-in absolute duration-300">
          <div className="gap-3 p-4 pr-8 max-w-sm flex items-center rounded-lg border bg-background shadow-lg">
            <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Action successful</span>
              <span className="text-sm text-muted-foreground">
                The resource has been updated perfectly.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
