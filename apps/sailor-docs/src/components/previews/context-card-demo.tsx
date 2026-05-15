"use client";

import { Button, ContextCard } from "@nebutra/ui/primitives";

export function ContextCardDemo() {
  return (
    <ContextCard.Trigger
      side="top"
      content={
        <ContextCard.Entity
          title="Nebula Console"
          description="nebutra/production"
          metadata={[
            { label: "Plan", value: "Pro" },
            { label: "Owner", value: "Platform" },
            { label: "Last Active", value: "2m ago" },
          ]}
          action={
            <Button size="tiny" variant="outline" className="w-full">
              Open Project
            </Button>
          }
        />
      }
    >
      <button
        type="button"
        className="cursor-default underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Nebula Console
      </button>
    </ContextCard.Trigger>
  );
}
