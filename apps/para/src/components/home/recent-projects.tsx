"use client";

import Link from "next/link";
import { useProjects } from "@/mock/queries";
import { ProjectCard } from "./project-card";

export function RecentProjects() {
  const { data } = useProjects();
  if (!data?.length) return null;
  return (
    <section className="mt-16">
      <h2 className="mb-4 text-muted-foreground text-label">Recent</h2>
      <div className="grid grid-cols-3 gap-4">
        {data.slice(0, 3).map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      <div className="mt-4">
        <Link href="/projects" className="text-muted-foreground text-body hover:text-foreground">
          All projects
        </Link>
      </div>
    </section>
  );
}
