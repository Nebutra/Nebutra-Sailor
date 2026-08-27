# tool-protocol Anti-patterns

## Internal everything over protocol

Do not wrap internal hot-path functions just to make them look like tools. Use protocol calls for external, remote, or cross-process boundaries.

## Missing manifest

Every connected server needs a manifest with name, version, and scopes. Without it, consent is not meaningful.

## Consent at server level only

Consent is per tool. A tenant can allow one action from a server without approving every action that server exposes.

## Silent tool writes

Tools that mutate persistent content must be routed through higher layers that can commit to `event-log`. Direct writes make rollback unverifiable.

## Secret arguments

Do not place raw credentials in tool arguments. Pass scoped token identifiers or let `integration-vault` resolve secrets outside the agent prompt.
