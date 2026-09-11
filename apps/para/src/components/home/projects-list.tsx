"use client";

import { AsyncSurface } from "@/components/ui/async-surface";
import { CardGrid } from "@/components/ui/card-grid";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";
import { useProjects } from "@/mock/queries";
import { ProjectCard } from "./project-card";

export function ProjectsList() {
  const { data, isLoading, isError, refetch } = useProjects();
  return (
    <>
      <h1 className="mb-8 font-medium text-display text-foreground tracking-tight">Projects</h1>
      <AsyncSurface
        query={{ isLoading, isError, refetch }}
        isEmpty={!data?.length}
        skeleton={<CardGridSkeleton count={6} />}
        emptyTitle="No projects yet"
        emptyDescription="Describe something on the home surface to start one."
        errorTitle="Projects could not be loaded"
      >
        <CardGrid>
          {data?.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </CardGrid>
      </AsyncSurface>
    </>
  );
}
