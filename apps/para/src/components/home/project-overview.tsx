"use client";

import { Plus } from "@nebutra/icons";
import { EmptyState, ErrorState } from "@nebutra/ui/layout";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AsyncSurface } from "@/components/ui/async-surface";
import { useProject, useWorkspaces } from "@/mock/queries";

/** A project is a container of workspaces. Nothing production-shaped lives here. */
export function ProjectOverview({ projectId }: { projectId: string }) {
  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const workspaces = useWorkspaces(projectId);
  const list = workspaces.data;
  const router = useRouter();

  // A failed request is not a missing project. Saying "does not exist" on a network error sends
  // the user to look for something that is actually still there.
  if (isError) {
    return <ErrorState title="This project could not be loaded" onRetry={() => void refetch()} />;
  }
  if (!isLoading && !project) {
    return (
      <EmptyState title="This project does not exist" description="It may have been deleted." />
    );
  }

  return (
    <>
      <div className="mb-10 flex items-end justify-between">
        <div>
          <Link href="/projects" className="text-muted-foreground text-label hover:text-foreground">
            Projects
          </Link>
          <h1 className="mt-1 font-medium text-display text-foreground tracking-tight">
            {project?.name ?? " "}
          </h1>
        </div>
        <Button
          type="button"
          size="sm"
          prefix={<Plus className="size-4" />}
          onClick={() => router.push(`/p/${projectId}/w/new`)}
        >
          New workspace
        </Button>
      </div>
      <h2 className="mb-4 text-muted-foreground text-label">Recent workspaces</h2>
      <AsyncSurface
        query={{
          isLoading: workspaces.isLoading,
          isError: workspaces.isError,
          refetch: workspaces.refetch,
        }}
        isEmpty={!list?.length}
        skeleton={<WorkspaceGridSkeleton />}
        emptyTitle="No workspaces yet"
        emptyDescription="A workspace is where the canvas lives."
        errorTitle="Workspaces could not be loaded"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list?.map((w) => (
            <Link
              key={w.id}
              href={`/p/${projectId}/w/${w.id}`}
              className="flex aspect-video items-end rounded-xl border border-border bg-card p-4 font-medium text-foreground text-body transition-colors hover:border-neutral-8"
            >
              {w.name}
            </Link>
          ))}
        </div>
      </AsyncSurface>
    </>
  );
}

/** Mirrors the workspace tile grid so the page does not reflow when the list lands. */
function WorkspaceGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="aspect-video animate-pulse rounded-xl bg-card" />
      ))}
    </div>
  );
}
