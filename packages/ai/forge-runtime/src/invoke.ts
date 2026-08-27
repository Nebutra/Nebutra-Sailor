import { randomUUID } from "node:crypto";
import type { ZodError } from "zod";
import { ForgeRuntimeError } from "./errors";
import type { ForgeRegistry } from "./registry";
import type { InvokeRequest, InvokeResult } from "./types";

export async function invokeTool(
  registry: ForgeRegistry,
  request: InvokeRequest,
): Promise<InvokeResult> {
  const requestId = request.requestId ?? randomUUID();
  const started = performance.now();
  const toolId = request.toolId;

  try {
    const tool = registry.get(toolId);
    const parsed = tool.inputSchema.safeParse(request.input);
    if (!parsed.success) {
      return {
        ok: false,
        requestId,
        toolId: tool.id,
        code: "invalid_input",
        message: formatZodError(parsed.error),
        durationMs: elapsed(started),
      };
    }

    const output = await tool.execute(parsed.data);
    return {
      ok: true,
      requestId,
      toolId: tool.id,
      output,
      meterId: tool.meterId,
      unitCost: tool.unitCost ?? 0,
      durationMs: elapsed(started),
    };
  } catch (err) {
    if (err instanceof ForgeRuntimeError) {
      return {
        ok: false,
        requestId,
        toolId,
        code: err.code,
        message: err.message,
        durationMs: elapsed(started),
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      requestId,
      toolId,
      code: "execution_failed",
      message,
      durationMs: elapsed(started),
    };
  }
}

function elapsed(started: number): number {
  return Math.max(0, Math.round(performance.now() - started));
}

function formatZodError(error: ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
}
