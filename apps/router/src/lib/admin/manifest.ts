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
          actions: ["channel.sync"],
        },
      ],
      actions: [
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
