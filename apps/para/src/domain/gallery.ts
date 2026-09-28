import type { Asset, AssetType, Project } from "./types";

/**
 * "Your work": the gallery on Home and /assets. Pure, so the tab strip, the search and the card
 * target are decided in one place and tested without a browser.
 */

export type GalleryTab = "all" | AssetType;

const TAB_ORDER: readonly AssetType[] = ["image", "video", "audio"];
const TAB_LABEL: Record<GalleryTab, string> = {
  all: "All",
  image: "Images",
  video: "Videos",
  audio: "Audio",
};

export interface GalleryTabItem {
  value: GalleryTab;
  label: string;
  count: number;
}

/**
 * All, then one tab per asset type that has at least one item. A tab that can only ever show an
 * empty grid is a promise the library cannot keep, so it is not drawn.
 */
export function galleryTabs(assets: readonly Asset[]): GalleryTabItem[] {
  const counts = new Map<AssetType, number>();
  for (const a of assets) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  const typed = TAB_ORDER.flatMap((type) => {
    const count = counts.get(type) ?? 0;
    return count > 0 ? [{ value: type, label: TAB_LABEL[type], count }] : [];
  });
  return [{ value: "all", label: TAB_LABEL.all, count: assets.length }, ...typed];
}

/** Newest first, then narrowed by tab and by a case-insensitive match on the label. */
export function filterAssets(assets: readonly Asset[], tab: GalleryTab, query: string): Asset[] {
  const q = query.trim().toLowerCase();
  return [...assets]
    .filter((a) => tab === "all" || a.type === tab)
    .filter((a) => !q || a.label.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Where a card goes. An asset that remembers the workspace it was made in opens that workspace;
 * anything else (an upload, an asset whose project is unknown) has nowhere honest to go, so the
 * caller previews it in place instead.
 */
export function assetWorkspaceHref(asset: Asset): string | null {
  return asset.projectId && asset.workspaceId
    ? `/p/${asset.projectId}/w/${asset.workspaceId}`
    : null;
}

/**
 * The picture that stands for a project: its explicit cover when it has one, else the newest asset
 * made or uploaded inside it. Undefined means the project really is empty.
 */
export function projectThumbnail(project: Project, assets: readonly Asset[]): Asset | undefined {
  if (project.coverAssetId) {
    const cover = assets.find((a) => a.id === project.coverAssetId);
    if (cover) return cover;
  }
  let newest: Asset | undefined;
  for (const a of assets) {
    if (a.projectId !== project.id || a.type === "audio") continue;
    if (!newest || a.createdAt > newest.createdAt) newest = a;
  }
  return newest;
}

/** Most recently touched first. */
export function recentProjects(projects: readonly Project[], limit: number): Project[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

/** A still can go in an <img>; anything else that is not audio is played as video. */
export function isStillUrl(url: string): boolean {
  return /\.(svg|png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url);
}
