# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran `trellis init` on this project for the first time.
`.trellis/` now exists with empty spec scaffolding, and this bootstrap task
exists under `.trellis/tasks/`. When they want to work on it, they should start
this task from a session that provides Trellis session identity.

**Your job**: help them populate `.trellis/spec/` with the team's real
coding conventions. Every future AI session — this project's
`trellis-implement` and `trellis-check` sub-agents — auto-loads spec files
listed in per-task jsonl manifests. Empty spec = sub-agents write generic
code. Real spec = sub-agents match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (CLAUDE.md, .cursorrules, etc.), and drive
the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

- [ ] Fill guidelines for @nebutra/admin
- [ ] Fill guidelines for @nebutra/auth-center
- [ ] Fill guidelines for @nebutra/design
- [ ] Fill guidelines for @nebutra/forge
- [ ] Fill guidelines for @nebutra/idp
- [ ] Fill guidelines for @nebutra/kuanlan
- [ ] Fill guidelines for @nebutra/landing
- [ ] Fill guidelines for @nebutra/mail-preview
- [ ] Fill guidelines for @nebutra/pebble-site
- [ ] Fill guidelines for @nebutra/router
- [ ] Fill guidelines for @nebutra/sailor-docs
- [ ] Fill guidelines for @nebutra/sleptons
- [ ] Fill guidelines for @nebutra/storybook
- [ ] Fill guidelines for @nebutra/studio
- [ ] Fill guidelines for @nebutra/typelens
- [ ] Fill guidelines for @nebutra/web
- [ ] Fill guidelines for @nebutra/3d-pipeline
- [ ] Fill guidelines for @nebutra/agent-runtime
- [ ] Fill guidelines for @nebutra/agents
- [ ] Fill guidelines for @nebutra/ai-primitives
- [ ] Fill guidelines for @nebutra/ai-providers
- [ ] Fill guidelines for @nebutra/atelier-canvas
- [ ] Fill guidelines for @nebutra/audio-pipeline
- [ ] Fill guidelines for @nebutra/brand-genesis
- [ ] Fill guidelines for @nebutra/browser-control
- [ ] Fill guidelines for @nebutra/cinema
- [ ] Fill guidelines for @nebutra/code-execution
- [ ] Fill guidelines for @nebutra/code-index
- [ ] Fill guidelines for @nebutra/cofounder-match
- [ ] Fill guidelines for @nebutra/content-store
- [ ] Fill guidelines for @nebutra/document-pipeline
- [ ] Fill guidelines for @nebutra/ecosystem-safety
- [ ] Fill guidelines for @nebutra/event-log
- [ ] Fill guidelines for @nebutra/execution-policy
- [ ] Fill guidelines for @nebutra/forge-dns-leak
- [ ] Fill guidelines for @nebutra/forge-runtime
- [ ] Fill guidelines for @nebutra/founder-cemetery
- [ ] Fill guidelines for @nebutra/generation-context
- [ ] Fill guidelines for @nebutra/idea-plaza
- [ ] Fill guidelines for @nebutra/image-pipeline
- [ ] Fill guidelines for @nebutra/knowledge-base
- [ ] Fill guidelines for @nebutra/knowledge-graph
- [ ] Fill guidelines for @nebutra/knowledge-rag
- [ ] Fill guidelines for @nebutra/landing-builder
- [ ] Fill guidelines for @nebutra/local-embedding
- [ ] Fill guidelines for @nebutra/mcp
- [ ] Fill guidelines for @nebutra/outreach-engine
- [ ] Fill guidelines for @nebutra/play-loader
- [ ] Fill guidelines for @nebutra/play-marketplace
- [ ] Fill guidelines for @nebutra/reel
- [ ] Fill guidelines for @nebutra/sandbox-runtime
- [ ] Fill guidelines for @nebutra/startup-os
- [ ] Fill guidelines for @nebutra/support-deflector
- [ ] Fill guidelines for @nebutra/time-machine
- [ ] Fill guidelines for @nebutra/tool-registry
- [ ] Fill guidelines for @nebutra/video-pipeline
- [ ] Fill guidelines for @nebutra/voice-realtime
- [ ] Fill guidelines for @nebutra/workflow-runtime
- [ ] Fill guidelines for @nebutra/access-gate
- [ ] Fill guidelines for @nebutra/billing
- [ ] Fill guidelines for @nebutra/blog
- [ ] Fill guidelines for @nebutra/contracts
- [ ] Fill guidelines for @nebutra/legal
- [ ] Fill guidelines for @nebutra/license
- [ ] Fill guidelines for @nebutra/marketing
- [ ] Fill guidelines for @nebutra/metering
- [ ] Fill guidelines for @nebutra/waitlist
- [ ] Fill guidelines for @nebutra/brand
- [ ] Fill guidelines for @nebutra/design-sync
- [ ] Fill guidelines for @nebutra/design-tokens
- [ ] Fill guidelines for @nebutra/docs-shared
- [ ] Fill guidelines for @nebutra/fonts
- [ ] Fill guidelines for @nebutra/icons
- [ ] Fill guidelines for @nebutra/theme
- [ ] Fill guidelines for @nebutra/tokens
- [ ] Fill guidelines for @nebutra/typelens-catalog
- [ ] Fill guidelines for @nebutra/ui
- [ ] Fill guidelines for @nebutra/audit
- [ ] Fill guidelines for @nebutra/auth
- [ ] Fill guidelines for @nebutra/captcha
- [ ] Fill guidelines for @nebutra/identity
- [ ] Fill guidelines for @nebutra/oauth
- [ ] Fill guidelines for @nebutra/permissions
- [ ] Fill guidelines for @nebutra/tenant
- [ ] Fill guidelines for @nebutra/vault
- [ ] Fill guidelines for @nebutra/admin-tooling
- [ ] Fill guidelines for @nebutra/cache
- [ ] Fill guidelines for @nebutra/collab
- [ ] Fill guidelines for @nebutra/email
- [ ] Fill guidelines for @nebutra/event-bus
- [ ] Fill guidelines for @nebutra/integration-vault
- [ ] Fill guidelines for @nebutra/notifications
- [ ] Fill guidelines for @nebutra/onboarding
- [ ] Fill guidelines for @nebutra/queue
- [ ] Fill guidelines for @nebutra/saga
- [ ] Fill guidelines for @nebutra/search
- [ ] Fill guidelines for @nebutra/sms
- [ ] Fill guidelines for @nebutra/storage
- [ ] Fill guidelines for @nebutra/tts
- [ ] Fill guidelines for @nebutra/uploads
- [ ] Fill guidelines for @nebutra/video-compose
- [ ] Fill guidelines for @nebutra/webhooks
- [ ] Fill guidelines for @nebutra/china-compliance
- [ ] Fill guidelines for nebutra
- [ ] Fill guidelines for create-sailor
- [ ] Fill guidelines for @nebutra/preset
- [ ] Fill guidelines for @nebutra/sanity
- [ ] Fill guidelines for @nebutra/supabase
- [ ] Fill guidelines for @nebutra/alerting
- [ ] Fill guidelines for @nebutra/analytics
- [ ] Fill guidelines for @nebutra/browser-utils
- [ ] Fill guidelines for @nebutra/capability-kit
- [ ] Fill guidelines for @nebutra/config
- [ ] Fill guidelines for @nebutra/db
- [ ] Fill guidelines for @nebutra/errors
- [ ] Fill guidelines for @nebutra/feature-flags
- [ ] Fill guidelines for @nebutra/gateway-core
- [ ] Fill guidelines for @nebutra/graph-model
- [ ] Fill guidelines for @nebutra/health
- [ ] Fill guidelines for @nebutra/i18n
- [ ] Fill guidelines for @nebutra/logger
- [ ] Fill guidelines for @nebutra/prepaid-wallet
- [ ] Fill guidelines for @nebutra/provider-factory
- [ ] Fill guidelines for @nebutra/rate-limit
- [ ] Fill guidelines for @nebutra/repositories
- [ ] Fill guidelines for @nebutra/router-supply
- [ ] Fill guidelines for @nebutra/status
- [ ] Fill guidelines for @nebutra/tenant-store
- [ ] Fill guidelines for @nebutra/trace-store
- [ ] Fill guidelines for _shared
- [ ] Fill guidelines for nebutra-ai-service
- [ ] Fill guidelines for @nebutra/gateway
- [ ] Add code examples

