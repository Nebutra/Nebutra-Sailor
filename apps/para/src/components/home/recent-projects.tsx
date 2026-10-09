"use client";

import { ChevronRight } from "@nebutra/icons";
import Link from "next/link";
import { AsyncSurface } from "@/components/ui/async-surface";
import { projectThumbnail, recentProjects } from "@/domain/gallery";
import type { Asset, Project } from "@/domain/types";
import { useAssets, useProjects } from "@/mock/queries";
import { AssetThumb } from "./asset-thumb";
import { formatDay } from "./format";

const RECENT_COUNT = 4;

/**
 * 最近项目: LibTV's horizontal project cards — the newest work as a thumbnail on the left, the
 * name and the day on the right — with 查看全部 to the full list.
 */
export function RecentProjects() {
  const projects = useProjects();
  const assets = useAssets();
  const list = recentProjects(projects.data ?? [], RECENT_COUNT);
  return (
    <section aria-labelledby="recent-heading">
      <SectionHeading id="recent-heading" title="最近项目" href="/projects" linkLabel="查看全部" />
      <AsyncSurface
        query={projects}
        isEmpty={list.length === 0}
        skeleton={
          <Row>
            {Array.from({ length: RECENT_COUNT }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
            ))}
          </Row>
        }
        empty={
          <p className="text-body text-muted-foreground">
            新建的项目会按时间排在这里，最新的在最前。
          </p>
        }
        errorTitle="最近项目没有加载出来"
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

/** A home section's title row: the heading on the left, a 查看全部 › link on the right. */
export function SectionHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 id={id} className="font-medium text-foreground text-xl">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-body text-muted-foreground transition-colors hover:text-foreground"
        >
          {linkLabel}
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

function RecentCard({ project, assets }: { project: Project; assets: readonly Asset[] }) {
  const cover = projectThumbnail(project, assets);
  return (
    <Link
      href={`/p/${project.id}`}
      className="group flex h-24 items-center gap-3.5 rounded-xl border border-border p-2 transition-colors hover:border-neutral-8 hover:bg-card"
    >
      <div className="h-full w-28 shrink-0 overflow-hidden rounded-lg bg-card">
        {cover ? (
          <AssetThumb
            asset={cover}
            className="transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
          />
        ) : (
          <div className="para-dots flex size-full items-center justify-center">
            <span className="text-meta text-muted-foreground">空项目</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-body text-foreground">{project.name}</div>
        <div className="mt-1 text-label text-muted-foreground tabular-nums">
          {formatDay(project.updatedAt)}
        </div>
      </div>
    </Link>
  );
}
