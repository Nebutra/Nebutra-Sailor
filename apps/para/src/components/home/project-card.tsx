import Link from "next/link";
import type { Project } from "@/domain/types";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/p/${project.id}`}
      className="group flex aspect-para-card flex-col justify-end rounded-xl border border-border bg-card p-4 transition-colors hover:border-neutral-8"
    >
      <span className="font-medium text-foreground text-body">{project.name}</span>
      <span className="text-muted-foreground text-label">{fmt(project.updatedAt)}</span>
    </Link>
  );
}
