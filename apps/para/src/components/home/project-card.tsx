import Link from "next/link";
import type { Project } from "@/domain/types";
import { findAsset } from "@/mock/queries";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * A project, shown as the work it contains.
 *
 * The card used to render a bordered box with a name and a date and nothing else, which on a dark
 * ground read as a broken thumbnail rather than as a project — the domain had no cover to show.
 * The media now fills the card and the label sits on it, so a grid of these scans as work.
 */
export function ProjectCard({ project }: { project: Project }) {
  const cover = project.coverAssetId ? findAsset(project.coverAssetId) : undefined;
  return (
    <Link
      href={`/p/${project.id}`}
      className="group relative flex aspect-para-card flex-col justify-end overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-neutral-8"
    >
      {cover ? (
        <img
          src={cover.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      ) : (
        /* An empty project is a real state, not a missing image: say so rather than show a void. */
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-3">
          <span className="text-label text-muted-foreground">Empty project</span>
        </div>
      )}
      {/* The label needs to hold contrast over arbitrary artwork, so it sits on its own scrim. */}
      <div className="relative bg-gradient-to-t from-neutral-1/90 to-transparent p-4 pt-10">
        <div className="truncate font-medium text-body text-foreground">{project.name}</div>
        <div className="text-label text-muted-foreground">{fmt(project.updatedAt)}</div>
      </div>
    </Link>
  );
}

/** Mirrors the card's shape so the grid does not reflow when the data arrives. */
export function ProjectCardSkeleton() {
  return <div className="aspect-para-card animate-pulse rounded-xl bg-card" />;
}
