import type { AgentConfig } from "./types.js";

const agents = new Map<string, AgentConfig>();

export function registerAgent(config: AgentConfig): void {
  agents.set(config.id, config);
}

export function getAgent(id: string): AgentConfig | undefined {
  return agents.get(id);
}

export function listAgents(): AgentConfig[] {
  return Array.from(agents.values());
}

export function removeAgent(id: string): boolean {
  return agents.delete(id);
}