---

## Spec files to populate

### Package: @nebutra/admin (`spec/admin/`)

- Frontend guidelines: `.trellis/spec/admin/frontend/`

### Package: @nebutra/auth-center (`spec/auth-center/`)

- Frontend guidelines: `.trellis/spec/auth-center/frontend/`

### Package: @nebutra/design (`spec/design/`)

- Frontend guidelines: `.trellis/spec/design/frontend/`

### Package: @nebutra/forge (`spec/forge/`)

- Frontend guidelines: `.trellis/spec/forge/frontend/`

### Package: @nebutra/idp (`spec/idp/`)

- Frontend guidelines: `.trellis/spec/idp/frontend/`

### Package: @nebutra/kuanlan (`spec/kuanlan/`)

- Frontend guidelines: `.trellis/spec/kuanlan/frontend/`

### Package: @nebutra/landing (`spec/landing/`)

- Frontend guidelines: `.trellis/spec/landing/frontend/`

### Package: @nebutra/mail-preview (`spec/mail-preview/`)

- Frontend guidelines: `.trellis/spec/mail-preview/frontend/`

### Package: @nebutra/pebble-site (`spec/pebble-site/`)

- Frontend guidelines: `.trellis/spec/pebble-site/frontend/`

### Package: @nebutra/router (`spec/router/`)

