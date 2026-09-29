// Shared between next.config.ts (the `redirects()` table used by the ECS
// standalone target, which still runs a real server) and
// scripts/postbuild-static-export.mjs (which turns the same table into real
// static HTML redirect pages for the static-export target, since
// `output: "export"` cannot run `redirects()` at all). One list so the two
// targets can't drift apart.
//
// Paths are in the zone's PUBLIC shape: no `/docs` basePath prefix (Next/the
// postbuild script add that), and the default language carries no locale
// segment (`i18n.hideLocale`).
function renamed(from, to) {
  return [
    { source: `/${from}`, destination: `/${to}` },
    { source: `/zh/${from}`, destination: `/zh/${to}` },
  ];
}

export const TAXONOMY_REDIRECTS = [
  { source: "/sailor/getting-started", destination: "/getting-started/installation" },
  ...renamed("whitelabel", "customization/overview"),
  ...renamed("billing", "payments/overview"),
  ...renamed("authentication", "guides/authentication"),
  ...renamed("multi-tenancy", "guides/multi-tenancy"),
  ...renamed("ai-integrations", "ai/overview"),
  ...renamed("integrations", "integrations/overview"),
  ...renamed("infrastructure", "deployment/overview"),
  ...renamed("monorepo", "development/project-structure"),
];
