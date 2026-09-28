"use client";

import Link from "next/link";
import { projectThumbnail } from "@/domain/gallery";
import type { Project } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { AssetThumb } from "./asset-thumb";

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
  // Read through the selected adapter, not the mock fixtures, so gateway projects get real covers:
  // the explicit cover, else the newest asset made in the project.
  const { data: assets } = useAssets();
  const cover = projectThumbnail(project, assets ?? []);
  return (
    <Link
      href={`/p/${project.id}`}
      className="group relative flex aspect-para-card flex-col justify-end overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-neutral-8"
    >
      {cover ? (
        <div className="absolute inset-0">
          <AssetThumb
            asset={cover}
            className="transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        /* An empty project is a real state, not a missing image: say so rather than show a void. */
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-3">
          <span className="text-label text-muted-foreground">Empty project</span>
        </div>
      )}
      {/* A scrim exists to hold the label legible over artwork. With no artwork there is nothing to
          scrim, and the gradient just makes an empty card look like a failed image. */}
      <div
        className={`relative p-4 ${cover ? "bg-gradient-to-t from-neutral-1/90 to-transparent pt-10" : ""}`}
      >
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
