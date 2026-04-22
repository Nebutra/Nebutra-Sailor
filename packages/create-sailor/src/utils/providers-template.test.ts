import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type ProviderSelection,
  renderProviderEnvExample,
  renderProviderRegistry,
} from "./providers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.join(__dirname, "../../../../packages/ai-providers/templates");

describe("provider templates", () => {
  it("renders env examples from the shipped template files", () => {
    const selection: ProviderSelection = { providerIds: ["openai"] };
    const envExample = renderProviderEnvExample(selection, templateDir);

    expect(envExample).toContain("OPENAI_API_KEY=");
    expect(envExample).not.toContain("ANTHROPIC_API_KEY=");
    expect(envExample).not.toContain("CUSTOM_AI_BASE_URL=");
  });

  it("keeps custom endpoint variables when a custom endpoint is selected", () => {
    const selection: ProviderSelection = {
      providerIds: ["openai"],
      customEndpoint: {
        name: "custom",
        baseURL: "https://example.test/v1",
        apiKeyEnvName: "CUSTOM_AI_API_KEY",
      },
    };

    const envExample = renderProviderEnvExample(selection, templateDir);

    expect(envExample).toContain("CUSTOM_AI_NAME=custom");
    expect(envExample).toContain("CUSTOM_AI_BASE_URL=");
    expect(envExample).toContain("CUSTOM_AI_API_KEY=");
  });

  it("renders the real registry template without unresolved markers", () => {
    const selection: ProviderSelection = { providerIds: ["siliconflow"] };
    const registry = renderProviderRegistry(selection, templateDir);

    expect(registry).toContain("createOpenAICompatible");
    expect(registry).toContain("const siliconflow");
    expect(registry).not.toContain("@sailor:");
  });
});
