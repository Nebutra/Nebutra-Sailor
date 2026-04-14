import { generateFiles } from "fumadocs-openapi";
import { createOpenAPI } from "fumadocs-openapi/server";

// Create a standalone OpenAPI instance for the generation script
// (separate from the one in src/lib/openapi.ts to avoid Next.js-specific imports)
const openapi = createOpenAPI({
  input: ["./openapi.json"],
});

void generateFiles({
  input: openapi,
  output: "./content/docs",
  // Group by tag: creates System.mdx, Legal.mdx, Events.mdx
  per: "tag",
  // Include endpoint descriptions from the OpenAPI schema
  includeDescription: true,
  // Add auto-generated comment to MDX files
  addGeneratedComment: true,
});
