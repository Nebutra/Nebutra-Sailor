"use client";

import { useQuery } from "@tanstack/react-query";
import type { Asset, Project, Subject, Workspace, WorkspaceDocument } from "@/domain/types";
import { assets, documents, projects, subjects, workspaces } from "./data";

/** Remote data goes through TanStack Query even while it is in-memory, so the seam is already there. */

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

export const useProjects = () => useQuery({ queryKey: ["projects"], queryFn: api.listProjects });

export const useProject = (id: string) =>
  useQuery({ queryKey: ["project", id], queryFn: () => api.getProject(id) });

export const useWorkspaces = (projectId: string) =>
  useQuery({ queryKey: ["workspaces", projectId], queryFn: () => api.listWorkspaces(projectId) });

export const useWorkspace = (projectId: string, workspaceId: string) =>
  useQuery({
    queryKey: ["workspace", projectId, workspaceId],
    queryFn: () => api.getWorkspace(projectId, workspaceId),
  });

export const useDocument = (documentId: string | undefined) =>
  useQuery({
    queryKey: ["document", documentId],
    queryFn: () => api.getDocument(documentId as string),
    enabled: Boolean(documentId),
  });

export const useAssets = () => useQuery({ queryKey: ["assets"], queryFn: api.listAssets });
export const useSubjects = () => useQuery({ queryKey: ["subjects"], queryFn: api.listSubjects });

export function findAsset(id: string): Asset | undefined {
  return assets.find((a) => a.id === id);
}
