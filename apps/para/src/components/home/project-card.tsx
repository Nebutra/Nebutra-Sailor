"use client";

// @async-surface-exempt: looks up one cover asset by id for a thumbnail; a miss (loading, error or absent) is the placeholder tile, not a surface state.

import Link from "next/link";
import { projectThumbnail } from "@/domain/gallery";
import type { Project } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { AssetThumb } from "./asset-thumb";
import { formatDay } from "./format";

/**
 * A project on 项目, LibTV's way: the newest work as a wide cover, the name and the day under it.
 * An empty project shows the canvas's dot texture and says 空项目 — a real state, not a missing
 * image.
 */
export function ProjectCard({ project }: { project: Project }) {
  // Read through the selected adapter, not the mock fixtures, so gateway projects get real covers:
  // the explicit cover, else the newest asset made in the project.
  const { data: assets } = useAssets();
  const cover = projectThumbnail(project, assets ?? []);
  return (
    <Link href={`/p/${project.id}`} className="group block min-w-0">
      <div className="aspect-video overflow-hidden rounded-xl border border-border bg-card transition-colors group-hover:border-neutral-8">
        {cover ? (
          <AssetThumb
            asset={cover}
            className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <div className="para-dots flex size-full items-center justify-center">
            <span className="text-label text-muted-foreground">空项目</span>
          </div>
        )}
      </div>
      <div className="mt-2.5 truncate text-body text-foreground">{project.name}</div>
      <div className="mt-0.5 text-label text-muted-foreground tabular-nums">
        {formatDay(project.updatedAt)}
      </div>
    </Link>
  );
}

/** Mirrors the card's shape so the grid does not reflow when the data arrives. */
export function ProjectCardSkeleton() {
  return (
    <div>
      <div className="aspect-video animate-pulse rounded-xl bg-card" />
      <div className="mt-2.5 h-4 w-32 animate-pulse rounded bg-card" />
    </div>
  );
}
