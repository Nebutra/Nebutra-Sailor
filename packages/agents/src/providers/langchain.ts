/**
 * LangChain.js agent adapter — stub.
 *
 * This module intentionally throws at construction time to guide
 * developers through the required dependency installation.
 *
 * Once the packages are installed, implement the `execute()` method
 * using LangChain's AgentExecutor or the newer LangGraph approach.
 */

import { BaseAgent } from "../agent.js";
import type { AgentConfig } from "../types.js";

export class LangChainAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
    throw new Error(
      [
        "LangChain agent requires additional packages. Install:",
        "",
        "  pnpm add langchain @langchain/core @langchain/openai",
        "",
        "Then implement the execute() method in this file using",
        "LangChain's AgentExecutor or LangGraph.",
      ].join("\n"),
    );
  }
}
