"use client";

// @async-surface-exempt: the workspace list populates the 画布 switcher menu and the project name is one label — a menu owes the user its items, not a skeleton and an empty state.

import {
  Agent,
  Check,
  ChevronDown,
  GridMasonry,
  Lightning,
  Plus,
  Share,
  Sparkles,
  Workflow,
} from "@nebutra/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nebutra/ui/primitives";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Chip, chipClass } from "@/components/ui/chip";
import type { Project } from "@/domain/types";
import { isGatewayMode } from "@/lib/gateway-api";
import { projects as mockProjects } from "@/mock/data";
import { useProject, useWorkspaces } from "@/mock/queries";
import { SYNC_LABEL, type SyncState, useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { CreditsChip } from "./credits-chip";
import { JobsIndicator } from "./jobs-popover";
import { ProfileButton } from "./profile-button";
import { useWorkspaceView } from "./view-selector";

/** A floating group of controls — the top bar is islands over the canvas, not a band (LibTV). */
function Island({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto flex h-10 items-center gap-0.5 rounded-xl border border-border/60 bg-popover/90 px-1 shadow-ambient-sm backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

const SYNC_DOT: Record<SyncState, string> = {
  saved: "var(--status-success)",
  pending: "var(--status-warning)",
  saving: "var(--status-warning)",
  error: "var(--status-danger)",
};

/**
 * The canvas top bar, arranged as LibTV's: on the left the PARA menu, the 工作区 (project) name, the
 * 画布 switcher and the 工作流 / 故事板 toggle; on the right the sync state, 分享, 开通会员, credits, the
 * account and the Agent drawer toggle.
 */
export function WorkspaceTopBar({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const { data: project } = useProject(projectId);
  const { data: list } = useWorkspaces(projectId);
  const [view, setView] = useWorkspaceView();
  const agentOpen = useUiStore((s) => s.agentOpen);
  const setAgentOpen = useUiStore((s) => s.setAgentOpen);
  const setAgent = useUiStore((s) => s.setAgent);
  const agentStatus = useUiStore((s) => s.agent.status);
  const router = useRouter();
  const current = list?.find((w) => w.id === workspaceId);

  return (
    <div className="pointer-events-none absolute inset-x-4 top-4 z-20 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <Island>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Chip aria-label="PARA 菜单" className="gap-1 px-2">
                <span className="font-medium text-body text-foreground tracking-wordmark">
                  PARA
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </Chip>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuItem render={<Link href="/" />}>返回首页</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/projects" />}>我的项目</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/assets" />}>我的资产</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
          <ProjectName projectId={projectId} name={project?.name ?? ""} />
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Chip aria-label="切换画布" className="max-w-48">
                <span className="truncate">{current?.name ?? "画布"}</span>
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              </Chip>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-52">
              <div className="px-2 pt-1 pb-1.5 text-meta text-muted-foreground">画布</div>
              {list?.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => router.push(`/p/${projectId}/w/${w.id}`)}
                >
                  <span className="flex-1 truncate">{w.name}</span>
                  {w.id === workspaceId && <Check className="size-3.5" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/p/${projectId}/w/new`)}>
                <Plus className="size-3.5" />
                新建画布
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Island>
        <Island>
          <Chip
            aria-label="工作流"
            title="工作流"
            pressed={view === "canvas"}
            aria-pressed={view === "canvas"}
            onClick={() => setView("canvas")}
            className="size-8 justify-center p-0"
          >
            <Workflow className="size-4" />
          </Chip>
          <Chip
            aria-label="故事板"
            title="故事板"
            pressed={view === "storyboard"}
            aria-pressed={view === "storyboard"}
            onClick={() => setView("storyboard")}
            className="size-8 justify-center p-0"
          >
            <GridMasonry className="size-4" />
          </Chip>
        </Island>
      </div>

      {/*
        The right side is one island in the same recipe as the left — one height, one fill, one
        radius, chips inside — grouped by dividers: document state · sharing · money · account.
        It used to be seven separately boxed controls in three heights, half bordered, one with a
        yellow gradient icon, which is what made the corner read as assembled rather than designed.
        Agent stands alone, as on LibTV, because it opens a surface rather than reporting state.
      */}
      <div className="flex shrink-0 items-center gap-2">
        <Island>
          <SyncStatus />
          <JobsIndicator />
          <Divider />
          <SharePopover />
          <Divider />
          <Link href="/pro" className={chipClass()}>
            <Sparkles aria-hidden="true" className="size-3.5 text-brand-accent" />
            开通会员
          </Link>
          <Credits />
          <Divider />
          <ProfileButton className="mx-0.5 flex size-7 items-center justify-center rounded-full bg-neutral-4 font-medium text-foreground text-meta hover:bg-neutral-5" />
        </Island>
        <Island>
          <Chip
            pressed={agentOpen}
            aria-pressed={agentOpen}
            onClick={() => {
              const next = !agentOpen;
              setAgentOpen(next);
              if (next && agentStatus === "idle") setAgent({ status: "composing" });
            }}
            className="gap-1.5 px-2.5 font-medium"
          >
            <Agent aria-hidden="true" className="size-4" />
            Agent
          </Chip>
        </Island>
      </div>
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />;
}

function SyncStatus() {
  const sync = useEditorStore((s) => s.sync);
  return (
    <span
      className="flex h-[var(--para-h-chip)] items-center gap-1.5 px-2 text-label text-muted-foreground"
      role="status"
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full"
        style={{ backgroundColor: SYNC_DOT[sync] }}
      />
      {SYNC_LABEL[sync]}
    </span>
  );
}

/**
 * The credits balance. Gateway mode shows the real wallet (CreditsChip, which hides itself when
 * there is no payment API to ask); mock mode shows the bolt alone, since there is no balance to
 * report and a made-up number would be read as real.
 */
function Credits() {
  if (isGatewayMode) {
    return <CreditsChip className={`${chipClass()} gap-1.5 tabular-nums`} />;
  }
  return (
    <Link href="/pro" aria-label="积分" className={`${chipClass()} gap-1.5`}>
      <Lightning aria-hidden="true" className="size-3.5 text-muted-foreground" />
      积分
    </Link>
  );
}

function SharePopover() {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : (window.location.href.split("?")[0] ?? "");
  return (
    <Popover onOpenChange={(open) => open || setCopied(false)}>
      <PopoverTrigger asChild>
        <Chip aria-label="分享" title="分享" className="w-[var(--para-h-chip)] justify-center px-0">
          <Share className="size-3.5" />
        </Chip>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-3 p-4">
        <div>
          <div className="font-medium text-body text-foreground">分享链接</div>
          <p className="mt-0.5 text-label text-muted-foreground">
            拿到链接的团队成员可以查看这个画布。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input size="sm" readOnly aria-label="画布链接" value={url} className="flex-1" />
          <Chip
            tone="primary"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => setCopied(true));
            }}
          >
            {copied ? "已复制" : "复制链接"}
          </Chip>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The 工作区 name, renamed in place. Only the mock adapter can store a new name — the gateway has no
 * project rename route yet — so in gateway mode it is a label.
 * TODO(integration): PATCH /api/v1/para/projects/{id} { name } and enable renaming there.
 */
function ProjectName({ projectId, name }: { projectId: string; name: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const label = name || "未命名工作区";

  if (isGatewayMode) {
    return <span className="max-w-48 truncate px-2 text-label text-foreground">{label}</span>;
  }
  if (editing) {
    return (
      <Input
        size="sm"
        autoFocus
        aria-label="工作区名称"
        defaultValue={name}
        className="h-7 w-44"
        onBlur={(e) => {
          const next = e.currentTarget.value.trim();
          setEditing(false);
          if (!next || next === name) return;
          const row = mockProjects.find((p) => p.id === projectId);
          if (row) row.name = next;
          qc.setQueryData<Project | null>(["project", projectId], (old) =>
            old ? { ...old, name: next } : old,
          );
          void qc.invalidateQueries({ queryKey: ["projects"] });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }
  return (
    <Chip onClick={() => setEditing(true)} title="点击重命名" className="max-w-48">
      <span className="truncate">{label}</span>
    </Chip>
  );
}
