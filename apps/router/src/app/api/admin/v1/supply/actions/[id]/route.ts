import {
  ActionRequestSchema,
  ADMIN_ERROR_STATUS,
  assertApplyAllowed,
} from "@nebutra/contracts/admin";
import { ROUTER_ADMIN_MANIFEST } from "@/lib/admin/manifest";
import { err, gateStaff, json } from "@/lib/admin/service-token";
import {
  type AddSourceInput,
  addSource,
  discoverSourceByKey,
  probeOneModel,
  probeRunStatus,
  probeSourceNow,
  runActiveProbes,
  runSuspendedRetry,
  triggerDiscoveryForAllSources,
} from "@/lib/supply/capability";
import { SupplyConfigError } from "@/lib/supply/clients";
import { applyChannelSync, planChannelSync } from "@/lib/supply/domain";
import { completeLogin, isLoginProvider, startLogin } from "@/lib/supply/login";
import { applyPricePublish, planPricePublish, unpublishDrifted } from "@/lib/supply/pricing";
import { runQuotaPull, updateSourcePlanConfig } from "@/lib/supply/quota";

interface PlanWindowInputRow {
  readonly name: string;
  readonly unit: string;
  readonly limitAmount?: number;
  readonly windowSeconds?: number;
}

function isPlanWindows(value: unknown): value is PlanWindowInputRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof (row as Record<string, unknown>).name === "string" &&
        typeof (row as Record<string, unknown>).unit === "string",
    )
  );
}

const SOURCE_KINDS = new Set(["OPENAI_COMPATIBLE", "FAL_AI", "NEWAPI_CHANNEL", "CLIPROXYAPI"]);
const SOURCE_VISIBILITIES = new Set(["PUBLIC", "INTERNAL"]);

function isAddSourceInput(
  input: Record<string, unknown>,
): input is AddSourceInput & Record<string, unknown> {
  return (
    typeof input.key === "string" &&
    typeof input.label === "string" &&
    typeof input.baseUrl === "string" &&
    typeof input.kind === "string" &&
    SOURCE_KINDS.has(input.kind) &&
    (input.visibility === undefined ||
      (typeof input.visibility === "string" && SOURCE_VISIBILITIES.has(input.visibility)))
  );
}

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
    if (id === "price.unpublish_drifted") {
      return json(await unpublishDrifted(gate.caller, request));
    }
    if (id === "price.publish") {
      if (parsed.data.mode === "plan") return json(await planPricePublish());
      const result = await applyPricePublish(parsed.data.planId ?? "", gate.caller, request);
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
    if (id === "source.add") {
      if (!isAddSourceInput(parsed.data.input))
        return json(
          err(
            "invalid_input",
            "input.{key,label,baseUrl,kind} are required; kind must be a known source kind.",
          ),
          400,
        );
      // 202: the response carries a runId, but the actual fan-out probing of
      // any freshly discovered model happens asynchronously via Inngest, not
      // inside this request (ADR 2026-09-30 "Event-driven execution").
      return json(await addSource(parsed.data.input, gate.caller, request), 202);
    }
    if (id === "source.probe") {
      const key = parsed.data.input.key;
      if (typeof key !== "string" || !key)
        return json(err("invalid_input", "input.key is required."), 400);
      const result = await probeSourceNow(key, gate.caller, request);
      // 503 (not 502): Cloudflare rewrites a 502/504 origin response with its
      // own branded HTML before the client ever sees it, discarding this
      // body — see ADMIN_ERROR_STATUS's own doc comment. A failed event send
      // is an upstream-unavailable condition, not a gateway fault.
      return json(
        result,
        result.status === "queued" ? 202 : ADMIN_ERROR_STATUS.upstream_unavailable,
      );
    }
    if (id === "source.discover") {
      // The `discover(source) → diff` primitive: one bounded source, no
      // probing. Called by `supplySourceChanged` (gateway Inngest), and
      // available here for a direct, synchronous check — unlike `probe.one`,
      // listing a source's models is already a single HTTP call, so there is
      // no "many models in one request" hazard to avoid.
      const key = parsed.data.input.key;
      if (typeof key !== "string" || !key)
        return json(err("invalid_input", "input.key is required."), 400);
      return json(await discoverSourceByKey(key));
    }
    if (id === "probe.one") {
      // The `probe(source, model) → one call` primitive. Called once per
      // model, per Inngest step, by `supplyModelFanout` — never looped over
      // many models from inside a single request.
      const key = parsed.data.input.key;
      const upstreamModel = parsed.data.input.upstreamModel;
      if (typeof key !== "string" || !key || typeof upstreamModel !== "string" || !upstreamModel)
        return json(err("invalid_input", "input.{key,upstreamModel} are required."), 400);
      return json(await probeOneModel(key, upstreamModel));
    }
    if (id === "probe.status") {
      const key = parsed.data.input.key;
      const since = parsed.data.input.since;
      if (typeof key !== "string" || !key || typeof since !== "string" || !since)
        return json(err("invalid_input", "input.{key,since} are required (since: ISO date)."), 400);
      const sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime()))
        return json(err("invalid_input", "input.since must be a valid ISO date."), 400);
      return json(await probeRunStatus(key, sinceDate));
    }
    if (id === "discovery.run") {
      // Bounded by source count, not model count: lists enabled sources and
      // emits one supply/source.changed per source (ADR 2026-09-30
      // "Event-driven execution") — no upstream discovery call happens here.
      return json(await triggerDiscoveryForAllSources());
    }
    if (id === "probe.idle") {
      // Bounded: one capped DB read, grouped and emitted as events — no
      // upstream probe call happens inside this request.
      return json(await runActiveProbes());
    }
    if (id === "probe.suspended") {
      return json(await runSuspendedRetry());
    }
    if (id === "source.plan.update") {
      const key = parsed.data.input.key;
      const windows = parsed.data.input.windows;
      if (typeof key !== "string" || !key || !isPlanWindows(windows)) {
        return json(
          err(
            "invalid_input",
            "input.key (string) and input.windows (array of {name, unit, limitAmount?, windowSeconds?}) are required.",
          ),
          400,
        );
      }
      return json(
        await updateSourcePlanConfig(
          key,
          windows.map((w) => ({
            name: w.name,
            unit: w.unit,
            limitAmount: w.limitAmount ?? null,
            windowSeconds: w.windowSeconds ?? null,
          })),
        ),
      );
    }
    if (id === "quota.pull") {
      return json({ results: await runQuotaPull() });
    }
    return json(err("not_found", `Action ${id} has no handler.`), 404);
  } catch (error) {
    if (error instanceof SupplyConfigError)
      return json(
        err("upstream_unavailable", error.message),
        ADMIN_ERROR_STATUS.upstream_unavailable,
      );
    return json(
      err("upstream_unavailable", error instanceof Error ? error.message : "action failed"),
      ADMIN_ERROR_STATUS.upstream_unavailable,
    );
  }
}