- Frontend guidelines: `.trellis/spec/router/frontend/`

### Package: @nebutra/sailor-docs (`spec/sailor-docs/`)

- Frontend guidelines: `.trellis/spec/sailor-docs/frontend/`

### Package: @nebutra/sleptons (`spec/sleptons/`)

- Frontend guidelines: `.trellis/spec/sleptons/frontend/`

### Package: @nebutra/storybook (`spec/storybook/`)

- Frontend guidelines: `.trellis/spec/storybook/frontend/`

### Package: @nebutra/studio (`spec/studio/`)

- Frontend guidelines: `.trellis/spec/studio/frontend/`

### Package: @nebutra/typelens (`spec/typelens/`)

- Frontend guidelines: `.trellis/spec/typelens/frontend/`

### Package: @nebutra/web (`spec/web/`)

- Frontend guidelines: `.trellis/spec/web/frontend/`

### Package: @nebutra/3d-pipeline (`spec/3d-pipeline/`)

- Backend guidelines: `.trellis/spec/3d-pipeline/backend/`

- Frontend guidelines: `.trellis/spec/3d-pipeline/frontend/`

### Package: @nebutra/agent-runtime (`spec/agent-runtime/`)

- Backend guidelines: `.trellis/spec/agent-runtime/backend/`

- Frontend guidelines: `.trellis/spec/agent-runtime/frontend/`

### Package: @nebutra/agents (`spec/agents/`)

- Backend guidelines: `.trellis/spec/agents/backend/`

- Frontend guidelines: `.trellis/spec/agents/frontend/`

### Package: @nebutra/ai-primitives (`spec/ai-primitives/`)

- Backend guidelines: `.trellis/spec/ai-primitives/backend/`

- Frontend guidelines: `.trellis/spec/ai-primitives/frontend/`

### Package: @nebutra/ai-providers (`spec/ai-providers/`)

- Backend guidelines: `.trellis/spec/ai-providers/backend/`

- Frontend guidelines: `.trellis/spec/ai-providers/frontend/`

### Package: @nebutra/atelier-canvas (`spec/atelier-canvas/`)

- Backend guidelines: `.trellis/spec/atelier-canvas/backend/`

- Frontend guidelines: `.trellis/spec/atelier-canvas/frontend/`

### Package: @nebutra/audio-pipeline (`spec/audio-pipeline/`)

- Backend guidelines: `.trellis/spec/audio-pipeline/backend/`

- Frontend guidelines: `.trellis/spec/audio-pipeline/frontend/`

### Package: @nebutra/brand-genesis (`spec/brand-genesis/`)

- Backend guidelines: `.trellis/spec/brand-genesis/backend/`

- Frontend guidelines: `.trellis/spec/brand-genesis/frontend/`

### Package: @nebutra/browser-control (`spec/browser-control/`)

- Backend guidelines: `.trellis/spec/browser-control/backend/`

- Frontend guidelines: `.trellis/spec/browser-control/frontend/`

### Package: @nebutra/cinema (`spec/cinema/`)

- Backend guidelines: `.trellis/spec/cinema/backend/`

- Frontend guidelines: `.trellis/spec/cinema/frontend/`

### Package: @nebutra/code-execution (`spec/code-execution/`)

- Backend guidelines: `.trellis/spec/code-execution/backend/`

- Frontend guidelines: `.trellis/spec/code-execution/frontend/`

### Package: @nebutra/code-index (`spec/code-index/`)

- Backend guidelines: `.trellis/spec/code-index/backend/`

- Frontend guidelines: `.trellis/spec/code-index/frontend/`

### Package: @nebutra/cofounder-match (`spec/cofounder-match/`)

- Backend guidelines: `.trellis/spec/cofounder-match/backend/`

- Frontend guidelines: `.trellis/spec/cofounder-match/frontend/`

### Package: @nebutra/content-store (`spec/content-store/`)

- Backend guidelines: `.trellis/spec/content-store/backend/`

- Frontend guidelines: `.trellis/spec/content-store/frontend/`

### Package: @nebutra/document-pipeline (`spec/document-pipeline/`)

- Backend guidelines: `.trellis/spec/document-pipeline/backend/`

- Frontend guidelines: `.trellis/spec/document-pipeline/frontend/`

