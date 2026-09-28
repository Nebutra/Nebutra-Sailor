import type { Asset, Project, Subject, Workspace, WorkspaceDocument } from "@/domain/types";

/** Milestone 1 fixtures. Replace the adapters in `queries.ts` when a backend exists. */

export const projects: Project[] = [
  {
    id: "last-animal",
    name: "最后的动物",
    updatedAt: "2026-09-07T18:20:00Z",
    coverAssetId: "a001",
  },
  { id: "bamboo", name: "竹林问剑", updatedAt: "2026-09-06T21:10:00Z", coverAssetId: "a007" },
  {
    id: "kuanlan-launch",
    name: "观澜发布片",
    updatedAt: "2026-09-05T09:00:00Z",
    coverAssetId: "a004",
  },
  { id: "neon-rain", name: "霓虹雨夜", updatedAt: "2026-09-02T12:30:00Z" },
  // Deliberately without a cover or assets: the empty project is a real state, and the card has to say so.
  { id: "studio-reel", name: "工作室年度样片", updatedAt: "2026-08-30T14:45:00Z" },
];

export const workspaces: Workspace[] = [
  { id: "ep01", projectId: "last-animal", name: "第一集", documentId: "doc-ep01" },
  { id: "ep02", projectId: "last-animal", name: "第二集", documentId: "doc-ep02" },
  { id: "trailer", projectId: "last-animal", name: "预告片", documentId: "doc-trailer" },
  { id: "poster", projectId: "last-animal", name: "海报", documentId: "doc-poster" },
  { id: "hero", projectId: "kuanlan-launch", name: "主片", documentId: "doc-hero" },
  { id: "stills", projectId: "kuanlan-launch", name: "剧照", documentId: "doc-stills" },
  { id: "bamboo-1", projectId: "bamboo", name: "分镜", documentId: "doc-bamboo-1" },
  { id: "neon-1", projectId: "neon-rain", name: "街景", documentId: "doc-neon-1" },
  { id: "cut-a", projectId: "studio-reel", name: "粗剪 A", documentId: "doc-cut-a" },
];

const t = "2026-09-06T10:00:00Z";

/** A generated fixture asset, made on a known canvas. */
const made = (
  id: string,
  type: Asset["type"],
  label: string,
  aspect: Asset["aspect"],
  projectId: string,
  workspaceId: string,
  createdAt: string,
): Asset => ({
  id,
  type,
  url: `/mock/${id}.svg`,
  label,
  aspect,
  scope: "account",
  origin: "generated",
  jobId: `j-${id}`,
  workspaceId,
  projectId,
  createdAt,
});

export const assets: Asset[] = [
  {
    id: "a001",
    type: "image",
    url: "/mock/a001.svg",
    label: "黎明港口",
    aspect: "16:9",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a002",
    type: "image",
    url: "/mock/a002.svg",
    label: "月下山脊",
    aspect: "16:9",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a003",
    type: "image",
    url: "/mock/a003.svg",
    label: "玛拉 · 侧光肖像",
    aspect: "1:1",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a004",
    type: "video",
    url: "/mock/a004.svg",
    label: "潮汐循环",
    aspect: "16:9",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  made("a005", "image", "沉没之城", "4:3", "last-animal", "ep01", t),
  made("a006", "image", "落日海报", "9:16", "last-animal", "poster", t),
  made("a007", "video", "竹林光束", "16:9", "bamboo", "bamboo-1", "2026-09-06T21:00:00Z"),
  made("a008", "image", "沙丘远行", "1:1", "bamboo", "bamboo-1", "2026-09-06T20:40:00Z"),
  made("a009", "image", "雨夜红伞", "9:16", "neon-rain", "neon-1", "2026-09-02T12:20:00Z"),
  made("a010", "video", "雪山航拍", "16:9", "kuanlan-launch", "hero", "2026-09-05T08:50:00Z"),
  made("a011", "image", "灯笼长街", "4:3", "neon-rain", "neon-1", "2026-09-02T12:00:00Z"),
  made("a012", "video", "极光延时", "16:9", "kuanlan-launch", "stills", "2026-09-04T22:15:00Z"),
];

export const subjects: Subject[] = [
  { id: "s-mara", name: "玛拉", category: "character", sheet: ["a001", "a003"], scope: "account" },
  { id: "s-wolf", name: "狼", category: "character", sheet: ["a002"], scope: "account" },
  { id: "s-city", name: "沉没之城", category: "scene", sheet: ["a005"], scope: "account" },
];

const emptyDoc = (): WorkspaceDocument => ({
  version: 2,
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
});

export const documents: Record<string, WorkspaceDocument> = {
  "doc-ep01": {
    version: 2,
    viewport: { x: 0, y: 0, zoom: 1 },
    edges: {},
    nodes: {
      n1: {
        id: "n1",
        type: "image",
        assetId: "a001",
        status: "completed",
        createdBy: "import",
        x: 160,
        y: 120,
        width: 320,
        height: 180,
        generator: { mode: "image", model: "Auto", count: 1 },
      },
      n2: {
        id: "n2",
        type: "image",
        assetId: "a002",
        status: "completed",
        createdBy: "import",
        x: 640,
        y: 360,
        width: 320,
        height: 180,
        generator: { mode: "image", model: "Auto", count: 1 },
      },
      n3: {
        id: "n3",
        type: "video",
        assetId: "a004",
        status: "completed",
        createdBy: "import",
        x: 260,
        y: 460,
        width: 288,
        height: 162,
        generator: { mode: "video", model: "Auto", count: 1 },
      },
      n4: {
        id: "n4",
        type: "text",
        text: "开场：玛拉在涨潮前醒来。",
        status: "completed",
        createdBy: "user",
        x: 1040,
        y: 140,
        width: 260,
        height: 72,
      },
    },
  },
  "doc-ep02": emptyDoc(),
  "doc-trailer": emptyDoc(),
  "doc-poster": {
    version: 2,
    viewport: { x: 0, y: 0, zoom: 1 },
    edges: {},
    nodes: {
      p1: {
        id: "p1",
        type: "image",
        assetId: "a006",
        status: "completed",
        createdBy: "agent",
        x: 420,
        y: 100,
        width: 225,
        height: 400,
      },
    },
  },
  "doc-hero": emptyDoc(),
  "doc-stills": emptyDoc(),
  "doc-cut-a": emptyDoc(),
  "doc-bamboo-1": emptyDoc(),
  "doc-neon-1": emptyDoc(),
};
