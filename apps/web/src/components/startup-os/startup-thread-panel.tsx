"use client";

/**
 * The unified conversational column of the workspace.
 *
 * One column, three stacked bands: the project header (nav toggle + project
 * switcher), the thread history (proposition / compiled context / the selected
 * governed run with its real approve+execute actions), and the live chat panel
 * that streams plan narration and file writes. The bands are separated by
 * spacing inside one continuous `neutral-1` column — no rules, no dividers; the
 * column itself is set off from the working surface by the `neutral-2` chrome
 * showing through the gutter between them.
 */

import { ArrowRight, ChevronDown, SidebarLeft } from "@nebutra/icons";
import { companyName, valueProposition } from "@nebutra/startup-os/company-context/projection";
import type { StartupOperatingRun, StartupOSProject } from "@nebutra/startup-os/compiler";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { StartupChatPanel } from "./startup-chat-panel";
import { formatRunStatus, isExecutableRun } from "./startup-os-model";
import type { UseStartupConversationResult } from "./use-startup-conversation";

interface ThreadItem {
  readonly key: string;
  readonly title: string;
  readonly body: string;
  readonly role: "user" | "assistant";
  readonly run: StartupOperatingRun | null;
}

function buildThreadItems(
  project: StartupOSProject,
  selectedRun: StartupOperatingRun | null,
): readonly ThreadItem[] {
  const items: ThreadItem[] = [
    {
      key: "proposition",
      title: "Proposition captured",
      body: project.thesis,
      role: "user",
      run: null,
    },
    {
      key: "context",
      title: "CompanyContext compiled",
      body: valueProposition(project.companyContext),
      role: "assistant",
      run: null,
    },
  ];
  if (selectedRun) {
    items.push({
      key: "run",
      title: `Selected run / ${selectedRun.stage}`,
      body: `${selectedRun.summary} Approval: ${selectedRun.approval}. Status: ${formatRunStatus(
        selectedRun.status,
      )}.`,
      role: "assistant",
      run: selectedRun,
    });
  }
  return items;
}

export interface StartupThreadPanelProps {
  readonly activityCount: number;
  /**
   * Injectable conversation state, forwarded to the chat panel. Production
   * callers omit it and the panel runs the real SSE hook; stories and tests
   * hand it a fully formed fake so nothing touches the network.
   */
  readonly conversation?: UseStartupConversationResult;
  readonly isApproving: boolean;
  readonly isExecuting: boolean;
  readonly onApprove: () => void;
  readonly onChatApplied: () => void;
  readonly onExecuteRun: (runId: string) => void;
  readonly onSelectProject: (project: StartupOSProject) => void;
  readonly onToggleNav: () => void;
  readonly project: StartupOSProject;
  readonly projects: readonly StartupOSProject[];
  readonly selectedRun: StartupOperatingRun | null;
}

export function StartupThreadPanel({
  activityCount,
  conversation,
  isApproving,
  isExecuting,
  onApprove,
  onChatApplied,
  onExecuteRun,
  onSelectProject,
  onToggleNav,
  project,
  projects,
  selectedRun,
}: StartupThreadPanelProps) {
  const threadItems = buildThreadItems(project, selectedRun);

  const history = (
    <div className="space-y-3">
      {threadItems.map((item) => (
        <div
          key={item.key}
          className={item.role === "user" ? "rounded-2xl bg-neutral-2 p-3" : "px-1"}
        >
          <p className="text-xs font-semibold tracking-tight text-neutral-12">{item.title}</p>
          <p className="mt-1 break-words text-xs leading-5 text-neutral-11">{item.body}</p>
          {/* Governed-run actions stay attached to the selected-run card — they
 are real API calls (approve gate / execute run), not chrome. */}
          {item.run ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <Badge
                variant={item.run.approval === "pending_review" ? "warning" : "secondary"}
                size="sm"
              >
                {item.run.approval === "pending_review" ? "Review" : "Build"}
              </Badge>
              {item.run.approval === "pending_review" ? (
                <Button
                  type="button"
                  variant="warning"
                  size="sm"
                  className="rounded-full"
                  disabled={isApproving}
                  onClick={onApprove}
                >
                  {isApproving ? "Approving" : "Approve"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ink"
                  shape="circle"
                  size="default"
                  disabled={!isExecutableRun(item.run) || isExecuting}
                  onClick={() => onExecuteRun(item.run?.id ?? "")}
                  aria-label="Execute selected run"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ))}
      {activityCount > 0 ? (
        <p className="px-1 text-[11px] text-neutral-10">
          {activityCount} recorded action{activityCount !== 1 ? "s" : ""}.
        </p>
      ) : null}
    </div>
  );

  return (
    <aside className="flex min-h-0 min-w-0 flex-col bg-neutral-1">
      <StartupThreadHeader
        onSelectProject={onSelectProject}
        onToggleNav={onToggleNav}
        project={project}
        projects={projects}
      />
      <StartupChatPanel
        conversation={conversation}
        history={history}
        onApplied={onChatApplied}
        projectId={project.id}
        showHeader={false}
      />
    </aside>
  );
}

function StartupThreadHeader({
  onSelectProject,
  onToggleNav,
  project,
  projects,
}: {
  onSelectProject: (project: StartupOSProject) => void;
  onToggleNav: () => void;
  project: StartupOSProject;
  projects: readonly StartupOSProject[];
}) {
  const otherProjects = projects.filter((item) => item.id !== project.id);

  return (
    <div className="flex h-14 min-w-0 shrink-0 items-center gap-2 px-4">
      <Button
        type="button"
        variant="ghost"
        shape="square"
        size="icon"
        onClick={onToggleNav}
        aria-label="Toggle navigation"
        title="Toggle navigation"
      >
        <SidebarLeft className="size-4" aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex min-w-0 flex-1 items-center gap-1 rounded-[var(--radius-md)] px-1.5 py-0.5 text-sm font-semibold tracking-tight text-neutral-12 outline-none transition-colors hover:bg-neutral-2"
          >
            <span className="truncate">{companyName(project.companyContext)}</span>
            <ChevronDown className="size-3.5 shrink-0 text-neutral-10" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-semibold text-neutral-12">
              {companyName(project.companyContext)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-neutral-10">
              {project.slug} · {project.arena} · {project.status}
            </p>
          </div>
          {otherProjects.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              {otherProjects.slice(0, 8).map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => onSelectProject(item)}>
                  <span className="truncate">{companyName(item.companyContext)}</span>
                </DropdownMenuItem>
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
