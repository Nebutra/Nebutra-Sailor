"use client";

// @primitive-exempt: the 新建项目 tile is a card-sized launch target in the grid, not a control; Button's control recipe does not apply.

import { Plus } from "@nebutra/icons";
import { AsyncSurface } from "@/components/ui/async-surface";
import { recentProjects } from "@/domain/gallery";
import { useCreateCanvas } from "@/lib/create-canvas";
import { useProjects } from "@/mock/queries";
import { ProjectCard, ProjectCardSkeleton } from "./project-card";

/**
 * 项目: every project, most recently touched first, with LibTV's 新建项目 tile leading the grid.
 */
export function ProjectsList() {
  const { data, isLoading, isError, refetch } = useProjects();
  const list = recentProjects(data ?? [], Number.POSITIVE_INFINITY);
  return (
    <>
      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="font-medium text-2xl text-foreground">项目</h1>
        {data?.length ? (
          <span className="text-body text-muted-foreground tabular-nums">{data.length} 个</span>
        ) : null}
      </div>
      <AsyncSurface
        query={{ isLoading, isError, refetch }}
        isEmpty={false}
        skeleton={
          <Grid>
            {Array.from({ length: 8 }, (_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </Grid>
        }
        errorTitle="项目没有加载出来"
      >
        <Grid>
          <NewProjectTile />
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </Grid>
      </AsyncSurface>
    </>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

/** Always first, so an empty list is still a page you can act on. */
function NewProjectTile() {
  const { create, pending, failed } = useCreateCanvas();
  return (
    <div>
      <button
        type="button"
        onClick={() => void create("blank")}
        disabled={pending !== null}
        aria-busy={pending !== null || undefined}
        className="para-dots group flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-border border-dashed bg-card transition-colors hover:border-neutral-8 disabled:cursor-wait"
      >
        <span className="flex h-10 w-16 items-center justify-center rounded-lg bg-neutral-12 text-neutral-1 transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
          <Plus className="size-5" />
        </span>
        <span className="text-body text-foreground">新建项目</span>
      </button>
      <div className="mt-2.5 text-label text-muted-foreground">
        {failed ? "项目没有建好。请先登录，再试一次。" : "一个空白画布，从这里开始"}
      </div>
    </div>
  );
}
