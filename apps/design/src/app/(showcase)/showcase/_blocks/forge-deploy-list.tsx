"use client";

import { GitBranch, MoreHorizontal } from "@nebutra/icons";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilterPills,
  StatusDot,
  toast,
} from "@nebutra/ui/primitives";
import { useState } from "react";

type State = "READY" | "BUILDING" | "ERROR";

const DEPLOYS: {
  id: string;
  message: string;
  branch: string;
  when: string;
  state: State;
  production?: boolean;
}[] = [
  {
    id: "d_91",
    message: "Cache the model catalog at the edge",
    branch: "main",
    when: "3m ago",
    state: "BUILDING",
  },
  {
    id: "d_90",
    message: "Fix preview env var inheritance",
    branch: "main",
    when: "1h ago",
    state: "READY",
    production: true,
  },
  {
    id: "d_89",
    message: "Bump runtime to Node 22",
    branch: "chore/node-22",
    when: "5h ago",
    state: "ERROR",
  },
  {
    id: "d_88",
    message: "Add deploy hooks to project settings",
    branch: "feat/hooks",
    when: "Yesterday",
    state: "READY",
  },
];

/** A deployment list is a filter plus rows; the dot carries the state and the label repeats it for people who cannot see colour. */
export function ForgeDeployList() {
  const [filter, setFilter] = useState("all");
  const count = (state: State) => DEPLOYS.filter((d) => d.state === state).length;
  const rows = filter === "all" ? DEPLOYS : DEPLOYS.filter((d) => d.state === filter);

  return (
    <div className="flex w-full flex-col gap-4">
      <FilterPills
        onValueChange={setFilter}
        options={[
          { value: "all", label: "All", count: DEPLOYS.length },
          { value: "READY", label: "Ready", count: count("READY") },
          { value: "BUILDING", label: "Building", count: count("BUILDING") },
          { value: "ERROR", label: "Error", count: count("ERROR") },
        ]}
        size="sm"
        value={filter}
      />
      <ul className="divide-y divide-border rounded-[var(--radius-lg)] border border-border">
        {rows.map((deploy) => (
          <li className="flex items-center gap-4 px-4 py-3" key={deploy.id}>
            <div className="w-24 shrink-0">
              <StatusDot label state={deploy.state} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-foreground text-sm">{deploy.message}</span>
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <GitBranch aria-hidden="true" size={12} />
                {deploy.branch}
                <span aria-hidden="true">·</span>
                {deploy.when}
              </span>
            </div>
            {deploy.production ? (
              <Badge size="sm" variant="blue-subtle">
                Production
              </Badge>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Actions for ${deploy.id}`}
                  iconSize="sm"
                  shape="square"
                  variant="ghost"
                >
                  <MoreHorizontal aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => toast.message(`Redeploying ${deploy.id}`)}>
                  Redeploy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.message("Deployment URL copied")}>
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive-strong">
                  Roll back to this
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-center text-muted-foreground text-sm">
            No deployments match this filter.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
