import { toolInputJsonSchema } from "./json-schema";
import type { ForgeRegistry } from "./registry";
import type { AnyForgeToolDefinition } from "./types";

export interface OpenApiBuildOptions {
  /** Public origin, e.g. `https://forge.nebutra.com`. No trailing slash. */
  readonly serverUrl: string;
  /** Document version; bump when the invoke contract changes. */
  readonly version?: string;
  /** Restrict to a tier subset (default: every registered tool). */
  readonly tiers?: readonly AnyForgeToolDefinition["tier"][];
}

const ERROR_SCHEMA = {
  type: "object",
  required: ["ok", "code", "message"],
  properties: {
    ok: { type: "boolean", const: false },
    code: {
      type: "string",
      enum: [
        "tool_not_found",
        "invalid_input",
        "execution_failed",
        "not_implemented",
        "invalid_json",
        "auth_required",
        "insufficient_credits",
      ],
    },
    message: { type: "string" },
    requestId: { type: "string" },
    toolId: { type: "string" },
    durationMs: { type: "number" },
  },
} as const;

function successSchema(tool: AnyForgeToolDefinition) {
  return {
    type: "object",
    required: ["ok", "requestId", "toolId", "output", "meterId", "unitCost", "durationMs"],
    properties: {
      ok: { type: "boolean", const: true },
      requestId: { type: "string" },
      toolId: { type: "string", const: tool.id },
      output: { description: `Result payload of ${tool.id}.` },
      meterId: { type: "string", const: tool.meterId },
      unitCost: { type: "number" },
      durationMs: { type: "number" },
      usage: { type: "object", additionalProperties: true },
    },
  };
}

function operationId(toolId: string): string {
  return `invoke_${toolId.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

function errorResponse(description: string) {
  return {
    description,
    content: { "application/json": { schema: ERROR_SCHEMA } },
  };
}

/**
 * Build an OpenAPI 3.1 document covering every registered tool as its own
 * `POST /api/v1/tools/invoke/{id}` operation (§6.7.5 machine discovery).
 *
 * One operation per tool — not a single polymorphic endpoint — so SDK codegen
 * and agent planners get a real typed request body per capability.
 */
export function buildForgeOpenApi(
  registry: ForgeRegistry,
  options: OpenApiBuildOptions,
): Record<string, unknown> {
  const serverUrl = options.serverUrl.replace(/\/$/, "");
  const tierFilter = options.tiers;
  const summaries = registry.list().filter((t) => !tierFilter || tierFilter.includes(t.tier));

  const paths: Record<string, unknown> = {
    "/api/v1/tools": {
      get: {
        operationId: "listTools",
        summary: "List every callable tool with roots, tier and metering metadata.",
        tags: ["catalog"],
        responses: {
          "200": {
            description: "Tool catalog.",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
    "/api/v1/jobs": {
      post: {
        operationId: "createJob",
        summary: "Run a tool asynchronously (J surface) and poll or webhook for the result.",
        tags: ["jobs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["toolId"],
                properties: {
                  toolId: { type: "string" },
                  input: { description: "Same payload as the sync invoke `input`." },
                },
              },
            },
          },
        },
        responses: {
          "202": {
            description: "Job accepted.",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "400": errorResponse("Malformed body or missing toolId."),
          "502": errorResponse("Dispatch to the job worker failed."),
        },
      },
    },
    "/api/v1/jobs/{jobId}": {
      get: {
        operationId: "getJob",
        summary: "Poll an async job.",
        tags: ["jobs"],
        parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Job state.",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "404": errorResponse("Unknown job id."),
        },
      },
    },
  };

  for (const summary of summaries) {
    const tool = registry.get(summary.id);
    paths[`/api/v1/tools/invoke/${tool.id}`] = {
      post: {
        operationId: operationId(tool.id),
        summary: tool.title.en,
        description: `${tool.description.en}\n\n${tool.description.zh}`,
        tags: [tool.category, ...(summary.roots ?? [])],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["input"],
                additionalProperties: false,
                properties: {
                  input: toolInputJsonSchema(tool.inputSchema),
                  requestId: {
                    type: "string",
                    description: "Caller-supplied trace id; echoed back on the response.",
                  },
                  tenantId: { type: "string", description: "Tenant to meter this call against." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tool executed.",
            content: { "application/json": { schema: successSchema(tool) } },
          },
          "400": errorResponse("Invalid JSON body or input schema violation."),
          "401": errorResponse("Sign-in required (paid tool, unitCost > 0)."),
          "402": errorResponse("Insufficient prepaid balance."),
          "404": errorResponse("Unknown tool id."),
          "422": errorResponse("Execution failed."),
        },
        "x-forge": {
          toolId: tool.id,
          roots: summary.roots ?? [],
          sideEffect: tool.sideEffect,
          tier: tool.tier,
          meterId: tool.meterId,
          unitCost: tool.unitCost ?? 0,
          engine: tool.engine,
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Nebutra Forge",
      version: options.version ?? "1.0.0",
      description:
        "Deterministic tool calls for agents and humans. One implementation, two readers: " +
        "human pages under /t/{slug}, machine calls under /api/v1.",
    },
    servers: [{ url: serverUrl }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Nebutra API key (`sk-sailor-*`). Optional for free tools (unitCost 0).",
        },
      },
    },
    tags: [
      { name: "catalog", description: "Discovery." },
      { name: "jobs", description: "Async (J) surface." },
    ],
    paths,
  };
}