### Package: @nebutra/ecosystem-safety (`spec/ecosystem-safety/`)

- Backend guidelines: `.trellis/spec/ecosystem-safety/backend/`

- Frontend guidelines: `.trellis/spec/ecosystem-safety/frontend/`

### Package: @nebutra/event-log (`spec/event-log/`)

- Backend guidelines: `.trellis/spec/event-log/backend/`

- Frontend guidelines: `.trellis/spec/event-log/frontend/`

### Package: @nebutra/execution-policy (`spec/execution-policy/`)

- Backend guidelines: `.trellis/spec/execution-policy/backend/`

- Frontend guidelines: `.trellis/spec/execution-policy/frontend/`

### Package: @nebutra/forge-dns-leak (`spec/forge-dns-leak/`)

- Backend guidelines: `.trellis/spec/forge-dns-leak/backend/`

- Frontend guidelines: `.trellis/spec/forge-dns-leak/frontend/`

### Package: @nebutra/forge-runtime (`spec/forge-runtime/`)

- Backend guidelines: `.trellis/spec/forge-runtime/backend/`

- Frontend guidelines: `.trellis/spec/forge-runtime/frontend/`

### Package: @nebutra/founder-cemetery (`spec/founder-cemetery/`)

- Backend guidelines: `.trellis/spec/founder-cemetery/backend/`

- Frontend guidelines: `.trellis/spec/founder-cemetery/frontend/`

### Package: @nebutra/generation-context (`spec/generation-context/`)

- Backend guidelines: `.trellis/spec/generation-context/backend/`

- Frontend guidelines: `.trellis/spec/generation-context/frontend/`

### Package: @nebutra/idea-plaza (`spec/idea-plaza/`)

- Backend guidelines: `.trellis/spec/idea-plaza/backend/`

- Frontend guidelines: `.trellis/spec/idea-plaza/frontend/`

### Package: @nebutra/image-pipeline (`spec/image-pipeline/`)

- Backend guidelines: `.trellis/spec/image-pipeline/backend/`

- Frontend guidelines: `.trellis/spec/image-pipeline/frontend/`

### Package: @nebutra/knowledge-base (`spec/knowledge-base/`)

- Backend guidelines: `.trellis/spec/knowledge-base/backend/`

- Frontend guidelines: `.trellis/spec/knowledge-base/frontend/`

### Package: @nebutra/knowledge-graph (`spec/knowledge-graph/`)

- Backend guidelines: `.trellis/spec/knowledge-graph/backend/`

- Frontend guidelines: `.trellis/spec/knowledge-graph/frontend/`

### Package: @nebutra/knowledge-rag (`spec/knowledge-rag/`)

- Backend guidelines: `.trellis/spec/knowledge-rag/backend/`

- Frontend guidelines: `.trellis/spec/knowledge-rag/frontend/`

### Package: @nebutra/landing-builder (`spec/landing-builder/`)

- Backend guidelines: `.trellis/spec/landing-builder/backend/`

- Frontend guidelines: `.trellis/spec/landing-builder/frontend/`

### Package: @nebutra/local-embedding (`spec/local-embedding/`)

- Backend guidelines: `.trellis/spec/local-embedding/backend/`

- Frontend guidelines: `.trellis/spec/local-embedding/frontend/`

### Package: @nebutra/mcp (`spec/mcp/`)

- Backend guidelines: `.trellis/spec/mcp/backend/`

- Frontend guidelines: `.trellis/spec/mcp/frontend/`

### Package: @nebutra/outreach-engine (`spec/outreach-engine/`)

- Backend guidelines: `.trellis/spec/outreach-engine/backend/`

- Frontend guidelines: `.trellis/spec/outreach-engine/frontend/`

### Package: @nebutra/play-loader (`spec/play-loader/`)

- Backend guidelines: `.trellis/spec/play-loader/backend/`

- Frontend guidelines: `.trellis/spec/play-loader/frontend/`

### Package: @nebutra/play-marketplace (`spec/play-marketplace/`)

- Backend guidelines: `.trellis/spec/play-marketplace/backend/`

- Frontend guidelines: `.trellis/spec/play-marketplace/frontend/`

### Package: @nebutra/reel (`spec/reel/`)

- Backend guidelines: `.trellis/spec/reel/backend/`

- Frontend guidelines: `.trellis/spec/reel/frontend/`

### Package: @nebutra/sandbox-runtime (`spec/sandbox-runtime/`)

- Backend guidelines: `.trellis/spec/sandbox-runtime/backend/`

- Frontend guidelines: `.trellis/spec/sandbox-runtime/frontend/`

### Package: @nebutra/startup-os (`spec/startup-os/`)

