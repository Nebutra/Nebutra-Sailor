/**
 * Developer console hub — signed-in index of existing settings routes.
 * The public catalog lives on landing `/open` (open.nebutra.com).
 */

export const DEVELOPER_CONSOLE_LINKS = [
  {
    id: "api-keys",
    href: "/settings/api-keys",
    title: "API Keys",
    description: "Create and revoke programmatic keys for the gateway.",
  },
  {
    id: "webhooks",
    href: "/settings/webhooks",
    title: "Webhooks",
    description: "Subscribe to workspace events. Payloads are signed.",
  },
  {
    id: "provider-keys",
    href: "/settings/provider-keys",
    title: "Provider Keys",
    description: "Bring your own AI provider credentials.",
  },
] as const;
