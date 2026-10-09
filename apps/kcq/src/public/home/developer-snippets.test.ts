/** Every name the developer snippets and the agent replay show must exist in the pinned source. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM build helper without types.
import { resolveChartSource } from "../../../scripts/chart-source.mjs";
// @ts-expect-error: plain ESM build helper without types.
import { readFacts } from "../../../scripts/landing-source.mjs";
import { SNIPPETS } from "./developer-snippets";

const app = new URL("../../../", import.meta.url).pathname;
const source: string = resolveChartSource(app);
const read = (path: string) => readFileSync(resolve(source, path), "utf8");

describe("developer snippets", () => {
  it("import only what the packages export", () => {
    const code = SNIPPETS.map((snippet) => snippet.code).join("\n");
    expect(read("packages/vue/src/index.ts")).toMatch(/KlineChart[,\s]/);
    expect(read("packages/vue/src/index.ts")).toContain("CustomDataSource");
    expect(read("packages/vue/package.json")).toContain('"./style.css"');
    expect(read("packages/vue/package.json")).toContain('"./web-component"');
    expect(read("packages/react/src/index.ts")).toContain("KLineChartWC");
    expect(read("packages/react/src/KLineChartWC.tsx")).toContain("onZoomLevelChange");
    expect(read("packages/vue/src/web-component.ts")).toContain("customElements.define('kline-chart'");
    const controllers = read("packages/core/src/controllers/index.ts");
    expect(controllers).toContain("createChartController");
    expect(controllers).toContain("getRegisteredChartTools");
    expect(read("packages/core/src/features/agent/types.ts")).toContain("readonly toolHosts");
    expect(code).toContain("tool.execute(host, input");
  });

  it("the agent replay uses registered tool names only", () => {
    const pin = JSON.parse(readFileSync(resolve(app, "chart-source.json"), "utf8"));
    const facts = readFacts(source, pin);
    const replay = readFileSync(new URL("./home-agent.vue", import.meta.url), "utf8");
    const names = [...replay.matchAll(/tool: "([a-z_]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(["panes_list", "drawing_create", "instruments_query_name", "comparison_create"]);
    for (const name of names) expect(facts.tools.names).toContain(name);
  });
});
