"use client";

import { Check, Cross, LockClosed, Shield } from "@nebutra/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import { useState } from "react";
import { ShowcaseFrame } from "./showcase-frame";
import type { PackageShowcaseProps } from "./types";

type CellState = "allow" | "deny" | "na";
type RoleKey = "owner" | "admin" | "member" | "viewer";
type ActionKey = "read" | "write" | "delete" | "manage";
type ResourceKey = "project" | "billing" | "audit" | "apikey" | "member";

const COPY = {
  en: {
    roles: { owner: "Owner", admin: "Admin", member: "Member", viewer: "Viewer" } as Record<
      RoleKey,
      string
    >,
    actions: { read: "read", write: "write", delete: "delete", manage: "manage" } as Record<
      ActionKey,
      string
    >,
    resources: {
      project: "Project",
      billing: "Billing",
      audit: "Audit log",
      apikey: "API key",
      member: "Team member",
    } as Record<ResourceKey, string>,
    resource: "Resource",
    footer: "Powered by CASL · evaluated server-side",
  },
  zh: {
    roles: { owner: "Owner", admin: "管理员", member: "成员", viewer: "只读" } as Record<
      RoleKey,
      string
    >,
    actions: { read: "查看", write: "写入", delete: "删除", manage: "管理" } as Record<
      ActionKey,
      string
    >,
    resources: {
      project: "项目",
      billing: "账单",
      audit: "审计日志",
      apikey: "API 密钥",
      member: "团队成员",
    } as Record<ResourceKey, string>,
    resource: "资源",
    footer: "由 CASL 驱动 · 服务端校验",
  },
} as const;

const ROLES: readonly RoleKey[] = ["owner", "admin", "member", "viewer"];
const ACTIONS: readonly ActionKey[] = ["read", "write", "delete", "manage"];
const RESOURCES: readonly ResourceKey[] = ["project", "billing", "audit", "apikey", "member"];

// Permission matrix: role × resource × action → cell state
const MATRIX: Record<RoleKey, Record<ResourceKey, Record<ActionKey, CellState>>> = {
  owner: {
    project: { read: "allow", write: "allow", delete: "allow", manage: "allow" },
    billing: { read: "allow", write: "allow", delete: "allow", manage: "allow" },
    audit: { read: "allow", write: "na", delete: "na", manage: "allow" },
    apikey: { read: "allow", write: "allow", delete: "allow", manage: "allow" },
    member: { read: "allow", write: "allow", delete: "allow", manage: "allow" },
  },
  admin: {
    project: { read: "allow", write: "allow", delete: "allow", manage: "allow" },
    billing: { read: "allow", write: "allow", delete: "deny", manage: "deny" },
    audit: { read: "allow", write: "na", delete: "na", manage: "deny" },
    apikey: { read: "allow", write: "allow", delete: "allow", manage: "deny" },
    member: { read: "allow", write: "allow", delete: "deny", manage: "deny" },
  },
  member: {
    project: { read: "allow", write: "allow", delete: "deny", manage: "deny" },
    billing: { read: "deny", write: "deny", delete: "deny", manage: "deny" },
    audit: { read: "na", write: "na", delete: "na", manage: "deny" },
    apikey: { read: "allow", write: "deny", delete: "deny", manage: "deny" },
    member: { read: "allow", write: "deny", delete: "deny", manage: "deny" },
  },
  viewer: {
    project: { read: "allow", write: "deny", delete: "deny", manage: "deny" },
    billing: { read: "deny", write: "deny", delete: "deny", manage: "deny" },
    audit: { read: "na", write: "na", delete: "na", manage: "deny" },
    apikey: { read: "deny", write: "deny", delete: "deny", manage: "deny" },
    member: { read: "allow", write: "deny", delete: "deny", manage: "deny" },
  },
};

// One cell highlighted per role to indicate "currently checked" permission
const HIGHLIGHT: Record<RoleKey, { resource: ResourceKey; action: ActionKey }> = {
  owner: { resource: "billing", action: "manage" },
  admin: { resource: "project", action: "write" },
  member: { resource: "project", action: "write" },
  viewer: { resource: "project", action: "read" },
};

function PermissionCell({ state, highlighted }: { state: CellState; highlighted: boolean }) {
  const ring = highlighted
    ? "ring-2 ring-[hsl(var(--primary))] ring-offset-2 ring-offset-background"
    : "";

  if (state === "allow") {
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success ${ring}`}
        aria-label="allowed"
      >
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (state === "deny") {
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-destructive/15 text-destructive ${ring}`}
        aria-label="denied"
      >
        <Cross className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/60 ${ring}`}
      aria-label="not applicable"
    >
      <span aria-hidden>—</span>
    </span>
  );
}

export function PermissionsShowcase(_props: PackageShowcaseProps) {
  const { locale } = _props;
  const copy = COPY[locale];
  const [role, setRole] = useState<RoleKey>("admin");
  const highlight = HIGHLIGHT[role];

  return (
    <ShowcaseFrame>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4" aria-hidden />
          <span className="font-medium uppercase tracking-wider">RBAC · ABAC</span>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={role}
          onValueChange={(value) => {
            if (typeof value === "string" && value) setRole(value as RoleKey);
          }}
          aria-label="role selector"
        >
          {ROLES.map((roleKey) => (
            <ToggleGroupItem key={roleKey} value={roleKey} className="text-xs">
              {copy.roles[roleKey]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">{copy.resource}</TableHead>
            {ACTIONS.map((action) => (
              <TableHead key={action} className="text-center">
                <span className="font-mono">{copy.actions[action]}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody bordered>
          {RESOURCES.map((resource) => (
            <TableRow key={resource}>
              <TableCell className="text-foreground">
                <span className="inline-flex items-center gap-2">
                  <LockClosed className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />
                  {copy.resources[resource]}
                </span>
              </TableCell>
              {ACTIONS.map((action) => (
                <TableCell key={action} className="text-center">
                  <span className="inline-flex w-full justify-center">
                    <PermissionCell
                      state={MATRIX[role][resource][action]}
                      highlighted={highlight.resource === resource && highlight.action === action}
                    />
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {copy.footer}
      </p>
    </ShowcaseFrame>
  );
}
