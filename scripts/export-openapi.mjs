/* eslint-env node */
/* global console, process */
import app from "../backends/gateway/src/index.js";

// Extract the OpenAPI spec by calling the /openapi.json route
async function exportSchema() {
  const res = await app.request("/openapi.json");
  const schema = await res.json();

  const fs = await import("node:fs");
  const path = await import("node:path");

  const outPath = path.resolve(process.cwd(), "apps/design-docs/openapi.json");
  fs.writeFileSync(outPath, JSON.stringify(schema, null, 2));
}

void exportSchema();