- Frontend guidelines: `.trellis/spec/startup-os/frontend/`

### Package: @nebutra/support-deflector (`spec/support-deflector/`)

- Backend guidelines: `.trellis/spec/support-deflector/backend/`

- Frontend guidelines: `.trellis/spec/support-deflector/frontend/`

### Package: @nebutra/time-machine (`spec/time-machine/`)

- Backend guidelines: `.trellis/spec/time-machine/backend/`

- Frontend guidelines: `.trellis/spec/time-machine/frontend/`

### Package: @nebutra/tool-registry (`spec/tool-registry/`)

- Backend guidelines: `.trellis/spec/tool-registry/backend/`

- Frontend guidelines: `.trellis/spec/tool-registry/frontend/`

### Package: @nebutra/video-pipeline (`spec/video-pipeline/`)

- Backend guidelines: `.trellis/spec/video-pipeline/backend/`

- Frontend guidelines: `.trellis/spec/video-pipeline/frontend/`

### Package: @nebutra/voice-realtime (`spec/voice-realtime/`)

- Backend guidelines: `.trellis/spec/voice-realtime/backend/`

- Frontend guidelines: `.trellis/spec/voice-realtime/frontend/`

### Package: @nebutra/workflow-runtime (`spec/workflow-runtime/`)

- Backend guidelines: `.trellis/spec/workflow-runtime/backend/`

- Frontend guidelines: `.trellis/spec/workflow-runtime/frontend/`

### Package: @nebutra/access-gate (`spec/access-gate/`)

- Backend guidelines: `.trellis/spec/access-gate/backend/`

- Frontend guidelines: `.trellis/spec/access-gate/frontend/`

### Package: @nebutra/billing (`spec/billing/`)

- Backend guidelines: `.trellis/spec/billing/backend/`

- Frontend guidelines: `.trellis/spec/billing/frontend/`

### Package: @nebutra/blog (`spec/blog/`)

- Backend guidelines: `.trellis/spec/blog/backend/`

- Frontend guidelines: `.trellis/spec/blog/frontend/`

### Package: @nebutra/contracts (`spec/contracts/`)

- Backend guidelines: `.trellis/spec/contracts/backend/`

- Frontend guidelines: `.trellis/spec/contracts/frontend/`

### Package: @nebutra/legal (`spec/legal/`)

- Backend guidelines: `.trellis/spec/legal/backend/`

- Frontend guidelines: `.trellis/spec/legal/frontend/`

### Package: @nebutra/license (`spec/license/`)

- Backend guidelines: `.trellis/spec/license/backend/`

- Frontend guidelines: `.trellis/spec/license/frontend/`

### Package: @nebutra/marketing (`spec/marketing/`)

- Backend guidelines: `.trellis/spec/marketing/backend/`

- Frontend guidelines: `.trellis/spec/marketing/frontend/`

### Package: @nebutra/metering (`spec/metering/`)

- Backend guidelines: `.trellis/spec/metering/backend/`

- Frontend guidelines: `.trellis/spec/metering/frontend/`

### Package: @nebutra/waitlist (`spec/waitlist/`)

- Backend guidelines: `.trellis/spec/waitlist/backend/`

- Frontend guidelines: `.trellis/spec/waitlist/frontend/`

### Package: @nebutra/brand (`spec/brand/`)

- Backend guidelines: `.trellis/spec/brand/backend/`

- Frontend guidelines: `.trellis/spec/brand/frontend/`

### Package: @nebutra/design-sync (`spec/design-sync/`)

- Backend guidelines: `.trellis/spec/design-sync/backend/`

- Frontend guidelines: `.trellis/spec/design-sync/frontend/`

### Package: @nebutra/design-tokens (`spec/design-tokens/`)

- Frontend guidelines: `.trellis/spec/design-tokens/frontend/`

### Package: @nebutra/docs-shared (`spec/docs-shared/`)

- Frontend guidelines: `.trellis/spec/docs-shared/frontend/`

### Package: @nebutra/fonts (`spec/fonts/`)

- Backend guidelines: `.trellis/spec/fonts/backend/`

- Frontend guidelines: `.trellis/spec/fonts/frontend/`

### Package: @nebutra/icons (`spec/icons/`)

- Backend guidelines: `.trellis/spec/icons/backend/`

- Frontend guidelines: `.trellis/spec/icons/frontend/`

### Package: @nebutra/theme (`spec/theme/`)

- Backend guidelines: `.trellis/spec/theme/backend/`

- Frontend guidelines: `.trellis/spec/theme/frontend/`

### Package: @nebutra/tokens (`spec/tokens/`)

- Backend guidelines: `.trellis/spec/tokens/backend/`

