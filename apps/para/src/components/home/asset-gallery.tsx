"use client";

// @primitive-exempt: the preview trigger is the media card itself, not a control; Button's control recipe does not apply.

import { ChevronRight, MagnifyingGlass, PlayFill, Plus } from "@nebutra/icons";
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
import { useRef, useState } from "react";
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
import { formatDay } from "./format";

/** The box each card reserves before its media loads, so the masonry does not reflow. */
const ASPECT_CLASS: Record<Asset["aspect"], string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "9:16": "aspect-[9/16]",
};

/**
 * Everything this account has made or uploaded — Home's 我的作品 (where LibTV has TV Show) and the
 * /assets page. Tabs come from the types actually present; search matches the label. A card opens
 * the canvas it was made on when it knows one, otherwise a preview: an upload has no canvas of its
 * own to go back to.
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
  // A tab can disappear under the viewer (its last item deleted elsewhere); fall back to 全部.
  const active = tabs.some((t) => t.value === tab) ? tab : "all";
  const list = filterAssets(all, active, q);
  const shown = limit ? list.slice(0, limit) : list;
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <section aria-labelledby="gallery-heading">
      <div className="mb-3 flex items-center justify-between">
        <Heading
          id="gallery-heading"
          className={`font-medium text-foreground ${level === 1 ? "text-2xl" : "text-xl"}`}
        >
          {heading}
        </Heading>
        {limit && list.length > limit ? (
          <Link
            href="/assets"
            className="flex items-center gap-0.5 text-body text-muted-foreground transition-colors hover:text-foreground"
          >
            查看全部
            <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>

      {all.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs fills its container; the wrapper sizes it to its triggers so search shares the row. */}
          <div className="min-w-0">
            <Tabs
              aria-label="按类型筛选"
              variant="line"
              value={active}
              onValueChange={(v) => setTab(v as GalleryTab)}
              tabs={tabs.map((t) => ({ value: t.value, title: t.label }))}
            />
          </div>
          <Input
            aria-label={`搜索${heading}`}
            placeholder="搜索作品名称"
            size="sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            prefix={<MagnifyingGlass className="size-3.5" />}
            className="w-full rounded-full sm:w-72"
          />
        </div>
      ) : null}

      <AsyncSurface
        query={query}
        isEmpty={shown.length === 0}
        skeleton={
          <Masonry>
            {Array.from({ length: limit ? Math.min(limit, 8) : 8 }, (_, i) => (
              <div
                key={i}
                className={`mb-4 animate-pulse break-inside-avoid rounded-xl bg-card ${i % 3 === 1 ? "aspect-[3/4]" : "aspect-video"}`}
              />
            ))}
          </Masonry>
        }
        errorTitle="作品没有加载出来"
        empty={all.length === 0 ? <EmptyGallery /> : <NoMatch q={q} />}
      >
        <Masonry>
          {shown.map((a) => (
            <GalleryCard key={a.id} asset={a} onPreview={() => setPreview(a)} />
          ))}
        </Masonry>
      </AsyncSurface>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        {preview ? (
          <DialogContent className="max-w-content">
            <DialogTitle>{preview.label}</DialogTitle>
            <DialogDescription>
              {preview.origin === "upload" ? "上传" : "生成"} · {formatDay(preview.createdAt)}
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

/** LibTV's cover wall: columns that each fill top to bottom, so tall and wide work sit together. */
function Masonry({ children }: { children: React.ReactNode }) {
  return <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">{children}</div>;
}

function GalleryCard({ asset, onPreview }: { asset: Asset; onPreview: () => void }) {
  const href = assetWorkspaceHref(asset);
  const videoRef = useRef<HTMLDivElement>(null);
  const isVideo = asset.type === "video";

  // Hover-play costs nothing extra: the <video> is already on the page for its first frame.
  const play = (on: boolean) => {
    const v = videoRef.current?.querySelector("video");
    if (!v) return;
    if (on) void v.play().catch(() => undefined);
    else {
      v.pause();
      v.currentTime = 0;
    }
  };

  const card = `group relative block w-full overflow-hidden rounded-xl bg-card ${ASPECT_CLASS[asset.aspect] ?? "aspect-video"}`;
  const media = (
    <>
      <div ref={videoRef} className="absolute inset-0">
        <AssetThumb
          asset={asset}
          className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      {isVideo ? (
        <span className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full bg-neutral-1/60 text-foreground backdrop-blur-sm">
          <PlayFill className="size-3" />
        </span>
      ) : null}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-1/80 to-transparent px-3 pt-8 pb-2.5 text-left opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none">
        <span className="block truncate text-body text-foreground">{asset.label}</span>
      </span>
    </>
  );
  const hover = isVideo ? { onMouseEnter: () => play(true), onMouseLeave: () => play(false) } : {};

  return (
    <div className="mb-4 break-inside-avoid">
      {href ? (
        <Link href={href} className={card} aria-label={`在画布中打开「${asset.label}」`} {...hover}>
          {media}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onPreview}
          className={card}
          aria-label={`预览「${asset.label}」`}
          {...hover}
        >
          {media}
        </button>
      )}
      <div className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
        <span className="truncate text-body text-foreground">{asset.label}</span>
        <span className="shrink-0 text-meta text-muted-foreground">
          {asset.origin === "upload" ? "上传" : isVideo ? "生成视频" : "生成图片"}
        </span>
      </div>
    </div>
  );
}

function EmptyGallery() {
  const { create, pending } = useCreateCanvas();
  return (
    <div className="para-dots flex flex-col items-center gap-3 rounded-2xl border border-border border-dashed px-6 py-14 text-center">
      <p className="text-body text-foreground">在画布上生成或上传的图片、视频，都会收进这里。</p>
      <p className="text-label text-muted-foreground">从一张空白画布或上面的模板开始。</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-1"
        prefix={<Plus className="size-4" />}
        disabled={pending !== null}
        onClick={() => void create("blank")}
      >
        新建画布
      </Button>
    </div>
  );
}

function NoMatch({ q }: { q: string }) {
  return (
    <p className="text-body text-muted-foreground">
      {q.trim() ? `没有名称包含「${q.trim()}」的作品。` : "这个类型下还没有作品。"}
    </p>
  );
}
