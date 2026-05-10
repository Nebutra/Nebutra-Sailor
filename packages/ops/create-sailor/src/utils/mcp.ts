import fs from "node:fs";
import path from "node:path";

export async function applyMcpSwitch(
  targetDir: string,
  mode: "on" | "off" | string,
): Promise<void> {
  const mcpPkg = path.join(targetDir, "packages", "mcp");

  if (mode === "off") {
    // Remove MCP package entirely
    if (fs.existsSync(mcpPkg)) {
      fs.rmSync(mcpPkg, { recursive: true, force: true });
    }

    // Also remove any MCP-related scripts from package.json
    const cliCommandFile = path.join(
      targetDir,
      "packages",
      "cli",
      "src",
      "commands",
      "mcp-server.ts",
    );
    if (fs.existsSync(cliCommandFile)) {
      fs.rmSync(cliCommandFile, { force: true });
    }

    return;
  }

  // "on" (default) — keep as-is, nothing to do
  // The package.json scripts and pnpm-workspace.yaml already reference it.
  // The user can start it with `pnpm mcp-server` or via the sailor CLI.

  // Add a reminder to .env.example for MCP-specific config
  const envPath = path.join(targetDir, ".env.example");
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, "utf-8");
    const marker = "# MCP Server (Agent-friendly API)";
    if (!existing.includes(marker)) {
      const block = [
        "",
        "# =============================================",
        marker,
        "# Docs: https://modelcontextprotocol.io",
        "# =============================================",
        "# MCP server exposes your SaaS capabilities to AI agents via MCP protocol.",
        "# Run: pnpm mcp-server (starts stdio server)",
        "# No config required for stdio transport. HTTP transport needs:",
        'MCP_HTTP_PORT="3100"',
        'MCP_API_KEY=""',
        "",
      ].join("\n");
      fs.appendFileSync(envPath, block);
    }
  }
}
