import { invokeTool } from "@nebutra/forge-runtime";
import { createUsageEnvelope, PrepaidWalletError } from "@nebutra/prepaid-wallet";
import { NextResponse } from "next/server";
import { getForgeRegistry } from "@/lib/registry";
import { getDemoWallet } from "@/lib/wallet";

type RouteContext = { params: Promise<{ toolId: string[] }> };

/**
 * POST /api/v1/tools/invoke/:toolId
 * Body: { input: unknown, requestId?: string, tenantId?: string }
 *
 * Free tools (unitCost 0) skip debit. Paid tools debit demo wallet (or CreditBalance in prod).
 * toolId may contain slashes (e.g. text/word-count) via catch-all segments.
 */
export async function POST(request: Request, context: RouteContext) {
  const { toolId: segments } = await context.params;
  const toolId = segments.map((s) => decodeURIComponent(s)).join("/");

  let body: { input?: unknown; requestId?: string; tenantId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Request body must be JSON" },
      { status: 400 },
    );
  }

  const registry = getForgeRegistry();
  const tenantId = body.tenantId ?? "demo";
  const result = await invokeTool(registry, {
    toolId,
    input: body.input ?? {},
    tenantId,
    ...(body.requestId !== undefined ? { requestId: body.requestId } : {}),
  });

  if (!result.ok) {
    const status =
      result.code === "tool_not_found" ? 404 : result.code === "invalid_input" ? 400 : 422;
    return NextResponse.json(result, { status });
  }

  if (result.unitCost > 0) {
    const wallet = getDemoWallet();
    try {
      const enough = await wallet.hasBalance(tenantId, result.unitCost);
      if (!enough) {
        return NextResponse.json(
          {
            ok: false,
            code: "insufficient_credits",
            message: "Insufficient prepaid balance",
            requestId: result.requestId,
          },
          { status: 402 },
        );
      }
      await wallet.debit({
        tenantId,
        amount: result.unitCost,
        description: `forge:${result.toolId}`,
        relatedId: result.requestId,
      });
    } catch (err) {
      if (err instanceof PrepaidWalletError && err.code === "insufficient_credits") {
        return NextResponse.json(
          {
            ok: false,
            code: err.code,
            message: err.message,
            requestId: result.requestId,
          },
          { status: 402 },
        );
      }
      throw err;
    }
  }

  const usage = createUsageEnvelope({
    requestId: result.requestId,
    tenantId,
    apiKeyId: null,
    product: "forge",
    meterId: result.meterId,
    customerCharge: {
      amount: result.unitCost,
      currency: "USD",
      unit: "call",
    },
    quantity: 1,
    status: "success",
  });

  return NextResponse.json({
    ...result,
    usage,
  });
}
