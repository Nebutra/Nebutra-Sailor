import type { Asset, Project, Subject, Workspace, WorkspaceDocument } from "@/domain/types";

/** Milestone 1 fixtures. Replace the adapters in `queries.ts` when a backend exists. */

export const projects: Project[] = [
  { id: "last-animal", name: "The Last Animal", updatedAt: "2026-09-07T18:20:00Z" },
  { id: "kuanlan-launch", name: "Kuanlan Launch", updatedAt: "2026-09-05T09:00:00Z" },
  { id: "studio-reel", name: "Studio Reel 2026", updatedAt: "2026-08-30T14:45:00Z" },
];

export const workspaces: Workspace[] = [
  { id: "ep01", projectId: "last-animal", name: "EP01", documentId: "doc-ep01" },
  { id: "ep02", projectId: "last-animal", name: "EP02", documentId: "doc-ep02" },
  { id: "trailer", projectId: "last-animal", name: "Trailer", documentId: "doc-trailer" },
  { id: "poster", projectId: "last-animal", name: "Poster", documentId: "doc-poster" },
  { id: "hero", projectId: "kuanlan-launch", name: "Hero film", documentId: "doc-hero" },
  { id: "stills", projectId: "kuanlan-launch", name: "Stills", documentId: "doc-stills" },
  { id: "cut-a", projectId: "studio-reel", name: "Cut A", documentId: "doc-cut-a" },
];

const t = "2026-09-06T10:00:00Z";
export const assets: Asset[] = [
  {
    id: "a001",
    type: "image",
    url: "/mock/a001.svg",
    label: "A001",
    aspect: "16:9",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a002",
    type: "image",
    url: "/mock/a002.svg",
    label: "A002",
    aspect: "16:9",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a003",
    type: "image",
    url: "/mock/a003.svg",
    label: "A003",
    aspect: "1:1",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a004",
    type: "video",
    url: "/mock/a004.svg",
    label: "A004",
    aspect: "16:9",
    scope: "account",
    origin: "upload",
    createdAt: t,
  },
  {
    id: "a005",
    type: "image",
    url: "/mock/a005.svg",
    label: "A005",
    aspect: "4:3",
    scope: "account",
    origin: "generated",
    jobId: "j-past-1",
    workspaceId: "ep01",
    projectId: "last-animal",
    createdAt: t,
  },
  {
    id: "a006",
    type: "image",
    url: "/mock/a006.svg",
    label: "A006",
    aspect: "9:16",
    scope: "account",
    origin: "generated",
    jobId: "j-past-2",
    workspaceId: "poster",
    projectId: "last-animal",
    createdAt: t,
  },
];

export const subjects: Subject[] = [
  { id: "s-mara", name: "Mara", category: "character", sheet: ["a001", "a003"], scope: "account" },
  { id: "s-wolf", name: "The Wolf", category: "character", sheet: ["a002"], scope: "account" },
  { id: "s-city", name: "Drowned City", category: "scene", sheet: ["a005"], scope: "account" },
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
        text: "Cold open — Mara wakes before the tide.",
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
};
