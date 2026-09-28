import { create } from "zustand";
import type { AgentStep, AgentThread } from "@/domain/types";
import type { AgentApproval, AgentRunState } from "@/lib/agent-api";

/**
 * Canvas chrome state. LibTV's surfaces are independent: the 资产管理 outliner on the left and the
 * Agent drawer on the right can be open together, 生成历史 is a modal over both, and the add-node
 * menu opens wherever it was asked for (dock, double-click, a node's + port).
 */
export type CanvasTool = "select" | "hand";

export interface AddMenuRequest {
  /** Where to draw the menu, in viewport pixels. */
  screen: { x: number; y: number };
  /** Where the new node lands, in canvas coordinates. */
  flow: { x: number; y: number };
  /** Wire the new node downstream of this one (a node's right + port). */
  sourceId?: string;
  /** The dock's + toggles its own menu, so it needs to know the open one is its. */
  origin?: "dock";
}

export const AGENT_WIDTH = { min: 340, max: 720, initial: 400 } as const;

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
  assetsOpen: boolean;
  agentOpen: boolean;
  historyOpen: boolean;
  tool: CanvasTool;
  addMenu: AddMenuRequest | null;
  agentWidth: number;
  commandOpen: boolean;
  /** A node whose prompt should take focus the next time its config mounts (seeded workspaces). */
  promptFocusNodeId: string | null;
  agent: AgentRun;
  /** project-scoped threads (B) — mock */
  threads: AgentThread[];
  setAssetsOpen: (open: boolean) => void;
  setAgentOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setTool: (tool: CanvasTool) => void;
  openAddMenu: (request: AddMenuRequest) => void;
  closeAddMenu: () => void;
  setAgentWidth: (width: number) => void;
  /** Close every canvas surface — leaving the workspace. */
  closeAll: () => void;
  setCommandOpen: (open: boolean) => void;
  setPromptFocus: (nodeId: string | null) => void;
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
  assetsOpen: false,
  agentOpen: false,
  historyOpen: false,
  tool: "select",
  addMenu: null,
  agentWidth: AGENT_WIDTH.initial,
  commandOpen: false,
  promptFocusNodeId: null,
  agent: idleAgent,
  threads: [],
  setAssetsOpen: (open) => set({ assetsOpen: open }),
  setAgentOpen: (open) => set({ agentOpen: open }),
  setHistoryOpen: (open) => set({ historyOpen: open }),
  setTool: (tool) => set({ tool }),
  openAddMenu: (request) => set({ addMenu: request }),
  closeAddMenu: () => set({ addMenu: null }),
  setAgentWidth: (width) =>
    set({ agentWidth: Math.round(Math.min(AGENT_WIDTH.max, Math.max(AGENT_WIDTH.min, width))) }),
  closeAll: () =>
    set({ assetsOpen: false, agentOpen: false, historyOpen: false, addMenu: null, tool: "select" }),
  setCommandOpen: (open) => set({ commandOpen: open }),
  setPromptFocus: (nodeId) => set({ promptFocusNodeId: nodeId }),
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
      title: title.slice(0, 48) || "新对话",
      createdAt: new Date().toISOString(),
    };
    set({ threads: [thread, ...get().threads] });
    return thread;
  },
}));
