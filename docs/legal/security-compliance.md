# Security & Compliance

This page states what security controls are **in place today**, what is
**planned**, and what we **do not have**. It is written to be handed to a
security reviewer without edits.

We do not claim certifications we do not hold. Where the honest answer is "not
yet", it says so.

## Certification status

| Framework | Status | Notes |
| --- | --- | --- |
| SOC 2 Type II | ❌ **Not certified** | No audit engaged. Controls below map to common SOC 2 criteria but are unaudited. |
| ISO 27001 | ❌ **Not certified** | — |
| 等保 2.0 (MLPS) | ❌ **Not filed** | Applicable to China-deployed instances; the operator of the deployment is the filing party, not us. |
| GDPR | ⚠️ **Self-assessed** | DPA available. Sailor is self-hosted by default, so you are typically the controller and sole processor. |
| PIPL | ⚠️ **Self-assessed** | China-compliance helpers ship in `packages/ops/china-compliance`. |
| HIPAA / PCI-DSS | ❌ **Out of scope** | Sailor is not delivered as a hosted service; compliance attaches to your deployment. |

**Read the deployment model before reading anything else.** Sailor is
software you run. In the standard self-hosted model we do not process, store,
or have access to your data, which changes what certification is even
meaningful. The controls that matter to you are the ones in *your* deployment;
the controls below are the ones governing how the software is *built and
delivered* to you — the supply chain.

## Supply-chain controls (in place)

These are verifiable from the public repository.

| Control | Implementation | Evidence |
| --- | --- | --- |
| Static analysis | CodeQL on every push and PR | `.github/workflows/` |
| Dependency audit | `pnpm audit` in CI, Dependabot updates | CI config |
| Secret scanning | GitHub Advanced Security, push protection | Repo settings |
| Container scanning | Trivy on all images | CI config |
| Build provenance | SLSA Build Level 2 attestations on releases | Release artefacts |
| Dependency licence policy | Machine-enforced allow/deny list | [`license-policy.json`](../../license-policy.json) |
| Supply-chain age gate | `minimumReleaseAge: 1440` — packages under 24h old are refused | `pnpm-workspace.yaml` |
| Install-script policy | `strictDepBuilds`, trust policy, pnpmfile ignored | `pnpm-workspace.yaml` |
| OpenSSF Scorecard | Public, continuously scored | [Scorecard report](https://securityscorecards.dev/viewer/?uri=github.com/Nebutra/Nebutra-Sailor) |

The `minimumReleaseAge` gate is worth calling out: it structurally blocks the
most common npm compromise pattern, in which a hijacked package is published
and consumed within hours.

## Application security controls (shipped in the platform)

Controls the software provides for *your* deployment to use:

| Area | Implementation |
| --- | --- |
| Tenant isolation | PostgreSQL Row-Level Security, transaction-local `app.current_tenant_id`, non-`BYPASSRLS` application role |
| Authentication | Pluggable — Clerk, Better Auth, or NextAuth |
| Authorisation | RBAC/ABAC via CASL in-process, or OpenFGA (Zanzibar-style) |
| Secrets | Application-layer envelope encryption with AWS KMS or local HKDF (`@nebutra/vault`) |
| Audit logging | Append-only audit trail designed against SOC 2 criteria (`@nebutra/audit`) |
| Rate limiting | Per-tenant, at the gateway |
| SSRF protection | Upstream base-URL allowlisting on tenant-supplied provider endpoints |
| Transport | HTTPS enforced; HSTS configured at the edge |

**Enabling and configuring these correctly is the deploying party's
responsibility.** Shipping a capability is not the same as it being switched
on in your environment.

## Vulnerability handling

Reporting process, severity classification, and response targets are in
[SECURITY.md](../../SECURITY.md).

Community-tier response targets are **best-effort commitments, not
contractual obligations**. Enterprise agreements convert them into bound SLAs
with defined remedies.

## Subprocessors

In the self-hosted model, Sailor has **no subprocessors** — we receive no
customer data. You select every provider (database, auth, mail, LLM, object
storage) and contract with them directly.

For any hosted capability we operate, a current subprocessor list is provided
with the Enterprise compliance pack and updated on change.

## Data residency

Determined entirely by your deployment. Sailor supports Vercel, Cloudflare
Workers, ECS, Kubernetes, and self-managed targets, and supports China-region
deployment with domestic providers via `packages/ops/china-compliance`.

## What is in the Enterprise compliance pack

Provided under NDA with an Enterprise agreement:

- Completed security questionnaire (CAIQ or your own)
- Architecture and data-flow diagrams
- Penetration-test summary (once the first engagement completes — see roadmap)
- Subprocessor list and change-notification terms
- Signed [DPA](./dpa-template.md)
- [Indemnification](./indemnification.md) terms
- [Business continuity](./business-continuity.md) undertaking
- Named security contact and escalation path

## Roadmap

Stated as intentions with no committed dates, because committed dates we might
miss are worse than none:

1. Third-party penetration test of the reference deployment
2. Formal SOC 2 Type I readiness assessment
3. SOC 2 Type II observation window
4. Published subprocessor and change-notification policy for hosted surfaces

Enterprise customers can influence this ordering, and an Enterprise
requirement is the normal trigger for accelerating it.

## Reporting a vulnerability

**security@nebutra.com** — please do not open a public issue. Full policy in
[SECURITY.md](../../SECURITY.md).

---

*Last updated: 2026-07-26*
