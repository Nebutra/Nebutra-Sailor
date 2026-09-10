"use client";

import type { Asset, Project, Subject, Workspace, WorkspaceDocument } from "@/domain/types";
import { assets, documents, projects, subjects, workspaces } from "./data";

/** In-memory adapters. The seam is the `api` shape; `@/lib/api` swaps in the gateway implementation. */

const latency = <T>(value: T, ms = 60): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const emptyDoc = (): WorkspaceDocument => ({
  version: 2,
  nodes: {},
  edges: {},
  viewport: { x: 0, y: 0, zoom: 1 },
});

let wsSeq = 1;

export const api = {
  listProjects: (): Promise<Project[]> => latency([...projects]),
  getProject: (id: string): Promise<Project | null> =>
    latency(projects.find((p) => p.id === id) ?? null),
  listWorkspaces: (projectId: string): Promise<Workspace[]> =>
    latency(workspaces.filter((w) => w.projectId === projectId)),
  getWorkspace: (projectId: string, workspaceId: string): Promise<Workspace | null> =>
    latency(workspaces.find((w) => w.projectId === projectId && w.id === workspaceId) ?? null),
  /** Zero-step create (A): no name dialog; auto-named, redirect straight in. */
  createWorkspace: (projectId: string): Promise<Workspace> => {
    const n = workspaces.filter((w) => w.projectId === projectId).length + 1;
    const id = `ws-${Date.now().toString(36)}-${wsSeq++}`;
    const ws: Workspace = { id, projectId, name: `Untitled ${n}`, documentId: `doc-${id}` };
    workspaces.push(ws);
    documents[ws.documentId] = emptyDoc();
    return latency(ws);
  },
  getDocument: (documentId: string): Promise<WorkspaceDocument> =>
    latency(structuredClone(documents[documentId] ?? emptyDoc())),
  /** Silent autosave (A): the document is server-owned. */
  saveDocument: (documentId: string, doc: WorkspaceDocument): Promise<void> => {
    documents[documentId] = structuredClone(doc);
    return latency(undefined, 20);
  },
  listAssets: (): Promise<Asset[]> => latency([...assets]),
  /** Upload (A, storage-neutral): an object URL becomes an account asset. */
  createAsset: (input: Omit<Asset, "id" | "createdAt" | "scope">): Promise<Asset> => {
    const asset: Asset = {
      ...input,
      id: `a-${Date.now().toString(36)}`,
      scope: "account",
      createdAt: new Date().toISOString(),
    };
    assets.push(asset);
    return latency(asset, 20);
  },
  listSubjects: (): Promise<Subject[]> => latency([...subjects]),
};
