# Proposal: Startup Agent OS

## Status

Proposed on 2026-05-29 after correcting the feature-level review. Updated after
product review to remove workflow-template framing. This is the top-level
product direction. No production exposure. Any prototype must stay behind a
default-off feature flag and be labeled as an unreviewed automated prototype.

## Core company proposition

A serious founder does not only need code generation, a template, or a landing
page. They need an operating layer that helps them move through the whole
startup loop:

`thesis -> product scaffold -> governed build -> launch -> demand -> revenue -> support -> iteration`

The product proposition is to make that loop executable, visual, auditable, and
commercially useful for one-person or small-team AI-native startups.

After reading the public product essay `why-we-build-nebutra-zh`, the sharper
category is:

**Generative Company OS / Startup Agent OS.**

That means Nebutra should not start as a generic dashboard, marketplace, or
page generator. It should start as a thesis compiler that creates one coherent
company state across brand, media, web, product, launch, revenue, support, and
customer discovery. The core object is the company context, not a persona narrative.

## Product thesis

Nebutra should become the integrated Startup Agent OS: **Vercel + Lovart +
Lovable + Bolt.new + Flowith + Product Hunt**, but re-expressed around one
startup lifecycle instead of six disconnected tools.

- `create-sailor` is the bootloader.
- `apps/web` is the founder cockpit.
- `@nebutra/agents` and `@nebutra/agent-runtime` are the agent work engine.
- `@nebutra/atelier-canvas`, `@nebutra/reel`, and graph/collab primitives are
  the Flowith-style visual workspace.
- brand, generation, media, and design packages become the Lovart-style
  creative layer.
- app scaffolding, backend wiring, auth, billing, tenants, storage, and deploy
  become the Lovable/Bolt/Vercel production layer.
- access-gate, waitlist, analytics, blog, docs, and launch surfaces become the
  Product Hunt-style launch and discovery layer.
- vault, queue, audit, feature flags, knowledge, and support packages are the
  governance layer that makes it safe to run with agents.

The product should not be framed as "a SaaS starter with many features." It
should be framed as a founder operating system where agents can help run the
company, but only through governed product primitives.

## Core promise

Nebutra does not deliver "AI-generated assets." It delivers **coherence**.

There are two kinds of coherence:

- Cross-modal coherence: brand, logo, landing page, video, deck, social copy,
  music, screenshots, and product narrative all come from the same startup
  context.
- Cross-time coherence: product architecture, data model, billing, tenant
  isolation, tests, launch decisions, customer feedback, and future iterations
  can still make sense after the first demo.

This is the answer to Founder Tax: founders should not spend their life moving
the same context across ten tools, and they should not pay later for
vibe-coded technical debt that a staff-level engineer would have avoided.

Internal boundary:

> We are not building an AI that recognizes hot dogs. We are helping you build
> a hot-dog-recognition AI unicorn company.

The category boundary is narrow: `Startup -> Unicorn`.

## First proof artifact: 60-Second Brand Film

The first proof artifact should be the 60-second brand film described in the
public article:

Input:

- one sentence describing the startup thesis

Output in roughly 60 seconds:

- brand direction
- logo concept
- color palette and typography
- 60-second multimodal brand film
- matching sound/music direction
- landing page draft
- MVP repository scaffold
- demand-signal map from public communities

Why this first:

- It is screenshot-friendly and shareable.
- It compresses agency-grade output into a founder-grade operating loop.
- It demonstrates the cross-modal coherence that single-purpose tools cannot
  produce.
- It creates a real emotional "we need this" moment before the heavier OS
  surfaces are mature.

This artifact bundle is not the whole product. It is the cold-start proof that
the OS has a shared company context.

## What each benchmark contributes

| Benchmark | What to absorb | Nebutra translation |
| --- | --- | --- |
| Vercel | Production-grade cloud, previews, domains, AI infra, deployment confidence | One-click deploy/readiness and environment governance for generated startup apps |
| Lovart | Brand-aware design agent, multimodal campaign generation, infinite creative canvas | Brand Genesis, design context, visual assets, pitch/launch creative, design memory |
| Lovable | Founder-friendly full-stack app generation with backend/auth/deploy included | Natural-language product builder over Sailor packages and templates |
| Bolt.new | Fast app generation, design-system import, integrated cloud, enterprise production path | Repo/design-system aware builder that emits real Nebutra code and deploy manifests |
| Flowith | Agent canvas, branching plans, knowledge context, multi-agent workflows | Visual startup command center where agents plan, execute, fork, and resume work |
| Product Hunt | Launch community, daily discovery, maker feedback, launch readiness standards | Launch engine, public product pages, feedback loops, maker graph, launch analytics |

The synthesis is not "copy all UI." It is a single OS where a founder can submit
a thesis, generate the product, create brand assets, deploy, launch publicly,
collect feedback, and assign follow-up work to agents without leaving the
startup state model.

## Why this is not trend-chasing

The market has many partial answers:

