/**
 * /api/v1/workflows — tenant workflow run triggers.
 *
 * POST /:id/run enqueues a `nebutra/workflow.run.requested` event; the Inngest
 * workflowRunner picks it up, executes the definition's scriptSource in the
 * QuickJS sandbox (wired to the real provider stack), and persists a
 * WorkflowRun. Tenant-scoped via requireAuth; a run is refused for a workflow
 * the caller's tenant does not own.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getWorkflowRepository } from "@nebutra/repositories";
import { inngest } from "../../inngest/client.js";
import { requireAuth } from "../../middlewares/tenantContext.js";

export const workflowRoutes = new OpenAPIHono();

workflowRoutes.use("*", requireAuth);

const runRoute = createRoute({
  method: "post",
  path: "/{id}/run",
  tags: ["Workflows"],
  operationId: "runWorkflow",
  summary: "Enqueue a workflow run",
  request: {
    params: z.object({ id: z.string().min(1) }),
    body: {
      required: false,
      content: {
        "application/json": {
          schema: z.object({ args: z.record(z.string(), z.unknown()).optional() }),
        },
      },
    },
  },
  responses: {
    202: { description: "Run enqueued" },
    401: { description: "Unauthenticated / no organization scope" },
    404: { description: "Workflow not found" },
  },
});

workflowRoutes.openapi(runRoute, async (c) => {
  const tenant = c.get("tenant") as { organizationId?: string; userId?: string };
  const tenantId = tenant.organizationId;
  if (!tenantId) return c.json({ error: "organization scope required" }, 401);

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  // Ownership check before enqueue — never leak another tenant's workflow id.
  const def = await getWorkflowRepository(tenantId).findById(id);
  if (!def) return c.json({ error: "workflow not found" }, 404);

  const requestedAt = new Date().toISOString();
  await inngest.send({
    name: "nebutra/workflow.run.requested",
    data: {
      tenantId,
      workflowId: id,
      requestedAt,
      args: body?.args ?? {},
      triggeredBy: "manual",
    },
  });

  return c.json({ enqueued: true, workflowId: id, requestedAt }, 202);
});
