---
"@nebutra/auth": patch
---

A relying party (a product app pointing `BETTER_AUTH_URL` at another host) resolves sessions at the auth center without `BETTER_AUTH_SECRET`. The secret is now checked only where a local Better Auth instance is built.
