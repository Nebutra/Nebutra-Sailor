"use client";

import Link from "next/link";
import { useProjects } from "@/mock/queries";
import { ProjectCard, ProjectCardSkeleton } from "./project-card";

const RECENT_COUNT = 3;

/**
 * Recent work on the launcher.
 *
 * Every branch is rendered rather than collapsed: this used to return null for both "still
 * loading" and "no projects yet", so a slow query and an empty account looked identical — and both
 * looked like the page had simply failed to draw anything.
 */
export function RecentProjects() {
  const { data, isLoading, isError, refetch } = useProjects();

  if (isLoading) {
    return (
      <Section>
        <Grid>
          {Array.from({ length: RECENT_COUNT }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </Grid>
      </Section>
    );
  }

  if (isError) {
    return (
      <Section>
        <p className="text-body text-muted-foreground">
          Recent work could not be loaded.{" "}
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-foreground underline underline-offset-4"
          >
            Try again
          </button>
        </p>
      </Section>
    );
  }

  if (!data?.length) {
    return (
      <Section>
        <p className="text-body text-muted-foreground">
          Your projects will appear here once you make something.
        </p>
      </Section>
    );
  }

  return (
    <Section>
      <Grid>
        {data.slice(0, RECENT_COUNT).map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </Grid>
      {data.length > RECENT_COUNT && (
        <div className="mt-4">
          <Link href="/projects" className="text-body text-muted-foreground hover:text-foreground">
            All projects
          </Link>
        </div>
      )}
    </Section>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="mb-4 text-label text-muted-foreground">Recent</h2>
      {children}
    </section>
  );
}

/** Stack on a phone, pair on a tablet, three across on a desktop. */
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