- Frontend guidelines: `.trellis/spec/tokens/frontend/`

### Package: @nebutra/typelens-catalog (`spec/typelens-catalog/`)

- Backend guidelines: `.trellis/spec/typelens-catalog/backend/`

- Frontend guidelines: `.trellis/spec/typelens-catalog/frontend/`

### Package: @nebutra/ui (`spec/ui/`)

- Backend guidelines: `.trellis/spec/ui/backend/`

- Frontend guidelines: `.trellis/spec/ui/frontend/`

### Package: @nebutra/audit (`spec/audit/`)

- Backend guidelines: `.trellis/spec/audit/backend/`

- Frontend guidelines: `.trellis/spec/audit/frontend/`

### Package: @nebutra/auth (`spec/auth/`)

- Backend guidelines: `.trellis/spec/auth/backend/`

- Frontend guidelines: `.trellis/spec/auth/frontend/`

### Package: @nebutra/captcha (`spec/captcha/`)

- Backend guidelines: `.trellis/spec/captcha/backend/`

- Frontend guidelines: `.trellis/spec/captcha/frontend/`

### Package: @nebutra/identity (`spec/identity/`)

- Backend guidelines: `.trellis/spec/identity/backend/`

- Frontend guidelines: `.trellis/spec/identity/frontend/`

### Package: @nebutra/oauth (`spec/oauth/`)

- Backend guidelines: `.trellis/spec/oauth/backend/`

- Frontend guidelines: `.trellis/spec/oauth/frontend/`

### Package: @nebutra/permissions (`spec/permissions/`)

- Backend guidelines: `.trellis/spec/permissions/backend/`

- Frontend guidelines: `.trellis/spec/permissions/frontend/`

### Package: @nebutra/tenant (`spec/tenant/`)

- Backend guidelines: `.trellis/spec/tenant/backend/`

- Frontend guidelines: `.trellis/spec/tenant/frontend/`

### Package: @nebutra/vault (`spec/vault/`)

- Backend guidelines: `.trellis/spec/vault/backend/`

- Frontend guidelines: `.trellis/spec/vault/frontend/`

### Package: @nebutra/admin-tooling (`spec/admin-tooling/`)

- Backend guidelines: `.trellis/spec/admin-tooling/backend/`

- Frontend guidelines: `.trellis/spec/admin-tooling/frontend/`

### Package: @nebutra/cache (`spec/cache/`)

- Backend guidelines: `.trellis/spec/cache/backend/`

- Frontend guidelines: `.trellis/spec/cache/frontend/`

### Package: @nebutra/collab (`spec/collab/`)

- Backend guidelines: `.trellis/spec/collab/backend/`

- Frontend guidelines: `.trellis/spec/collab/frontend/`

### Package: @nebutra/email (`spec/email/`)

- Backend guidelines: `.trellis/spec/email/backend/`

- Frontend guidelines: `.trellis/spec/email/frontend/`

### Package: @nebutra/event-bus (`spec/event-bus/`)

- Backend guidelines: `.trellis/spec/event-bus/backend/`

- Frontend guidelines: `.trellis/spec/event-bus/frontend/`

### Package: @nebutra/integration-vault (`spec/integration-vault/`)

- Backend guidelines: `.trellis/spec/integration-vault/backend/`

- Frontend guidelines: `.trellis/spec/integration-vault/frontend/`

### Package: @nebutra/notifications (`spec/notifications/`)

- Backend guidelines: `.trellis/spec/notifications/backend/`

- Frontend guidelines: `.trellis/spec/notifications/frontend/`

### Package: @nebutra/onboarding (`spec/onboarding/`)

- Backend guidelines: `.trellis/spec/onboarding/backend/`

- Frontend guidelines: `.trellis/spec/onboarding/frontend/`

### Package: @nebutra/queue (`spec/queue/`)

- Backend guidelines: `.trellis/spec/queue/backend/`

- Frontend guidelines: `.trellis/spec/queue/frontend/`

### Package: @nebutra/saga (`spec/saga/`)

- Backend guidelines: `.trellis/spec/saga/backend/`

- Frontend guidelines: `.trellis/spec/saga/frontend/`

### Package: @nebutra/search (`spec/search/`)

- Backend guidelines: `.trellis/spec/search/backend/`

- Frontend guidelines: `.trellis/spec/search/frontend/`

### Package: @nebutra/sms (`spec/sms/`)

- Backend guidelines: `.trellis/spec/sms/backend/`

- Frontend guidelines: `.trellis/spec/sms/frontend/`

### Package: @nebutra/storage (`spec/storage/`)

- Backend guidelines: `.trellis/spec/storage/backend/`

