// @brand-exempt: "nebutra.admin/v1" is the contract version identifier, not brand copy
import { brand } from "@nebutra/brand/metadata";
import { type AdminManifest, AdminManifestSchema } from "@nebutra/contracts/admin";

const V1 = "/api/admin/v1/supply";

/**
 * Router's admin manifest. The product owns its supply domain; the platform
 * admin renders it from this document and never imports router code.
 */
export const ROUTER_ADMIN_MANIFEST: AdminManifest = AdminManifestSchema.parse({
  contract: "nebutra.admin/v1",
  product: "router",
  label: "Nebutra Router",
  version: process.env.npm_package_version ?? "0.0.0",
  origin: process.env.NEXT_PUBLIC_ROUTER_URL?.trim() || `https://${brand.domains.router}`,
  graph: "labs",
  status: "wip",
  health: "/api/health",
  domains: [
    {
      id: "supply",
      label: "Supply",
      slot: "/management.html",
      resources: [
        {
          id: "engine",
          label: "Engines",
          list: `${V1}/engines`,
          columns: [
            { key: "label", label: "Engine" },
            { key: "status", label: "Status", kind: "status" },
            { key: "latencyMs", label: "Latency", kind: "number", align: "end" },
            { key: "detail", label: "Detail", kind: "mono" },
          ],
        },
        {
          id: "account",
          label: "Accounts",
          list: `${V1}/accounts`,
          search: true,
          columns: [
            { key: "provider", label: "Provider" },
            { key: "account", label: "Account", kind: "mono" },
            { key: "status", label: "Status", kind: "badge" },
            { key: "lastUsed", label: "Last used", kind: "time" },
            { key: "requests", label: "Req · recent", kind: "number", align: "end" },
          ],
          actions: ["account.login"],
        },
        {
          id: "login",
          label: "Sign-ins in progress",
          list: `${V1}/logins`,
          columns: [
            { key: "providerLabel", label: "Provider" },
            { key: "status", label: "Status", kind: "badge" },
            { key: "detail", label: "Detail" },
            { key: "startedAt", label: "Started", kind: "time" },
          ],
          actions: ["account.login.callback"],
        },
        {
          id: "shelf",
          label: "Shelf",
          list: `${V1}/shelf`,
          columns: [
            { key: "id", label: "Model", kind: "mono" },
            { key: "supply", label: "Supply", kind: "badge" },
            { key: "status", label: "Status", kind: "badge" },
          ],
          actions: ["channel.sync", "price.publish", "price.unpublish_drifted"],
        },
        {
          id: "source",
          label: "Supply sources",
          list: `${V1}/sources`,
          columns: [
            { key: "label", label: "Source" },
            { key: "kind", label: "Kind", kind: "badge" },
            { key: "protocol", label: "Protocol", kind: "mono" },
            { key: "visibility", label: "Visibility", kind: "badge" },
            { key: "enabled", label: "Enabled", kind: "badge" },
            { key: "lastDiscoveredAt", label: "Last discovered", kind: "time" },
          ],
          actions: ["source.add", "source.probe"],
        },
        {
          id: "capability",
          label: "Model capability",
          list: `${V1}/capabilities`,
          search: true,
          columns: [
            { key: "publicModel", label: "Public model", kind: "mono" },
            { key: "source", label: "Source" },
            { key: "upstreamModel", label: "Upstream model", kind: "mono" },
            { key: "state", label: "State", kind: "badge" },
            { key: "stateReason", label: "Reason", kind: "mono" },
            { key: "lastProbeAt", label: "Last probe", kind: "time" },
            { key: "nextProbeAt", label: "Next retry", kind: "time" },
          ],
        },
      ],
      actions: [
        {
          id: "account.login",
          verb: "Add account",
          resource: "account",
          role: "platform_operator",
          url: `${V1}/actions/account.login`,
          plan: false,
          destructive: false,
          input: {
            type: "object",
            required: ["provider"],
            properties: {
              provider: { type: "string", enum: ["codex", "antigravity", "anthropic"] },
            },
          },
          description:
            "Start an OAuth sign-in for a subscription account; returns the URL to approve on your own device.",
        },
        {
          id: "account.login.callback",
          verb: "Paste callback",
          resource: "login",
          role: "platform_operator",
          url: `${V1}/actions/account.login.callback`,
          plan: false,
          destructive: false,
          input: {
            type: "object",
            required: ["redirectUrl"],
            properties: {
              redirectUrl: {
                type: "string",
                description: "The localhost URL the provider redirected to",
              },
            },
          },
          description: "Complete a sign-in by replaying the provider's localhost callback URL.",
        },
        {
          id: "channel.sync",
          verb: "Sync channel",
          resource: "shelf",
          role: "platform_operator",
          url: `${V1}/actions/channel.sync`,
          plan: true,
          destructive: false,
          description:
            "Publish every model CLIProxyAPI serves to the New-API channel that sells it.",
        },
        {
          id: "price.publish",
          verb: "Publish prices",
          resource: "shelf",
          role: "platform_operator",
          url: `${V1}/actions/price.publish`,
          plan: true,
          destructive: false,
          description:
            "Write the shelf into the price table the /v1 edge charges from. A model reaches customers only when supply confirms it and it carries a price.",
        },
        {
          id: "price.unpublish_drifted",
          verb: "Take drifted off sale",
          resource: "shelf",
          role: "platform_operator",
          url: `${V1}/actions/price.unpublish_drifted`,
          plan: false,
          destructive: false,
          description:
            "Unpublish every model that now costs more upstream than we charge. Prices are never raised automatically — a silent increase ambushes the customer on their next invoice.",
        },
        {
          id: "source.add",
          verb: "Add source",
          resource: "source",
          role: "platform_operator",
          url: `${V1}/actions/source.add`,
          plan: false,
          destructive: false,
          input: {
            type: "object",
            required: ["key", "label", "baseUrl", "kind"],
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              baseUrl: { type: "string" },
              kind: {
                type: "string",
                enum: ["OPENAI_COMPATIBLE", "FAL_AI", "NEWAPI_CHANNEL", "CLIPROXYAPI"],
              },
              apiKey: { type: "string" },
              managementKey: { type: "string" },
              rootPassword: { type: "string" },
              channelName: { type: "string" },
              knownModelIds: { type: "array", items: { type: "string" } },
              visibility: {
                type: "string",
                enum: ["PUBLIC", "INTERNAL"],
                description:
                  "PUBLIC (default): sellable on the shelf, reachable by the customer relay. INTERNAL: Nebutra team use only — never on the public shelf, never used for the customer relay; only the internal service-token relay routes to it.",
              },
            },
          },
          description:
            "Register a supply source (base URL + credential), auto-detect its protocol, discover its models and probe them immediately.",
        },
        {
          id: "source.probe",
          verb: "Probe now",
          resource: "source",
          role: "platform_operator",
          url: `${V1}/actions/source.probe`,
          plan: false,
          destructive: false,
          input: {
            type: "object",
            required: ["key"],
            properties: { key: { type: "string" } },
          },
          description: "Re-run discovery and an active probe for every model this source has.",
        },
        {
          id: "discovery.run",
          verb: "Run discovery",
          resource: "source",
          role: "platform_operator",
          url: `${V1}/actions/discovery.run`,
          plan: false,
          destructive: false,
          description:
            "Discovery diff for every enabled source — new / vanished models. Called on the daily schedule (backends/gateway Inngest); available here for an on-demand run.",
        },
        {
          id: "probe.idle",
          verb: "Probe idle models",
          resource: "capability",
          role: "platform_operator",
          url: `${V1}/actions/probe.idle`,
          plan: false,
          destructive: false,
          description:
            "Active-probe every AVAILABLE/DEGRADED model nobody has probed in 24h. Called on the daily schedule.",
        },
        {
          id: "probe.suspended",
          verb: "Retry suspended models",
          resource: "capability",
          role: "platform_operator",
          url: `${V1}/actions/probe.suspended`,
          plan: false,
          destructive: false,
          description:
            "Retry every SUSPENDED model whose backoff has elapsed. Called on the hourly schedule.",
        },
      ],
      signals: [
        {
          id: "engine.down",
          label: "Engine unreachable",
          severity: "critical",
          probe: `${V1}/signals/engine.down`,
          resource: "engine",
        },
        {
          id: "price.drift",
          label: "Upstream costs more than we charge",
          severity: "critical",
          probe: `${V1}/signals/price.drift`,
          resource: "shelf",
          action: "price.unpublish_drifted",
        },
        {
          id: "channel.drift",
          label: "Channel out of sync",
          severity: "warn",
          probe: `${V1}/signals/channel.drift`,
          resource: "shelf",
          action: "channel.sync",
        },
        {
          id: "account.expired",
          label: "Account needs re-login",
          severity: "warn",
          probe: `${V1}/signals/account.expired`,
          resource: "account",
        },
        {
          id: "supply.suspended",
          label: "A sold model's supply is suspended",
          severity: "critical",
          probe: `${V1}/signals/supply.suspended`,
          resource: "capability",
        },
      ],
      policies: [
        {
          id: "channel.autosync",
          label: "Sync the channel whenever the account pool changes",
          on: "nebutra/supply.account.changed",
          runs: "channel.sync",
          enabled: false,
        },
      ],
    },
  ],
});
