# infra/ops

Operational scripts and runbooks — backup, restore, on-call playbooks, incident response.

## Declared provider state

`platform-expected.example.json` declares the settings that live only in a
provider dashboard — Vercel build machine and ignore step, Git links, env vars
that must not be flagged Sensitive, Fly secret names that must exist or must
not, GitHub repository variables, the status checks a protected branch requires
before a merge, Cloudflare Worker bindings. Copy it to
`platform-expected.json`, replace the names, delete the sections you do not
use, and run the read-only engine from Nebutra-Sailor against it on a schedule:

```bash
node scripts/ops/platform-reconcile.mjs infra/ops/platform-expected.json --strict
```

Exit 1 is the alert. Only names are ever declared or printed, never values.