- Frontend guidelines: `.trellis/spec/storage/frontend/`

### Package: @nebutra/tts (`spec/tts/`)

- Backend guidelines: `.trellis/spec/tts/backend/`

- Frontend guidelines: `.trellis/spec/tts/frontend/`

### Package: @nebutra/uploads (`spec/uploads/`)

- Backend guidelines: `.trellis/spec/uploads/backend/`

- Frontend guidelines: `.trellis/spec/uploads/frontend/`

### Package: @nebutra/video-compose (`spec/video-compose/`)

- Backend guidelines: `.trellis/spec/video-compose/backend/`

- Frontend guidelines: `.trellis/spec/video-compose/frontend/`

### Package: @nebutra/webhooks (`spec/webhooks/`)

- Backend guidelines: `.trellis/spec/webhooks/backend/`

- Frontend guidelines: `.trellis/spec/webhooks/frontend/`

### Package: @nebutra/china-compliance (`spec/china-compliance/`)

- Backend guidelines: `.trellis/spec/china-compliance/backend/`

- Frontend guidelines: `.trellis/spec/china-compliance/frontend/`

### Package: nebutra (`spec/nebutra/`)

- Backend guidelines: `.trellis/spec/nebutra/backend/`

- Frontend guidelines: `.trellis/spec/nebutra/frontend/`

### Package: create-sailor (`spec/create-sailor/`)

- Backend guidelines: `.trellis/spec/create-sailor/backend/`

- Frontend guidelines: `.trellis/spec/create-sailor/frontend/`

### Package: @nebutra/preset (`spec/preset/`)

- Backend guidelines: `.trellis/spec/preset/backend/`

- Frontend guidelines: `.trellis/spec/preset/frontend/`

### Package: @nebutra/sanity (`spec/sanity/`)

- Backend guidelines: `.trellis/spec/sanity/backend/`

- Frontend guidelines: `.trellis/spec/sanity/frontend/`

### Package: @nebutra/supabase (`spec/supabase/`)

- Backend guidelines: `.trellis/spec/supabase/backend/`

- Frontend guidelines: `.trellis/spec/supabase/frontend/`

### Package: @nebutra/alerting (`spec/alerting/`)

- Backend guidelines: `.trellis/spec/alerting/backend/`

- Frontend guidelines: `.trellis/spec/alerting/frontend/`

### Package: @nebutra/analytics (`spec/analytics/`)

- Backend guidelines: `.trellis/spec/analytics/backend/`

- Frontend guidelines: `.trellis/spec/analytics/frontend/`

### Package: @nebutra/browser-utils (`spec/browser-utils/`)

- Backend guidelines: `.trellis/spec/browser-utils/backend/`

- Frontend guidelines: `.trellis/spec/browser-utils/frontend/`

### Package: @nebutra/capability-kit (`spec/capability-kit/`)

- Backend guidelines: `.trellis/spec/capability-kit/backend/`

- Frontend guidelines: `.trellis/spec/capability-kit/frontend/`

### Package: @nebutra/config (`spec/config/`)

- Backend guidelines: `.trellis/spec/config/backend/`

- Frontend guidelines: `.trellis/spec/config/frontend/`

### Package: @nebutra/db (`spec/db/`)

- Backend guidelines: `.trellis/spec/db/backend/`

- Frontend guidelines: `.trellis/spec/db/frontend/`

### Package: @nebutra/errors (`spec/errors/`)

- Backend guidelines: `.trellis/spec/errors/backend/`

- Frontend guidelines: `.trellis/spec/errors/frontend/`

### Package: @nebutra/feature-flags (`spec/feature-flags/`)

- Backend guidelines: `.trellis/spec/feature-flags/backend/`

- Frontend guidelines: `.trellis/spec/feature-flags/frontend/`

### Package: @nebutra/gateway-core (`spec/gateway-core/`)

- Backend guidelines: `.trellis/spec/gateway-core/backend/`

- Frontend guidelines: `.trellis/spec/gateway-core/frontend/`

### Package: @nebutra/graph-model (`spec/graph-model/`)

- Backend guidelines: `.trellis/spec/graph-model/backend/`

- Frontend guidelines: `.trellis/spec/graph-model/frontend/`

### Package: @nebutra/health (`spec/health/`)

- Backend guidelines: `.trellis/spec/health/backend/`

- Frontend guidelines: `.trellis/spec/health/frontend/`

### Package: @nebutra/i18n (`spec/i18n/`)

- Backend guidelines: `.trellis/spec/i18n/backend/`

- Frontend guidelines: `.trellis/spec/i18n/frontend/`

### Package: @nebutra/logger (`spec/logger/`)

- Backend guidelines: `.trellis/spec/logger/backend/`

