import path from "node:path";
import { createOpenAPI } from "fumadocs-openapi/server";

export const OPENAPI_DOCUMENT_ID = "openapi.json";
const openapiDocumentPath = path.join(process.cwd(), OPENAPI_DOCUMENT_ID);

export const openapi = createOpenAPI({
  input: () => ({
    [OPENAPI_DOCUMENT_ID]: openapiDocumentPath,
  }),
});
