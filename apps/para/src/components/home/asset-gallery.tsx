"use client";

// @primitive-exempt: the preview trigger is the media card itself, not a control; Button's control recipe does not apply.

import { MagnifyingGlass, Plus } from "@nebutra/icons";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Tabs,
} from "@nebutra/ui/primitives";
import Link from "next/link";
import { useState } from "react";
import { AsyncSurface } from "@/components/ui/async-surface";
import {
  assetWorkspaceHref,
  filterAssets,
  type GalleryTab,
  galleryTabs,
  isStillUrl,
} from "@/domain/gallery";
import type { Asset } from "@/domain/types";
import { useCreateCanvas } from "@/lib/create-canvas";
import { useAssets } from "@/mock/queries";
import { AssetThumb } from "./asset-thumb";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const card =
  "group block aspect-para-card w-full overflow-hidden rounded-xl bg-card transition-colors hover:bg-neutral-4";

/**
 * Everything this account has made or uploaded — Home's "Your work" section and the /assets page.
 * Tabs come from the types actually present; search matches the label. A card opens the workspace
 * the asset was made in when it knows one, otherwise it opens a preview: an upload has no canvas
 * of its own to go back to.
 */
export function AssetGallery({
  heading,
  level,
  limit,
}: {
  heading: string;
  level: 1 | 2;
  /** Home shows a slice and links to /assets; the page shows everything. */
  limit?: number;
}) {
  const query = useAssets();
  const [tab, setTab] = useState<GalleryTab>("all");
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);

  const all = query.data ?? [];
  const tabs = galleryTabs(all);
  // A tab can disappear under the viewer (its last item deleted elsewhere); fall back to All.
  const active = tabs.some((t) => t.value === tab) ? tab : "all";
  const list = filterAssets(all, active, q);
  const shown = limit ? list.slice(0, limit) : list;
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <section aria-labelledby="gallery-heading">
      <div className="mb-4 flex items-baseline justify-between">
        <Heading
          id="gallery-heading"
          className={
            level === 1
              ? "font-medium text-display text-foreground tracking-tight"
              : "text-label text-muted-foreground"
          }
        >
          {heading}
        </Heading>
        {limit && list.length > limit ? (
          <Link href="/assets" className="text-label text-muted-foreground hover:text-foreground">
            All assets
          </Link>
        ) : null}
      </div>

      {all.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs fills its container; the wrapper sizes it to its triggers so search shares the row. */}
          <div className="min-w-0">
            <Tabs
              aria-label="Filter by type"
              variant="secondary"
              size="sm"
              value={active}
              onValueChange={(v) => setTab(v as GalleryTab)}
              tabs={tabs.map((t) => ({ value: t.value, title: t.label }))}
            />
          </div>
          <Input
            aria-label={`Search ${heading.toLowerCase()}`}
            placeholder="Search"
            size="sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            prefix={<MagnifyingGlass className="size-3.5" />}
            className="w-full sm:w-64"
          />
        </div>
      ) : null}

      <AsyncSurface
        query={query}
        isEmpty={shown.length === 0}
        skeleton={
          <Grid>
            {Array.from({ length: limit ? Math.min(limit, 8) : 8 }, (_, i) => (
              <div key={i} className="aspect-para-card animate-pulse rounded-xl bg-card" />
            ))}
          </Grid>
        }
        errorTitle="Your work could not be loaded"
        empty={all.length === 0 ? <EmptyGallery /> : <NoMatch q={q} />}
      >
        <Grid>
          {shown.map((a) => (
            <GalleryCard key={a.id} asset={a} onPreview={() => setPreview(a)} />
          ))}
        </Grid>
      </AsyncSurface>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        {preview ? (
          <DialogContent className="max-w-content">
            <DialogTitle>{preview.label}</DialogTitle>
            <DialogDescription>
              {preview.origin === "upload" ? "Uploaded" : "Generated"} · {fmt(preview.createdAt)}
            </DialogDescription>
            <div className="mt-2 flex max-h-[70vh] justify-center overflow-hidden rounded-lg bg-neutral-2">
              {preview.type === "audio" ? (
                // biome-ignore lint/a11y/useMediaCaption: user media, no caption track exists
                <audio src={preview.url} controls className="w-full p-4" />
              ) : preview.type === "video" && !isStillUrl(preview.url) ? (
                // biome-ignore lint/a11y/useMediaCaption: user media, no caption track exists
                <video src={preview.url} controls playsInline className="max-h-[70vh]" />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.label}
                  className="max-h-[70vh] object-contain"
                />
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

function GalleryCard({ asset, onPreview }: { asset: Asset; onPreview: () => void }) {
  const href = assetWorkspaceHref(asset);
  const media = (
    <AssetThumb
      asset={asset}
      className="transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
    />
  );
  return (
    <div className="min-w-0">
      {href ? (
        <Link href={href} className={card} aria-label={`Open ${asset.label} in its workspace`}>
          {media}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onPreview}
          className={card}
          aria-label={`Preview ${asset.label}`}
        >
          {media}
        </button>
      )}
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="truncate text-body text-foreground">{asset.label}</span>
        <span className="shrink-0 text-meta text-muted-foreground">
          {asset.origin === "upload" ? "Upload" : "Generated"}
        </span>
      </div>
    </div>
  );
}

function EmptyGallery() {
  const { create, pending } = useCreateCanvas();
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-body text-muted-foreground">
        What you generate or upload on a canvas collects here.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        prefix={<Plus className="size-4" />}
        disabled={pending !== null}
        onClick={() => void create("blank")}
      >
        New canvas
      </Button>
    </div>
  );
}

function NoMatch({ q }: { q: string }) {
  return (
    <p className="text-body text-muted-foreground">
      {q.trim() ? `Nothing matches "${q.trim()}".` : "Nothing of this type."}
    </p>
  );
}
