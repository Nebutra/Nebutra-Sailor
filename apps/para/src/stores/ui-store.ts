import { create } from "zustand";
import type { AgentStep, AgentThread } from "@/domain/types";
import type { AgentApproval, AgentRunState } from "@/lib/agent-api";

/**
 * Contextual surfaces. M1: at most one open at a time (EXPERIMENTAL — no competitor enforces it;
 * M2 must allow library + agent together). The Inspector drawer was removed: no competitor has one.
 */
export type ActiveDrawer = "library" | "agent" | "jobs" | null;

export type AgentStatus = "idle" | "composing" | "running" | "done";

export interface AgentRun {
  status: AgentStatus;
  prompt: string;
  /** removable, accumulating selection chips (A) */
  contextNodeIds: string[];
  steps: AgentStep[];
  createdNodeIds: string[];
  total: number;
  done: number;
  activityOpen: boolean;
  threadId: string | null;
  /** Gateway mode: the server-owned run this panel is watching. Null in mock mode. */
  runId: string | null;
  runStatus: AgentRunState["status"] | null;
  approvals: AgentApproval[];
  /** Autonomy is a thread setting, mirrored here for the composer's switch. */
  autonomy: "ask" | "act";
}

interface UiState {
  activeDrawer: ActiveDrawer;
  commandOpen: boolean;
  agent: AgentRun;
  /** project-scoped threads (B) — mock */
  threads: AgentThread[];
  setDrawer: (drawer: ActiveDrawer) => void;
  toggleDrawer: (drawer: Exclude<ActiveDrawer, null>) => void;
  setCommandOpen: (open: boolean) => void;
  setAgent: (patch: Partial<AgentRun>) => void;
  addContextNode: (id: string) => void;
  removeContextNode: (id: string) => void;
  resetAgent: () => void;
  newThread: (projectId: string, title: string) => AgentThread;
}

const idleAgent: AgentRun = {
  status: "idle",
  prompt: "",
  contextNodeIds: [],
  steps: [],
  createdNodeIds: [],
  total: 0,
  done: 0,
  activityOpen: false,
  threadId: null,
  runId: null,
  runStatus: null,
  approvals: [],
  autonomy: "ask",
};

export const useUiStore = create<UiState>((set, get) => ({
  activeDrawer: null,
  commandOpen: false,
  agent: idleAgent,
  threads: [],
  setDrawer: (drawer) => set({ activeDrawer: drawer }),
  toggleDrawer: (drawer) => set({ activeDrawer: get().activeDrawer === drawer ? null : drawer }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setAgent: (patch) => set({ agent: { ...get().agent, ...patch } }),
  addContextNode: (id) => {
    const a = get().agent;
    if (a.contextNodeIds.includes(id)) return;
    set({ agent: { ...a, contextNodeIds: [...a.contextNodeIds, id] } });
  },
  removeContextNode: (id) => {
    const a = get().agent;
    set({ agent: { ...a, contextNodeIds: a.contextNodeIds.filter((x) => x !== id) } });
  },
  resetAgent: () => set({ agent: { ...idleAgent, autonomy: get().agent.autonomy } }),
  newThread: (projectId, title) => {
    const thread: AgentThread = {
      id: `t-${Date.now().toString(36)}`,
      projectId,
      title: title.slice(0, 48) || "New thread",
      createdAt: new Date().toISOString(),
    };
    set({ threads: [thread, ...get().threads] });
    return thread;
  },
}));
