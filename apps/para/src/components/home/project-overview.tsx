"use client";

import { Plus } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProject, useWorkspaces } from "@/mock/queries";

/** A project is a container of workspaces. Nothing production-shaped lives here. */
export function ProjectOverview({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);
  const { data: list } = useWorkspaces(projectId);
  const router = useRouter();

  if (!isLoading && !project) {
    return <p className="text-muted-foreground text-body">This project does not exist.</p>;
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
      <div className="grid grid-cols-4 gap-4">
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
    </>
  );
}
