import { describe, expect, it } from "vitest";
import {
  assetWorkspaceHref,
  filterAssets,
  galleryTabs,
  isStillUrl,
  projectThumbnail,
  recentProjects,
} from "./gallery";
import type { Asset, Project } from "./types";

const asset = (over: Partial<Asset> & Pick<Asset, "id">): Asset => ({
  type: "image",
  url: `/a/${over.id}.png`,
  label: over.id,
  aspect: "16:9",
  scope: "account",
  origin: "generated",
  createdAt: "2026-09-01T00:00:00Z",
  ...over,
});

const assets: Asset[] = [
  asset({ id: "a", label: "Harbour at dawn", createdAt: "2026-09-02T00:00:00Z" }),
  asset({ id: "b", type: "video", label: "Tide loop", createdAt: "2026-09-03T00:00:00Z" }),
  asset({ id: "c", label: "Mara portrait", createdAt: "2026-09-01T00:00:00Z" }),
];

describe("galleryTabs", () => {
  it("lists All plus one tab per type present, in a fixed order", () => {
    expect(galleryTabs(assets)).toEqual([
      { value: "all", label: "全部", count: 3 },
      { value: "image", label: "图片", count: 2 },
      { value: "video", label: "视频", count: 1 },
    ]);
  });

  it("hides every typed tab when there is nothing", () => {
    expect(galleryTabs([])).toEqual([{ value: "all", label: "全部", count: 0 }]);
  });
});

describe("filterAssets", () => {
  it("sorts newest first", () => {
    expect(filterAssets(assets, "all", "").map((a) => a.id)).toEqual(["b", "a", "c"]);
  });

  it("narrows by tab", () => {
    expect(filterAssets(assets, "image", "").map((a) => a.id)).toEqual(["a", "c"]);
    expect(filterAssets(assets, "audio", "")).toEqual([]);
  });

  it("searches the label, case-insensitively and trimmed", () => {
    expect(filterAssets(assets, "all", "  MARA ").map((a) => a.id)).toEqual(["c"]);
    expect(filterAssets(assets, "video", "harbour")).toEqual([]);
  });
});

describe("assetWorkspaceHref", () => {
  it("opens the workspace an asset was made in", () => {
    expect(assetWorkspaceHref(asset({ id: "x", projectId: "p", workspaceId: "w" }))).toBe(
      "/p/p/w/w",
    );
  });

  it("has nowhere to go without both ids", () => {
    expect(assetWorkspaceHref(asset({ id: "x", workspaceId: "w" }))).toBeNull();
    expect(assetWorkspaceHref(asset({ id: "x" }))).toBeNull();
  });
});

describe("projectThumbnail", () => {
  const project: Project = { id: "p", name: "P", updatedAt: "2026-09-01T00:00:00Z" };
  const pool = [
    asset({ id: "old", projectId: "p", createdAt: "2026-09-01T00:00:00Z" }),
    asset({ id: "new", projectId: "p", createdAt: "2026-09-05T00:00:00Z" }),
    asset({ id: "sound", type: "audio", projectId: "p", createdAt: "2026-09-09T00:00:00Z" }),
    asset({ id: "other", projectId: "q", createdAt: "2026-09-09T00:00:00Z" }),
  ];

  it("prefers the explicit cover", () => {
    expect(projectThumbnail({ ...project, coverAssetId: "old" }, pool)?.id).toBe("old");
  });

  it("falls back to the newest visual asset in the project", () => {
    expect(projectThumbnail(project, pool)?.id).toBe("new");
    expect(projectThumbnail({ ...project, coverAssetId: "missing" }, pool)?.id).toBe("new");
  });

  it("is undefined for an empty project", () => {
    expect(projectThumbnail({ ...project, id: "empty" }, pool)).toBeUndefined();
  });
});

describe("recentProjects", () => {
  it("orders by last update and caps the row", () => {
    const list: Project[] = [
      { id: "a", name: "A", updatedAt: "2026-09-01T00:00:00Z" },
      { id: "b", name: "B", updatedAt: "2026-09-03T00:00:00Z" },
      { id: "c", name: "C", updatedAt: "2026-09-02T00:00:00Z" },
    ];
    expect(recentProjects(list, 2).map((p) => p.id)).toEqual(["b", "c"]);
  });
});

describe("isStillUrl", () => {
  it("tells stills from moving media", () => {
    expect(isStillUrl("/mock/a004.svg")).toBe(true);
    expect(isStillUrl("https://cdn/x.PNG?sig=1")).toBe(true);
    expect(isStillUrl("https://cdn/clip.mp4")).toBe(false);
  });
});
