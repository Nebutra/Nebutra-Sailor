"use client";

import { useProjects } from "@/mock/queries";
import { ProjectCard } from "./project-card";

export function ProjectsList() {
  const { data } = useProjects();
  return (
    <>
      <h1 className="mb-8 font-medium text-display text-foreground tracking-tight">Projects</h1>
      <div className="grid grid-cols-3 gap-4">
        {data?.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    </>
  );
}
