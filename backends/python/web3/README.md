# Web3 Service — STUB

> **Tier**: stub (concept preserved, no implementation)
> **ADR**: [docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md](../../../docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md)

This service has been **stubbed**. Source code, dependencies, Dockerfile, and
infrastructure manifests have been removed. This README preserves the concept.

## Concept

A standalone Python service for **long-running blockchain indexing** —
listening to smart-contract events across multiple chains, materializing event
logs into queryable tables, batch NFT metadata fetching with retry/backoff,
and historical block backfills.

Interactive on-chain reads (single wallet balance, single contract call,
ownership lookup on a hot UX path) are **not** in scope for this service.
Those go through TS edge functions using `viem` or `ethers.js` — the Node
ecosystem for blockchain reads is more mature than Python's, and edge runtime
gives sub-100ms latency.

## Why this exists as a stub

Web3 indexing is one of the few domains where Python *might* still be the
right answer (long-running listeners, batch RPC, scientific analysis of
on-chain data). But until there's a product that demands this, "might" is
not enough. Stubbed, not deleted, so the concept survives.

## Activation criteria (per ADR)

To promote `stub` → `active`, a single PR must include **all** of:

1. A real consumer (workflow under `workflows/` or gateway route) that calls
   this service over HTTP for indexing or backfill jobs.
2. README justification paragraph citing ADR D2.1 (batch / queued > 5s) — the
   most likely fit.
3. Restored Python package + Dockerfile + k8s manifests + kustomization +
   configmap + dependabot entries.

If activation is for *interactive* on-chain reads, redirect to TS using
`viem` in a gateway route. Do not revive Python for that — Python web3 SDKs
lag the JS/TS ecosystem.

## What was previously here

FastAPI routes under `app/api/v1/routes_web3.py` plus empty `indexer/` and
`listener/` placeholders. Zero external callers at stub time. Recoverable
from git history.
