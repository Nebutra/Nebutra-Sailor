# @nebutra/ecosystem-safety

Status: **WIP**

Shared public-disclosure safety primitives for Nebutra ecosystem packages.

This package owns deterministic sensitive-field scanning for surfaces that can
publish founder data outside the private tenant boundary. Product packages still
own their own state machines:

- `@nebutra/idea-plaza` decides whether an idea snapshot is surface, detail, or
  cloneable.
- `@nebutra/founder-cemetery` decides whether a memorial is private, community,
  or public and whether cooling-off/consent requirements are met.
- `@nebutra/cofounder-match` owns bilateral match consent and should not reuse
  memorial consent types.

## Boundary

`ecosystem-safety` only answers: "Does this text contain obvious private fields,
and has the caller declared an explicit redaction intent?"

It does not own moderation queues, legal policy, user consent, publish levels,
identity verification, or registry transport.

## Example

```ts
import { assertPublicDisclosureSafe } from "@nebutra/ecosystem-safety";

assertPublicDisclosureSafe({
  capability: "idea-plaza",
  content: "Contact alice@example.com",
  redactions: ["customers"],
});
```
