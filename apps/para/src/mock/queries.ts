"use client";

import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@/domain/types";
import { api } from "@/lib/api";
import { getQueryClient } from "@/lib/query-client";

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

/**
 * An asset by id, from the same query the gallery reads. Generated assets are written into that
 * cache the moment they are recorded (lib/job-stream), so a node that just finished renders
 * without waiting for a refetch. This used to look ids up in the mock fixtures, which in gateway
 * mode meant a generated image was recorded, attached to its node, and never shown.
 */
export function useAsset(id: string | undefined): Asset | undefined {
  const { data } = useAssets();
  return id ? data?.find((a) => a.id === id) : undefined;
}

/** Put a just-recorded asset at the front of the cached list. */
export function rememberAsset(asset: Asset): void {
  getQueryClient().setQueryData<Asset[]>(["assets"], (old) => [
    asset,
    ...(old ?? []).filter((a) => a.id !== asset.id),
  ]);
}
