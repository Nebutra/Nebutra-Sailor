---
"@nebutra/auth": patch
---

`createAuth({ provider: "better-auth" })` now resolves after the plugin probe, so `capabilities` reflects what mounted: switching the active organization through the gateway no longer answers 501.
