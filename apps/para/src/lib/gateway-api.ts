"use client";

import type { Asset, Job, Project, Subject, Workspace, WorkspaceDocument } from "@/domain/types";
import type { api as mockApi } from "@/mock/api";
import { subjects as mockSubjects } from "@/mock/data";

/**
 * Real adapter for backends/gateway `/api/v1/para` (docs: .trellis/tasks/09-08-para-m3-gateway-slice/design.md).
 * Documents carry a version; autosave sends If-Match and adopts the server copy on 409.
 */

export const GATEWAY_URL = process.env.NEXT_PUBLIC_PARA_API_URL ?? "";
export const isGatewayMode = GATEWAY_URL.length > 0;

export class GatewayError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

async function call<T>(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/para${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? `${res.status} ${res.statusText}`;
    throw new GatewayError(res.status, message, body);
  }
  return body as T;
}

/** The document version the client last saw, per workspace — the If-Match token for autosave. */
const versions = new Map<string, number>();
export const documentVersion = (workspaceId: string) => versions.get(workspaceId) ?? 1;

type WsRow = { id: string; projectId: string; name: string; documentVersion: number };
const toWorkspace = (w: WsRow): Workspace => ({
  id: w.id,
  projectId: w.projectId,
  name: w.name,
  documentId: w.id,
});

export interface GatewayJobInput {
  workspaceId: string;
  nodeId: string;
  generator: NonNullable<import("@/domain/types").MediaNode["generator"]>;
}

export const gatewayApi: typeof mockApi & {
  createJob: (input: GatewayJobInput) => Promise<Job>;
  getJob: (id: string) => Promise<Job>;
  cancelJob: (id: string) => Promise<Job>;
  jobEventsUrl: (id: string) => string;
} = {
  listProjects: async () => (await call<{ items: Project[] }>("/projects")).items,
  getProject: (id) =>
    call<Project>(`/projects/${id}`).catch((e) =>
      e instanceof GatewayError && e.status === 404 ? null : Promise.reject(e),
    ),
  listWorkspaces: async (projectId) =>
    (await call<{ items: WsRow[] }>(`/projects/${projectId}/workspaces`)).items.map(toWorkspace),
  getWorkspace: (_projectId, workspaceId) =>
    call<WsRow>(`/workspaces/${workspaceId}`)
      .then(toWorkspace)
      .catch((e) => (e instanceof GatewayError && e.status === 404 ? null : Promise.reject(e))),
  createWorkspace: async (projectId) =>
    toWorkspace(
      await call<WsRow>(`/projects/${projectId}/workspaces`, { method: "POST", body: "{}" }),
    ),
  getDocument: async (documentId) => {
    const env = await call<{ documentVersion: number; document: WorkspaceDocument }>(
      `/workspaces/${documentId}/document`,
    );
    versions.set(documentId, env.documentVersion);
    return env.document;
  },
  saveDocument: async (documentId, doc) => {
    try {
      const env = await call<{ documentVersion: number }>(`/workspaces/${documentId}/document`, {
        method: "PUT",
        headers: { "if-match": `"${documentVersion(documentId)}"` },
        body: JSON.stringify(doc),
      });
      versions.set(documentId, env.documentVersion);
    } catch (e) {
      if (e instanceof GatewayError && e.status === 409) {
        // Adopt the server version; the next autosave carries the current document again.
        const body = e.body as { documentVersion: number };
        versions.set(documentId, body.documentVersion);
        return;
      }
      throw e;
    }
  },
  listAssets: async () => (await call<{ items: Asset[] }>("/assets")).items,
  createAsset: (input) => call<Asset>("/assets", { method: "POST", body: JSON.stringify(input) }),
  // Subjects: type exists, storage is a later slice — mock list (library.md decision 3).
  listSubjects: async (): Promise<Subject[]> => [...mockSubjects],

  createJob: (input) => call<Job>("/jobs", { method: "POST", body: JSON.stringify(input) }),
  getJob: (id) => call<Job>(`/jobs/${id}`),
  cancelJob: (id) => call<Job>(`/jobs/${id}/cancel`, { method: "POST" }),
  jobEventsUrl: (id) => `${GATEWAY_URL}/api/v1/para/jobs/${id}/events`,
};
