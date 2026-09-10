"use client";

import { GATEWAY_URL, GatewayError } from "./gateway-api";

/**
 * The PARA agent, as seen from the browser: a viewer of server-owned state.
 *
 * Starting a turn returns a run id and nothing else happens in this tab — a worker advances the
 * run. `followRun` replays the run's trace from the beginning and then tails it, so closing the
 * page, reloading, or opening it on another device all show the same thing.
 */

export type Autonomy = "ask" | "act";
export type RunStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";

export interface AgentThread {
  id: string;
  projectId: string;
  title: string;
  autonomy: Autonomy;
  updatedAt: string;
}

export interface AgentApproval {
  id: string;
  runId: string;
  toolName: string;
  args: Record<string, unknown>;
  estimatedCost: number;
  status: "pending" | "approved" | "denied";
  resultJobId: string | null;
  createdAt: string;
}

export interface AgentRunState {
  id: string;
  threadId: string;
  workspaceId: string;
  input: string;
  status: RunStatus;
  error: { code: string; message: string } | null;
  startedAt: string | null;
  finishedAt: string | null;
  pendingApprovals?: AgentApproval[];
}

/** One entry of the run's trace, as persisted by the runtime's rollout store. */
export interface AgentTraceEvent {
  type: string;
  item?: { type?: string; [key: string]: unknown };
  [key: string]: unknown;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/para/agent${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    throw new GatewayError(
      res.status,
      (body as { error?: string } | null)?.error ?? `${res.status} ${res.statusText}`,
      body,
    );
  }
  return body as T;
}

export const agentApi = {
  listThreads: async (projectId: string): Promise<AgentThread[]> =>
    (await call<{ items: AgentThread[] }>(`/threads?projectId=${encodeURIComponent(projectId)}`))
      .items,

  createThread: (projectId: string, title: string): Promise<AgentThread> =>
    call<AgentThread>("/threads", { method: "POST", body: JSON.stringify({ projectId, title }) }),

  setAutonomy: (threadId: string, autonomy: Autonomy): Promise<AgentThread> =>
    call<AgentThread>(`/threads/${threadId}`, {
      method: "PATCH",
      body: JSON.stringify({ autonomy }),
    }),

  /** Queues a run. The turn does not happen in this request. */
  startTurn: (
    threadId: string,
    input: { workspaceId: string; input: string; contextNodeIds: string[] },
  ): Promise<AgentRunState> =>
    call<AgentRunState>(`/threads/${threadId}/turns`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getRun: (runId: string): Promise<AgentRunState> => call<AgentRunState>(`/runs/${runId}`),

  decideApproval: (approvalId: string, approve: boolean): Promise<AgentApproval> =>
    call<AgentApproval>(`/approvals/${approvalId}`, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }),

  runEventsUrl: (runId: string): string => `${GATEWAY_URL}/api/v1/para/agent/runs/${runId}/events`,
};

export interface FollowRunHandlers {
  onRun: (run: AgentRunState) => void;
  onTrace?: (event: AgentTraceEvent) => void;
}

/**
 * Attach to a run. The stream replays the whole trace before tailing, so this is safe to call on
 * mount, after a reload, or on a second device — it is a subscription, not a driver.
 */
export function followRun(runId: string, handlers: FollowRunHandlers): () => void {
  const source = new EventSource(agentApi.runEventsUrl(runId), { withCredentials: true });
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    source.close();
  };

  source.addEventListener("run", (e) => {
    try {
      const run = JSON.parse((e as MessageEvent).data) as AgentRunState;
      handlers.onRun(run);
      // The server ends the stream at a resting point; parked runs resume on a fresh attach.
      if (run.status === "completed" || run.status === "failed") close();
    } catch {
      /* ignore malformed frames */
    }
  });

  source.addEventListener("item", (e) => {
    try {
      handlers.onTrace?.(JSON.parse((e as MessageEvent).data) as AgentTraceEvent);
    } catch {
      /* ignore malformed frames */
    }
  });

  source.onerror = () => {
    // The server closes the stream at every resting point; one poll settles which one it was.
    void agentApi
      .getRun(runId)
      .then((run) => {
        handlers.onRun(run);
        close();
      })
      .catch(close);
  };

  return close;
}
