"use client";

import Link from "next/link";
import { AsyncSurface } from "@/components/ui/async-surface";
import { CardGrid } from "@/components/ui/card-grid";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";
import { useProjects } from "@/mock/queries";
import { ProjectCard } from "./project-card";

const RECENT_COUNT = 3;

/** Recent work on the launcher. Every branch renders; see AsyncSurface for why. */
export function RecentProjects() {
  const { data, isLoading, isError, refetch } = useProjects();
  return (
    <section className="mt-16">
      <h2 className="mb-4 text-label text-muted-foreground">Recent</h2>
      <AsyncSurface
        query={{ isLoading, isError, refetch }}
        isEmpty={!data?.length}
        skeleton={<CardGridSkeleton count={RECENT_COUNT} />}
        emptyTitle="No projects yet"
        emptyDescription="Your work will appear here once you make something."
        errorTitle="Recent work could not be loaded"
      >
        <CardGrid>
          {data?.slice(0, RECENT_COUNT).map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </CardGrid>
        {(data?.length ?? 0) > RECENT_COUNT && (
          <div className="mt-4">
            <Link
              href="/projects"
              className="text-body text-muted-foreground hover:text-foreground"
            >
              All projects
            </Link>
          </div>
        )}
      </AsyncSurface>
    </section>
  );
}
