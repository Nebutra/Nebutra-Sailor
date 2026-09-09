import { ActionRequestSchema, assertApplyAllowed } from "@nebutra/contracts/admin";
import { ROUTER_ADMIN_MANIFEST } from "@/lib/admin/manifest";
import { err, gateStaff, json } from "@/lib/admin/service-token";
import { SupplyConfigError } from "@/lib/supply/clients";
import { applyChannelSync, planChannelSync } from "@/lib/supply/domain";
import { completeLogin, isLoginProvider, startLogin } from "@/lib/supply/login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

const supply = ROUTER_ADMIN_MANIFEST.domains.find((d) => d.id === "supply");

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const action = supply?.actions.find((a) => a.id === id);
  if (!action) return json(err("not_found", `Unknown action ${id}.`), 404);

  const gate = await gateStaff(request, action.role);
  if (!gate.ok) return json(gate.body, gate.status);

  const parsed = ActionRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return json(err("invalid_input", "Body must be { mode: plan | apply, input?, planId? }."), 400);
  const denied = assertApplyAllowed(action, parsed.data);
  if (denied) return json(denied, 409);

  try {
    if (id === "channel.sync") {
      if (parsed.data.mode === "plan") return json(await planChannelSync());
      const result = await applyChannelSync(parsed.data.planId ?? "", gate.caller, request);
      if ("expired" in result)
        return json(err("plan_expired", "Plan expired or unknown — plan again."), 409);
      return json(result);
    }
    if (id === "account.login") {
      const provider = parsed.data.input.provider;
      if (!isLoginProvider(provider))
        return json(
          err("invalid_input", "input.provider must be codex | antigravity | anthropic."),
          400,
        );
      return json(await startLogin(provider, gate.caller, request));
    }
    if (id === "account.login.callback") {
      const redirectUrl = parsed.data.input.redirectUrl;
      if (typeof redirectUrl !== "string" || !redirectUrl)
        return json(err("invalid_input", "input.redirectUrl is required."), 400);
      return json(await completeLogin(redirectUrl, gate.caller, request));
    }
    return json(err("not_found", `Action ${id} has no handler.`), 404);
  } catch (error) {
    if (error instanceof SupplyConfigError)
      return json(err("upstream_unavailable", error.message), 503);
    return json(
      err("upstream_unavailable", error instanceof Error ? error.message : "action failed"),
      502,
    );
  }
}
