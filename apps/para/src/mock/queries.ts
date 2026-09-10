"use client";

import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@/domain/types";
import { api } from "@/lib/api";
import { assets } from "./data";

/** Query hooks over the selected `api` (mock or gateway). Components keep importing `api` from here. */
export { api };

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