- Cursor and Warp improve the builder's workbench.
- Lovable and Bolt turn prompts into app demos.
- Vercel, Railway, Supabase, Prisma, and Clerk make production assembly easier.
- Stripe, Dub, Resend, Sanity, Inngest, Notion, and Figma each own a critical
  operating surface.

Startup Agent OS is not a clone of any one of them. The differentiated product
primitive is a governed company context that binds these startup functions for
founders who need to ship, charge, support, and iterate with AI agents in the
system of record.

## Core user

Primary user:

- solo founder or two-person team building an AI-native SaaS
- comfortable with AI coding tools
- wants global launch readiness, not only a local demo
- needs auth, billing, content, support, and operations to work together

Secondary user:

- agency or implementation partner repeatedly launching AI SaaS products for
  clients
- internal venture studio operating multiple product experiments

## Product shape

The OS should have seven first-class surfaces, and the first Dashboard
experience should be the Startup OS Command Center. It should compile a startup
thesis into CompanyContext, asset graph, operating runs, launch surface, and
signals. The 60-second brand film is one proof artifact inside that system.

### 1. Company Context Compiler

The company-state layer:

- 60-second brand film
- thesis to MVP
- MVP to customer discovery
- customer discovery to pitch deck
- investor pipeline
- growth experiment orchestration
- cap table and board material generation
- hiring pipeline

Each operating run has clear inputs, outputs, artifacts, cost, model/tool
choices, approval points, and replay history. Runs are not the product; they
are ways the OS mutates company state.

### 2. Founder Cockpit

The home screen for the startup:

- launch readiness
- product status
- active agent runs
- acquisition and billing signals
- support and knowledge health
- next recommended operating actions

This should feel like an operating console, not a marketing dashboard.

### 3. Flow Canvas

The visual operating space:

- thesis graph
- product architecture graph
- design/brand graph
- agent execution plans
- launch checklist
- support and feedback loops
- forks and branches for alternative product directions

This is where Flowith's core lesson matters: founders do not think in a single
linear chat. They need a canvas where context, artifacts, tasks, and agents can
sit next to each other.

### 4. Agent Workbench

The place where governed agents run useful work:

- build tasks
- launch tasks
- content tasks
- support analysis
- growth experiments
- internal operations

Every run needs trace, policy, approval state, cost, and artifacts.

### 5. Product Builder

The Lovable/Bolt-style builder, but backed by Sailor:

- natural-language product briefs
- repo/template-aware code generation
- auth, billing, tenant, storage, email, AI, and i18n wiring
- design-system import and component reuse
- deploy preview manifest
- production-readiness checks

This should create real Nebutra apps, not disposable demos.

### 6. Creative Studio

The Lovart-style design layer:

- brand context
- logo and visual direction
- landing visuals
- product screenshots and mockups
- launch images and social assets
- deck and demo narrative assets

This should be tied to the product builder and launch engine so generated
creative assets stay consistent with the actual app.

### 7. Launch Engine

The commercial loop:

- waitlist
- invite gate
- onboarding
- referral and attribution
- billing conversion
- launch-window analytics
- Product Hunt-style launch page
- maker comments, feedback, and iteration tasks

This is the first subsystem that should ship because it turns the OS into a
business surface, not only an engineering surface.

### 8. Company Knowledge and Support

The memory layer:

- docs and blog ingestion
- product facts
- support answers with citations
- founder decisions and launch history
- customer feedback loops

This lets agents operate against company truth instead of loose prompts.

## Reuse vs new build

Reuse:

- `create-sailor` for project bootstrapping
- `@nebutra/agents` for model execution
- `@nebutra/agent-runtime` for thread, turn, policy, tool, and rollout grammar
- `@nebutra/atelier-canvas`, `@nebutra/reel`, `@nebutra/graph-model`, and
  collab primitives for visual planning and artifact graphs
- `@nebutra/brand-genesis`, `@nebutra/generation-context`,
  `@nebutra/image-pipeline`, `@nebutra/video-pipeline`, and
  `@nebutra/landing-builder` for the creative/product generation layer
- `@nebutra/audio-pipeline`, `@nebutra/cinema`, and `@nebutra/reel/storyboard`
  for brand film planning and multimodal composition
- `@nebutra/outreach-engine` for demand-signal maps and campaign drafts
- `@nebutra/billing`, `@nebutra/access-gate`, `@nebutra/waitlist`,
  `@nebutra/analytics`, `@nebutra/onboarding`
- `@nebutra/knowledge-base`, `@nebutra/support-deflector`,
  `@nebutra/document-pipeline`
- `@nebutra/queue`, `@nebutra/vault`, `@nebutra/audit`,
  `@nebutra/feature-flags`
- landing, blog, docs, and admin patterns

New build:

- first-class CompanyContext contract for startup lifecycle state
- first-class operating run contract for governed state mutations
- 60-second brand film orchestration and artifact bundle
- founder cockpit information architecture
- OS-level data model for startup lifecycle state
- lifecycle graph connecting thesis, product, design, deploy, launch, feedback,
  and agent runs