- Frontend guidelines: `.trellis/spec/logger/frontend/`

### Package: @nebutra/prepaid-wallet (`spec/prepaid-wallet/`)

- Backend guidelines: `.trellis/spec/prepaid-wallet/backend/`

- Frontend guidelines: `.trellis/spec/prepaid-wallet/frontend/`

### Package: @nebutra/provider-factory (`spec/provider-factory/`)

- Backend guidelines: `.trellis/spec/provider-factory/backend/`

- Frontend guidelines: `.trellis/spec/provider-factory/frontend/`

### Package: @nebutra/rate-limit (`spec/rate-limit/`)

- Backend guidelines: `.trellis/spec/rate-limit/backend/`

- Frontend guidelines: `.trellis/spec/rate-limit/frontend/`

### Package: @nebutra/repositories (`spec/repositories/`)

- Backend guidelines: `.trellis/spec/repositories/backend/`

- Frontend guidelines: `.trellis/spec/repositories/frontend/`

### Package: @nebutra/router-supply (`spec/router-supply/`)

- Backend guidelines: `.trellis/spec/router-supply/backend/`

- Frontend guidelines: `.trellis/spec/router-supply/frontend/`

### Package: @nebutra/status (`spec/status/`)

- Backend guidelines: `.trellis/spec/status/backend/`

- Frontend guidelines: `.trellis/spec/status/frontend/`

### Package: @nebutra/tenant-store (`spec/tenant-store/`)

- Backend guidelines: `.trellis/spec/tenant-store/backend/`

- Frontend guidelines: `.trellis/spec/tenant-store/frontend/`

### Package: @nebutra/trace-store (`spec/trace-store/`)

- Backend guidelines: `.trellis/spec/trace-store/backend/`

- Frontend guidelines: `.trellis/spec/trace-store/frontend/`

### Package: _shared (`spec/_shared/`)

- Backend guidelines: `.trellis/spec/_shared/backend/`

- Frontend guidelines: `.trellis/spec/_shared/frontend/`

### Package: nebutra-ai-service (`spec/nebutra-ai-service/`)

- Backend guidelines: `.trellis/spec/nebutra-ai-service/backend/`

### Package: @nebutra/gateway (`spec/gateway/`)

- Backend guidelines: `.trellis/spec/gateway/backend/`

- Frontend guidelines: `.trellis/spec/gateway/frontend/`


### Thinking guides (already populated)

`.trellis/spec/guides/` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import from existing convention files first (preferred)

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching `.trellis/spec/` files —
usually much faster than documenting from scratch.

| File / Directory | Tool |
|------|------|
| `CLAUDE.md` / `CLAUDE.local.md` | Claude Code |
| `AGENTS.md` | Codex / Claude Code / agent-compatible tools |
| `.cursorrules` | Cursor |
| `.cursor/rules/*.mdc` | Cursor (rules directory) |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |
| `.roomodes` | Roo Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.vscode/settings.json` → `github.copilot.chat.codeGeneration.instructions` | VS Code Copilot |
| `CONVENTIONS.md` / `.aider.conf.yml` | aider |
| `CONTRIBUTING.md` | General project conventions |
| `.editorconfig` | Editor formatting rules |

### Step 2: Analyze the codebase for anything not covered by existing docs

Scan real code to discover patterns. Before writing each spec file:
- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document reality, not ideals

**Critical**: write what the code *actually does*, not what it should do.
Sub-agents match the spec, so aspirational patterns that don't exist in the
codebase will cause sub-agents to write code that looks out of place.

If the team has known tech debt, document the current state — improvement
is a separate conversation, not a bootstrap concern.

---

## Quick explainer of the runtime (share when they ask "why do we need spec at all")

- Every AI coding task spawns two sub-agents: `trellis-implement` (writes
  code) and `trellis-check` (verifies quality).
- Each task has `implement.jsonl` / `check.jsonl` manifests listing which
  spec files to load.
- The platform hook auto-injects those spec files + the task's `prd.md`
  into every sub-agent prompt, so the sub-agent codes/reviews per team
  conventions without anyone pasting them manually.
- Source of truth: `.trellis/spec/`. That's why filling it well now pays
  off forever.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

```bash
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

After archive, every new developer who joins this project will get a
`00-join-<slug>` onboarding task instead of this bootstrap task.

---

## Suggested opening line

"Welcome to Trellis! Your init just set me up to help you fill the project
spec — a one-time setup so every future AI session follows the team's
conventions instead of writing generic code. Before we start, do you have
any existing convention docs (CLAUDE.md, .cursorrules, CONTRIBUTING.md,
etc.) I can pull from, or should I scan the codebase from scratch?"
