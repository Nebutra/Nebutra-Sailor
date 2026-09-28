"use client";

import Link from "next/link";
import { AsyncSurface } from "@/components/ui/async-surface";
import { projectThumbnail, recentProjects } from "@/domain/gallery";
import type { Asset, Project } from "@/domain/types";
import { useAssets, useProjects } from "@/mock/queries";
import { AssetThumb } from "./asset-thumb";

const RECENT_COUNT = 8;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Pick up where you left off: the newest projects as one horizontal row, title under each. */
export function RecentProjects() {
  const projects = useProjects();
  const assets = useAssets();
  const list = recentProjects(projects.data ?? [], RECENT_COUNT);
  return (
    <section aria-labelledby="recent-heading">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="recent-heading" className="text-label text-muted-foreground">
          Recent
        </h2>
        {(projects.data?.length ?? 0) > 0 ? (
          <Link href="/projects" className="text-label text-muted-foreground hover:text-foreground">
            All projects
          </Link>
        ) : null}
      </div>
      <AsyncSurface
        query={projects}
        isEmpty={list.length === 0}
        skeleton={
          <Row>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="w-72 shrink-0">
                <div className="aspect-video animate-pulse rounded-xl bg-card" />
                <div className="mt-2.5 h-4 w-32 animate-pulse rounded bg-card" />
              </div>
            ))}
          </Row>
        }
        empty={
          <p className="text-body text-muted-foreground">
            Projects you create show up here, newest first.
          </p>
        }
        errorTitle="Recent work could not be loaded"
      >
        <Row>
          {list.map((p) => (
            <RecentCard key={p.id} project={p} assets={assets.data ?? []} />
          ))}
        </Row>
      </AsyncSurface>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">{children}</div>;
}

function RecentCard({ project, assets }: { project: Project; assets: readonly Asset[] }) {
  const cover = projectThumbnail(project, assets);
  return (
    <Link href={`/p/${project.id}`} className="group w-72 shrink-0 snap-start">
      <div className="aspect-video overflow-hidden rounded-xl bg-card">
        {cover ? (
          <AssetThumb
            asset={cover}
            className="transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        ) : (
          <div className="para-dots flex size-full items-center justify-center">
            <span className="text-label text-muted-foreground">Empty project</span>
          </div>
        )}
      </div>
      <div className="mt-2.5 truncate text-body text-foreground">{project.name}</div>
      <div className="text-meta text-muted-foreground">{fmt(project.updatedAt)}</div>
    </Link>
  );
}
