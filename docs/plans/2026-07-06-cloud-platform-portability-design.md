# Cloud Platform Portability - Design

**Date:** 2026-07-06
**Status:** Implemented
**Goal:** Keep Nebutra-Sailor ready for AWS or Google Cloud migration without changing today's production topology.

---

## Decision

Nebutra keeps the current default topology:

- Frontends default to Vercel.
- Gateway defaults to Cloudflare Workers.
- Heavy origin runtime defaults to ECS Docker / cloud VM origin.
- Container publishing remains manual or release-triggered, not every main push.

AWS and Google Cloud are governed as dormant platform adapters. They stay ready
through typed deploy target lists, optional CI registry publishing, Terraform
modules, and architecture tests, but they do not run unless explicitly selected.

---

## Portability Contract

The source of truth is `infra/platforms/cloud-portability.json`.

It records:

- provider IDs: `aws`, `gcp`, `cloud-vm`, `k8s`, `vercel`
- registry contracts: AWS ECR and GCP Artifact Registry
- CI auth model: AWS OIDC and GCP Workload Identity Federation
- default topology and one-active-deploy-target governance
- workflows covered by the portability doctor

The local guardrails are:

```bash
pnpm cloud:verify
pnpm cloud:doctor
pnpm test:arch -- tests/architecture/cloud-portability.test.ts
```

---

## CI/CD Changes

`.github/workflows/docker-build-push.yml` now supports these registry targets:

- GHCR: always available through `GITHUB_TOKEN`
- AWS ECR: enabled only when AWS account, region, and OIDC role are configured
- GCP Artifact Registry: enabled only when project, region, repository, WIF provider, and service account are configured
- Aliyun ACR and Tencent TCR: preserved as existing optional targets

GCP uses `google-github-actions/auth` with `token_format: access_token` and
Docker's `oauth2accesstoken` username. No JSON key file is required in GitHub
Actions.

---

## Terraform Changes

`infra/iac/terraform/environments/prod/main.tf` now accepts:

```text
vercel | aws | gcp | aliyun | tencent
```

The new GCP module is intentionally narrow. It provisions Artifact Registry
first, because portable image publishing is the earliest shared requirement for
Cloud Run, GKE, and Compute Engine. Compute resources can be added later behind
the same module boundary.

---

## Migration Posture

This is not a cloud migration. It is a migration-ready contract:

- no production default changed
- no new always-on workflow trigger was added
- no provider secret is mandatory unless that provider path is selected
- AWS and GCP are tested as first-class future targets

Rollback is simple: remove provider variables or set deploy targets back to the
current defaults. Application code does not need to fork per cloud.
