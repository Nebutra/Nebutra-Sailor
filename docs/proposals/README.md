# Proposal Backlog

This folder tracks product-iteration proposals for Nebutra-Sailor.

## 2026-05-29 review

Scoring heuristic:

`priority = user value x infrastructure fit / estimated effort`

Correction after product review: the previous framing was too feature-sliced
and then over-corrected into workflow-template language. Nebutra should be evaluated as a
**Generative Company OS** first: a Startup Agent OS that compiles a founder's
startup thesis into coherent company context, assets, execution, launch,
revenue, support, and iteration. The core object is the company state, not a
persona narrative or a workflow marketplace. The 60-second brand film is the first
proof artifact, not the product category.

| Rank | Proposal | One-line value | Reuse | Effort | Status | File |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Startup Agent OS | A Generative Company OS: create brand, product, launch, revenue, support, and iteration from one coherent company context. | `@nebutra/agents`, `@nebutra/agent-runtime`, `@nebutra/brand-genesis`, media pipelines, canvas/reel/atelier, `create-sailor`, auth, billing, analytics, knowledge, queue, vault | L | proposed | [2026-05-29-startup-agent-os.md](./2026-05-29-startup-agent-os.md) |
| 1.1 | 60-Second Brand Film Proof | First proof artifact: one startup thesis becomes a brand system, launch film, landing page, MVP repo outline, and demand-signal map from the same CompanyContext. | `brand-genesis`, `generation-context`, `image/video/audio-pipeline`, `landing-builder`, `agent-runtime`, `knowledge-base`, `outreach-engine` | M | proof artifact | [2026-05-29-startup-agent-os.md](./2026-05-29-startup-agent-os.md) |
| 1.2 | Launch Access Funnel | Acquisition, waitlist, invite, onboarding, attribution, and first paid conversion. | `@nebutra/access-gate`, `@nebutra/waitlist`, `@nebutra/analytics`, `@nebutra/onboarding`, `@nebutra/billing`, landing/blog | S-M | subsystem | [2026-05-29-launch-access-funnel.md](./2026-05-29-launch-access-funnel.md) |
| 1.3 | Governed Agent Ops Workspace | Tenant-safe control plane for agent work with replay, approvals, and spend visibility. | `@nebutra/agent-runtime`, `@nebutra/agents`, `@nebutra/queue`, `@nebutra/vault`, `@nebutra/billing`, `@nebutra/feature-flags`, admin routes | M-L | subsystem | [2026-05-29-governed-agent-ops-workspace.md](./2026-05-29-governed-agent-ops-workspace.md) |
| 1.4 | Confidence-Gated Support Deflection | Evidence-based support automation for repetitive founder/customer questions. | `@nebutra/support-deflector`, `@nebutra/knowledge-base`, `@nebutra/queue`, `@nebutra/audit`, `@nebutra/analytics` | M | subsystem | [2026-05-29-confidence-gated-support-deflection.md](./2026-05-29-confidence-gated-support-deflection.md) |

## Rejected this round

| Idea | Why it was cut |
| --- | --- |
| Standalone workflow marketplace launch | Marketplace before a sticky first-party operating system is cargo-cult; the repo does not yet have enough run producers, buyers, or telemetry truth. |
| `idea-plaza`, `founder-cemetery`, `cofounder-match` as near-term bets | These are ecosystem/network-effect surfaces. They need an existing user graph and trust system, which Nebutra does not yet have. |
| Generic landing-page generator as its own product | The market is saturated by Lovable, Bolt, Framer, v0, and 21st.dev. Nebutra only gets leverage when landing generation is attached to access, attribution, and monetization. |
| Generic free-form AI canvas clone | Flowith-style canvas is central, but only when it drives concrete operating surfaces: design, build, deploy, launch, support, and iterate. A canvas without lifecycle state is not enough. |

## Evidence used

- Repo direction from `README.md`, `docs/package-status.md`, `docs/capabilities/*`, `docs/superpowers/specs/2026-05-12-hero-startup-agent-os-design.md`, recent commits through `2026-05-29`, and open issues `#113` to `#117`.
- Product intent from the public Chinese article `https://nebutra.com/zh/blog/why-we-build-nebutra-zh`: Founder Tax, coherence, 60-second brand film as proof artifact, Generative Company, Studio for one, and "where chaos becomes a company."
- Benchmark/product calibration from current public surfaces for Cursor, Resend, Railway, Supabase, Vercel, Warp, Bolt, Lovable, Clerk, Sanity, Dub, Inngest, 21st.dev, Figma, Prisma, Stripe, Notion, Replit, fal.ai, Flowith, and Obsidian.
