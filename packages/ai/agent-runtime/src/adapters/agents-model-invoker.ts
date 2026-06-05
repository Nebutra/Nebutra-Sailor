/**
 * AgentsModelInvoker — the ONE bridge that makes the substrate's `runTurn` use
 * the real provider stack. Implements `ModelInvoker` over @nebutra/agents
 * `generateText` (which resolves the provider + model and runs the AI SDK).
 * Each round sends the running history at the round's `config.model` — which is
 * how a per-node model (resolved from a node's NodeModelSpec) reaches the
 * provider.
 *
 * Tools are NOT passed here: the runtime's own ToolRegistry/loop owns tool
 * dispatch; this round is a plain text completion. Errors propagate to the loop
 * (which records them on the rollout), not swallowed.
 */

import { generateText } from "@nebutra/agents";
import type { ModelInvoker, ModelRoundRequest, ModelRoundResult } from "../loop";

type Role = "user" | "assistant" | "system";

function toRole(role: string): Role {
  return role === "assistant" || role === "system" ? role : "user";
}

export function createAgentsModelInvoker(): ModelInvoker {
  return {
    async invoke(request: ModelRoundRequest): Promise<ModelRoundResult> {
      const messages = request.history.map((m) => ({
        role: toRole(m.role),
        content: m.content,
      }));

      const result = await generateText(messages, { model: request.config.model });

      const text = result.text ?? "";
      const usage = result.usage;
      return {
        emissions: text.length > 0 ? [{ kind: "text", text }] : [],
        usage: {
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
        },
      };
    },
  };
}
