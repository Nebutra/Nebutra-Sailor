/**
 * The agent-readable view of the public site (llmstxt.org; research E6, L3): the same product,
 * written for an agent, generated at prerender from the pinned chart commit so it cannot drift from
 * what the page and the library ship. Served as /llms.txt (scripts/prerender.mjs); the footer's
 * "Agent" mode links here.
 */
import facts from "virtual:kcq-facts";
import { SNIPPETS } from "./home/developer-snippets";
import { INVESTOR_EMAIL } from "./investors/contact";
import { docsPath, INSTALL_COMMAND, LINKS } from "./links";
import { APP_PATH, KCQ_ORIGIN, PUBLIC_ROUTES, publicPath } from "./routes";

export function renderLlmsTxt(): string {
  const tools = facts.tools.names.map(
    (name) => `- \`${name}\` (${facts.tools.safety[name] === "read-only" ? "read-only" : "changes the chart"})`,
  );
  return [
    "# KLineChartQuant",
    "",
    "> An open-source K-line (candlestick) chart and quant workstation that an agent can drive. The",
    "> agent and the interface call the same chart methods, so what an agent does appears on the chart",
    `> the user is looking at. Apache-2.0. Version ${facts.version}, commit ${facts.commit.slice(0, 8)}.`,
    "",
    "## Use it",
    "",
    `- Workstation in the browser: ${KCQ_ORIGIN}${APP_PATH}`,
    `- Install the library: \`${INSTALL_COMMAND}\``,
    `- Documentation: ${KCQ_ORIGIN}${docsPath("en")} (Chinese: ${KCQ_ORIGIN}${docsPath("zh")}); every page is also Markdown at <page>.md`,
    `- Documentation for agents: ${KCQ_ORIGIN}${docsPath("en", "llms.txt")} and ${KCQ_ORIGIN}${docsPath("en", "llms-full.txt")}`,
    `- Agent tool reference: ${KCQ_ORIGIN}${docsPath("en", "agent/tools")}`,
    `- Source: ${LINKS.github}`,
    `- Package: ${LINKS.npm}`,
    "",
    "## Chart tools for agents",
    "",
    "`getRegisteredChartTools()` from `@363045841yyt/klinechart-core/controllers` returns each tool",
    "with its name, description, JSON Schema parameters and safety level. A read-only agent receives",
    `only the read-only tools. Registry at this commit: ${facts.tools.href}`,
    "",
    ...tools,
    "",
    "Wiring them into your own agent loop:",
    "",
    "```ts",
    SNIPPETS.find((snippet) => snippet.id === "agent")!.code,
    "```",
    "",
    "## Pages",
    "",
    ...PUBLIC_ROUTES.map((route) => `- ${KCQ_ORIGIN}${route.path} (${route.page}, ${route.locale})`),
    "",
    "## Investors and partners",
    "",
    "KLineChartQuant is raising its seed round and looking for design partners. The business plan is",
    `sent on request: write to ${INVESTOR_EMAIL}. Overview: ${KCQ_ORIGIN}${publicPath("investors", "en")}`,
    "",
    "## Notes",
    "",
    "- Market data on the public pages is read-only daily bars from GOTDX and may be delayed.",
    "- Not investment advice.",
    "",
  ].join("\n");
}
