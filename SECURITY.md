# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1 month old | :white_check_mark: |
| older   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Email **security@nebutra.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof of concept if available)
- Affected versions and components
- Suggested fix or mitigation (if any)

We will acknowledge your report within **48 hours** and aim to:

- Confirm the vulnerability within **5 business days**
- Release a patch within **14 days** for Critical/High severity
- Release a patch within **30 days** for Medium severity
- Credit you in the release notes (unless you prefer to remain anonymous)

## Severity Classification

We follow [CVSS v3.1](https://www.first.org/cvss/) for severity scoring:

| Severity | CVSS Score | Response SLA |
| -------- | ---------- | ------------ |
| Critical | 9.0–10.0   | 14 days      |
| High     | 7.0–8.9    | 14 days      |
| Medium   | 4.0–6.9    | 30 days      |
| Low      | 0.1–3.9    | Next release |

## Security Measures

This project implements the following security controls:

- **Dependency auditing**: Automated `pnpm audit` in CI, Dependabot for dependency updates
- **Secret scanning**: GitHub Advanced Security secret scanning enabled
- **SAST**: CodeQL static analysis on every push and PR
- **Container scanning**: Trivy vulnerability scanning on all Docker images
- **Supply chain**: SLSA Build Level 2 provenance attestations for releases
- **Rate limiting**: Application-level rate limiting on all public API endpoints
- **Authentication**: Clerk-managed authentication with MFA support
- **Secure headers**: `X-Frame-Options`, `HSTS`, `X-Content-Type-Options` on all responses

## Scope

The following are **in scope** for vulnerability reports:

- `apps/web` — authenticated dashboard
- `apps/landing-page` — public marketing site
- `backends/gateway` — Hono API gateway
- `backends/python/*` — Python microservices (active tier only — see ADR 2026-05-10)
- `packages/*` — shared libraries

The following are **out of scope**:

- Third-party services (Clerk, Resend, Stripe, etc.) — report to their respective security teams
- Issues requiring physical access to infrastructure
- Social engineering attacks

## PGP Key

For encrypted communication, use our PGP key:

```
Fingerprint: (contact security@nebutra.com to request)
```

## Bug Bounty

We do not currently operate a paid bug bounty program, but we deeply appreciate
responsible disclosure and will credit security researchers in our release notes.

---

*This policy is based on the [GitHub Security Policy template](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository).*
