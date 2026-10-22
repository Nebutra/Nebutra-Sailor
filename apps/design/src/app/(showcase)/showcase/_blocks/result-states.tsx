"use client";

import { Inbox } from "@nebutra/icons";
import { EmptyState, ErrorState, LoadingState } from "@nebutra/ui/layout";
import { Button, Skeleton, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { useState } from "react";

type View = "loading" | "empty" | "error" | "loaded";

const ROWS = ["Invoice 0142", "Invoice 0141", "Invoice 0140"];

/** Every list has four states. Design the three that are not "loaded" on purpose, not by default. */
export function ResultStates() {
  const [view, setView] = useState<View>("empty");

  return (
    <div className="flex w-full flex-col gap-4">
      <ToggleGroup
        aria-label="State"
        onValueChange={(value) =>
          typeof value === "string" && value ? setView(value as View) : undefined
        }
        type="single"
        value={view}
      >
        <ToggleGroupItem value="loading">Loading</ToggleGroupItem>
        <ToggleGroupItem value="empty">Empty</ToggleGroupItem>
        <ToggleGroupItem value="error">Failed</ToggleGroupItem>
        <ToggleGroupItem value="loaded">Loaded</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex min-h-64 items-center justify-center rounded-[var(--radius-lg)] border border-border p-6">
        {view === "loading" ? (
          <div className="flex w-full flex-col gap-4">
            <LoadingState message="Loading invoices" size="small" />
            <div className="flex flex-col gap-3">
              {ROWS.map((row) => (
                <Skeleton className="h-10 w-full" key={row} />
              ))}
            </div>
          </div>
        ) : null}
        {view === "empty" ? (
          <EmptyState
            action={<Button size="sm">Create invoice</Button>}
            description="Invoices you send will show up here, newest first."
            icon={<Inbox size={20} />}
            title="No invoices yet"
          />
        ) : null}
        {view === "error" ? (
          <ErrorState
            errorId="req_7f3a91"
            message="The billing service did not answer in time. Your data is safe."
            onRetry={() => setView("loading")}
            title="Couldn't load invoices"
          />
        ) : null}
        {view === "loaded" ? (
          <ul className="w-full divide-y divide-border">
            {ROWS.map((row) => (
              <li className="py-3 text-sm" key={row}>
                {row}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