- agent run templates tied to startup operating surfaces
- policy and approval UI for agent actions
- lifecycle-aware launch, revenue, support, and iteration views
- packaging story that makes `create-sailor` the bootloader, not the whole
  product

## Subsystems

These existing proposals become subsystems:

- 60-Second Brand Film Proof
- [Launch Access Funnel](./2026-05-29-launch-access-funnel.md)
- [Governed Agent Ops Workspace](./2026-05-29-governed-agent-ops-workspace.md)
- [Confidence-Gated Support Deflection](./2026-05-29-confidence-gated-support-deflection.md)

## Phasing

### Phase 0: Narrative and company state contract

Clarify the product map:

- Startup Agent OS as the top-level category.
- Generative Company OS as the operating model.
- `create-sailor` as bootloader
- CompanyContext as the system of record
- 60-second brand film as the first proof artifact
- founder cockpit as the main app
- flow canvas as the central workspace
- builder, creative, deploy, launch, agent, knowledge, support, billing as OS
  services

### Phase 1: Dashboard Command Center and brand-film proof

Ship the first coherent company-state surface:

- startup thesis intake
- CompanyContext compiler
- connected asset graph
- operating run ledger shape
- brand context creation
- logo/color/type direction
- storyboard and script
- image/video/audio generation handoff
- landing page draft
- MVP repo scaffold handoff
- demand-signal discovery
- shareable result page

### Phase 2: Lifecycle Spine

Build the smallest unified spine that makes the product feel like one OS:

- startup lifecycle graph
- founder cockpit
- project/readiness state
- artifact registry
- agent run records
- launch state

### Phase 3: Launch Engine

Ship the first useful commercial loop:

- waitlist
- invite access
- onboarding progress
- attribution
- first billing conversion
- founder dashboard
- Product Hunt-style public launch page

### Phase 4: Builder and Creative Studio

Connect creation to launch:

- product brief to Sailor app scaffold
- design context and brand assets
- landing page and launch creative
- deploy preview/readiness manifest

### Phase 5: Governed Agent Workbench

Make agents operational:

- named startup operating templates
- durable run history
- approvals
- cost visibility
- artifacts

### Phase 6: Knowledge and Support

Close the iteration loop:

- company knowledge ingestion
- support deflection
- customer feedback memory
- recommendations for next product and launch actions

### Phase 7: Ecosystem

Only after the OS has real usage:

- operating-run marketplace
- founder network
- cofounder matching
- public thesis and postmortem surfaces

## Success metrics

- thesis-to-shareable-brand-film completion rate
- time from one-sentence thesis to coherent artifact bundle
- share rate of generated brand-film result pages
- time from scaffold to public launch
- percent of startup setup completed through cockpit flows
- number of product/design/deploy/launch artifacts connected in the lifecycle
  graph
- waitlist-to-paid conversion
- number of governed agent runs per active startup
- percent of agent runs with complete trace, cost, approval, and artifact record
- support deflection rate with citations
- founder weekly retained usage

## Risks

- The OS promise can outrun the actual product if the cockpit is only a shell.
- Too many subsystems can blur the first product primitive. The first primitive
  should be CompanyContext because it lets the 60-second brand film, landing,
  MVP scaffold, launch, and support surfaces prove coherence from the same
  source.
- Agent features must stay governed. Free-form automation without approvals,
  replay, and cost visibility would weaken the positioning.
- Ecosystem features are tempting, but they should wait until the OS has real
  founder usage.
- Design generation and app generation must share BrandContext and app truth.
  If they drift, the product becomes a pile of demos rather than an OS.

## Benchmark essence

Copy the substance, not the surface:

- Cursor: agents need context, traces, and real work loops.
- Lovart: creative agents need brand memory, campaign structure, and editable
  visual artifacts.
- Lovable/Bolt/Replit: founders value speed from thesis to working product.
- Flowith: agent work needs a visual canvas, branches, knowledge context, and
  resumable execution.
- Vercel/Railway/Supabase/Prisma/Clerk: infrastructure disappears when the
  platform has strong defaults.
- Stripe/Dub/Resend: revenue, attribution, and communication must be native.
- Sanity/Notion/Obsidian: company memory should stay inspectable and reusable.
- Inngest: durable workflows and replay are part of product quality.
- Product Hunt: launch quality depends on useful, live, high-craft products and
  maker feedback, not just a submission checklist.

## Decision

Make Startup Agent OS the product frame: a founder OS that combines Vercel-like
deployment confidence, Lovart-like creative generation, Lovable/Bolt-like app
building, Flowith-like agent canvas, and Product Hunt-like launch/community
loops.

The first build should be thesis-centered: ship the Dashboard Startup OS Command
Center with CompanyContext, connected asset graph, governed operating runs, and
the 60-second brand film as the first proof artifact. Then grow into lifecycle
spine, launch, builder, creative, agent, knowledge, and support surfaces. Do not
lead with a generic marketplace, social graph, empty dashboard, or standalone
page generator.
