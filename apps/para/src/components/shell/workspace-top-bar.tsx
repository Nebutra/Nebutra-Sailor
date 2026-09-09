"use client";

import { ChevronDown, MagnifyingGlass, Share } from "@nebutra/icons";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspaces } from "@/mock/queries";
import { useUiStore } from "@/stores/ui-store";
import { CreateMenu } from "./create-menu";
import { JobsIndicator } from "./jobs-popover";
import { ProfileButton } from "./profile-button";
import { ViewSelector } from "./view-selector";

interface Props {
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
}

/** 46px, one visual level: brand · project › workspace switcher (A) · view · search · share (A) · jobs · + · profile. */
export function WorkspaceTopBar({ projectId, projectName, workspaceId, workspaceName }: Props) {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const { data: list } = useWorkspaces(projectId);
  const router = useRouter();
  return (
    <header className="grid h-[var(--para-topbar-h)] shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4">
      <div className="flex min-w-0 items-center gap-3 text-sm">
        <Link href="/" className="font-medium text-foreground tracking-[0.18em]">
          PARA
        </Link>
        <span className="text-neutral-7">|</span>
        <nav className="flex min-w-0 items-center gap-1 text-sm">
          <Link
            href={`/p/${projectId}`}
            className="truncate text-muted-foreground hover:text-foreground"
          >
            {projectName}
          </Link>
          <span className="text-neutral-7">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-[var(--para-h-chip)] items-center gap-1 rounded-md px-1.5 text-foreground hover:bg-accent"
                aria-label="Switch workspace"
              >
                <span className="truncate">{workspaceName}</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              {list?.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => router.push(`/p/${projectId}/w/${w.id}`)}
                >
                  <span
                    className={w.id === workspaceId ? "text-foreground" : "text-muted-foreground"}
                  >
                    {w.name}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/p/${projectId}/w/new`)}>
                New workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
      <ViewSelector />
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="square"
          iconSize="md"
          aria-label="Search"
          onClick={() => setCommandOpen(true)}
        >
          <MagnifyingGlass className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="square"
          iconSize="md"
          aria-label="Share"
          disabled
        >
          <Share className="size-4" />
        </Button>
        <JobsIndicator />
        <CreateMenu inWorkspace projectId={projectId} />
        <ProfileButton />
      </div>
    </header>
  );
}
