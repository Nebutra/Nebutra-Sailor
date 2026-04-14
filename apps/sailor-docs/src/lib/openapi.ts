import path from "node:path";
import { createOpenAPI } from "fumadocs-openapi/server";

export const openapi = createOpenAPI({
  input: [path.join(process.cwd(), "openapi.json")],
});
