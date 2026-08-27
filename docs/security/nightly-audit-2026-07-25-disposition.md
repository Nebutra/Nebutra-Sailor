# Nightly Security Audit 2026-07-25 — disposition

**Issue:** #258  
**Last updated:** 2026-07-27

## Summary from scan

| Severity | Count |
| --- | ---: |
| Critical | 0 |
| High | 0 |
| Moderate | 2 |

## Disposition

Moderate findings are tracked under dependency hygiene (#200) and supply-chain
governance (`docs/security/supply-chain-governance.md`). No critical/high
blockers for production.

Operators: re-run `pnpm audit --audit-level moderate` after the next dependency
wave; close remaining moderate items with version pins or upgrades in #200.
