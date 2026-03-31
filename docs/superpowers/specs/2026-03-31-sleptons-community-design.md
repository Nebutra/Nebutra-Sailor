# Sleptons — Founder Community & Matching Platform
## Design Specification · 2026-03-31 (rev 2)

> Sleptons is the network layer of Nebutra.
> Where AI-native one-person companies are born, discovered, and scaled.

---

## 1. Vision & Positioning

### What Sleptons Is

Sleptons（超对称轻子）is an independent brand built on top of Nebutra-Sailor's infrastructure.
It is, simultaneously:

- **Product Hunt** — a curated discovery surface for AI-native products built by solo founders
- **YC / 奇绩创坛** — a credentialing and incubation network for one-person companies
- **Tinder for Founders** — a semantic matching engine connecting builders with co-founders, early users, investors, and advisors
- **China's OPC Policy Gateway** — the digital home for China's one-person company policy wave

### What Sleptons Is Not

- Not a forum or chat group
- Not a coworking space directory
- Not a job board
- Not a social media platform

The "Policy Gateway" function in M4 is **credential-based access** (showing verified v2 membership to government programs), not brokering or listing government services. This is distinct from a directory or marketplace.

### The Moat

```
More Nebutra-Sailor users
        ↓
More Sleptons members
        ↓
Better matching quality + richer graph
        ↓
More successful founders ("v∞ alumni")
        ↓
More compelling stories → more new members
        ↓
Network effect compounds
```

The moat is the **graph** — the relationship data between founders, products, and outcomes that accumulates over time and cannot be replicated by a late entrant.

### Terminology

| Term | Meaning |
|------|---------|
| **OPC** | One Person Company — a Chinese government policy classification, NOT a brand name. Used as audience descriptor only. |
| **Nebutra-Sailor** | The AI-native product infrastructure brand. Appears in the badge: `Built by Nebutra-Sailor` |
| **Sleptons** | The community and matching platform brand |
| **v0 / v1 / v2 / v∞** | Sleptons member tier system |
| **community_profiles** | Existing DB table (created by `/get-license` wizard in `apps/landing-page`). Contains: userId, role, teamSize, useCase, buildingWhat, githubHandle, twitterHandle, referralSource. This is the source of truth for auto-populating the Sleptons profile. |

---

## 2. User Journey

### Entry Path A: Via License (Primary)

```
1. Register / Sign in (Clerk auth)
        ↓
2. Apply for Nebutra-Sailor Commercial License (/get-license)
   └─ License Wizard (4 steps)
   └─ Step 3 adds: "What do you need most right now?" (new field)
        ↓
3. License issued → Sleptons membership auto-activated (v0)
   └─ Auto-create sleptons_member_profiles from community_profiles data
        ↓
4. Redirect → /community?welcome=true
   └─ "Welcome, [name]. You are Sleptons member #N."
   └─ One-time moment. Members screenshot this. It spreads.
        ↓
5. Profile card auto-populated. Member appears in Gallery immediately.
        ↓
6. Explore Sleptons Gallery → Return to Nebutra-Sailor Console
```

### Entry Path B: Via Sleptons Direct Discovery (Secondary)

Someone finds Sleptons via Google, Product Hunt, press, or social — without prior Nebutra-Sailor intent.

```
1. Land on apps/community (public, no auth required)
2. Browse gallery, get inspired
3. Click "Join Sleptons" CTA
4. Redirected to /get-license on apps/landing-page
5. Follows Entry Path A from step 1
```

There is no "join without a license" path. The license IS the membership credential. The CTA makes this explicit: **"Claim your free Nebutra-Sailor license to join."**

### Profile Enrichment Flow

After joining (v0), members can enrich their profile from two surfaces:
- **`apps/community/profile/edit`** — public-facing profile editor (bio, product URL, avatar, tech stack, looking for)
- **`apps/web/settings/profile`** — same editor, accessible from the console

Both surfaces write to the same `sleptons_member_profiles` record via `api-gateway`.

Tier advancement from v0 → v1 is **fully automatic**: system checks `productUrl IS NOT NULL` + all required fields filled. No human review. Polling interval: on every profile save.

### Tier Promotion Rules

| Transition | Trigger | Method |
|-----------|---------|--------|
| v0 → v1 | `displayName` + `productUrl` + `lookingFor` all set | Automatic on profile save |
| v1 → v2 | Member submits "Apply for v2" form with product evidence | Light human review via admin panel (see §6) |
| v2 → v∞ | Nebutra editorial team selects | Manual, no application form |

### Design Principle

> **Zero burden at the 0→1 moment.** The founder who just got their license should feel celebrated, not asked to fill more forms. Profile completeness is a progressive journey, not a registration gate.

---

## 3. Community Design

### 3.1 Sleptons Page Structure (`apps/community`)

**① Hero — Identity Declaration**
```
SLEPTONS
AI-native founders. One person. Infinite potential.

[ 1,247 founders · 893 products · 34 cities ]
```

**② This Week's Featured** (Product Hunt DNA)
- 3 hand-curated products per week, set via admin panel
- The quality signal that tells visitors: this community is real

**③ Member Gallery** (main body)
- Grid of member profile cards
- Filterable by: tier / use case / lookingFor / stage / tech stack
- Default sort: newest members first

**④ Welcome Overlay** (first visit only, `?welcome=true`)
- Full-screen moment: member number, confetti, two CTAs
- "View my Profile" · "Explore Community"

### 3.2 Member Profile Card

```
┌─────────────────────────────────────────┐
│  [Avatar]  Zhang Wei              [v1 ⚡] │
│            Indie Developer · Shanghai    │
│                                         │
│  "AI contract review for SMBs"          │
│                                         │
│  [Legal] [B2B] [Next.js] [AI]           │
│  🔍 Looking for: Early users · Advisor  │
│                                         │
│  [GitHub] [Twitter]    Member #0042     │
└─────────────────────────────────────────┘
```

**Avatar interim strategy (M1):** Use Clerk's `imageUrl` from the user profile. No OSS upload required for v0. OSS avatar upload unlocks at v1 once the OSS adapter is built.

**`#0042` = `memberNumber`** — a sequential auto-increment integer, separate from `id` (cuid). See data model.

### 3.3 Tier System

| Tier | Name | How to Reach | Unlocks |
|------|------|-------------|---------|
| **v0** 🌱 | Seed | Apply for license (automatic) | Gallery presence · Free commercial license |
| **v1** ⚡ | Builder | Profile complete + product URL set (auto) | Profile highlight · Apply for Featured · Matching visible · OSS avatar upload |
| **v2** 🚀 | Founder | Live product + human review via admin | Official verified badge · Case study candidate · Policy queue priority |
| **v∞** 🦄 | Unicorn | Editorial selection (rare, no application) | Investment pipeline · Ambassador · Shared Nebutra brand channels |

### 3.4 Canonical Vocabulary

`lookingFor` and `techStack` use controlled vocabularies to prevent tag fragmentation that would silently break matching quality.

**`lookingFor` enum** (fixed set, UI renders as checkboxes):
```
co-founder | designer | engineer | early-users | angel-investor
industry-advisor | sales-ops | nothing-solo
```

**`techStack` enum** (curated list, UI renders as multi-select with search):
```
Next.js | React | Vue | Svelte | Node.js | Python | Go | Rust
PostgreSQL | MySQL | MongoDB | Redis | Supabase | Firebase
Vercel | AWS | Alibaba Cloud | Docker | Kubernetes
OpenAI | Anthropic | LangChain | Hugging Face
Stripe | WeChat Pay | Alipay | ...
```
New entries can be requested via admin panel. The list is seeded with ~80 values at launch.

### 3.5 Privacy & Visibility Rules

`isPublic` controls the following consistently:

| Surface | `isPublic: true` | `isPublic: false` |
|---------|-----------------|------------------|
| Gallery | Visible | Hidden |
| Search | Indexed | Excluded |
| Matching | Eligible | Excluded |
| Graph | Node visible | Node hidden |
| Google | Indexed | `noindex` meta |
| Direct URL (`/members/[slug]`) | Accessible | 404 |

Members can toggle `isPublic` from their profile editor at any time. License remains valid regardless of visibility setting.

### 3.6 Slug Generation

```
slug = slugify(displayName) + '-' + memberNumber
// e.g. "zhang-wei-42"
// On conflict (extremely rare): append random 4-char suffix
```

User cannot customize slug in v1. Custom slug unlocks in a future release.

---

## 4. Matching Engine (Phased)

### Phase 1 — Tag Overlap (M1, launches at v1 tier)

```typescript
// Score = intersection of what A can offer and what B is looking for
// "offer" is inferred from techStack + role
matchScore(a, b) = |skills(a) ∩ lookingFor(b)|
```

Matching is visible to v1+ members only. v0 members can see the gallery but not the "You might connect with..." recommendations. This creates a concrete incentive to complete a profile.

### Phase 2 — Semantic Vector (M2, pgvector HNSW)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index, dimension locked at 1536
-- text-embedding-3-small with NO dimension reduction (never pass dimensions param)
CREATE INDEX ON sleptons_member_profiles
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

SELECT id, display_name,
       1 - (embedding <=> $1::vector) AS similarity
FROM sleptons_member_profiles
WHERE is_public = true AND tier != 'V0'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

**Embedding dimension is locked at 1536.** `text-embedding-3-small` must always be called without a `dimensions` parameter. If the model is changed, a full re-embedding migration is required.

Embeddings generated from: `bio + productTagline + lookingFor.join(' ')`.
Triggered async via `@nebutra/queue` on every profile save.

### Phase 3 — Graph Proximity (M3, Sleptons Network)

- Relationship table: `sleptons_connections` (follows, collaborated)
- Graph traversal: "2nd degree connections who offer what you need"
- Visualized with **Sigma.js + Graphology** (WebGL, NodeImageProgram for avatars)

---

## 5. Technical Architecture

### Application Structure

```
apps/
  landing-page/     Lean marketing + /get-license wizard
  community/        Sleptons — public-facing, Google-indexable
  web/              Nebutra-Sailor console (authenticated)
  api-gateway/      Hono — deployed on Alibaba Cloud ECS
```

### Infrastructure Split

```
Vercel (edge / frontend)
├── apps/landing-page
├── apps/community      → future: sleptons.com
└── apps/web

Alibaba Cloud ECS (backend / data)
├── apps/api-gateway    (Hono, Node.js)
├── ApsaraDB RDS for PG (pgvector extension required — confirm on target tier)
├── ApsaraDB Redis      (BullMQ backend)
├── Meilisearch ≥1.6    (self-hosted, hybrid search requires 1.6+)
└── OSS                 (file storage)
```

### Frontend ↔ Backend Pattern

```
Server Components (SSR)
  → Direct HTTP to ECS api-gateway (server-to-server, no CORS, fast)

Client Components (browser-initiated)
  → Next.js Route Handlers (/api/...) → forward to ECS
  → ECS not exposed directly to browser
```

### Data Model

**`sleptons_member_profiles`**
```prisma
model SleptonsaMemberProfile {
  id                String        @id @default(cuid())
  memberNumber      Int           @unique @default(autoincrement())
  userId            String        @unique
  licenseId         String        @unique
  license           License       @relation(fields: [licenseId], references: [id])
  slug              String        @unique
  displayName       String
  bio               String?
  avatarUrl         String?       // Clerk imageUrl for v0; OSS URL after OSS adapter ships
  productName       String?
  productUrl        String?
  productTagline    String?
  techStack         String[]      // values from canonical vocabulary only
  lookingFor        String[]      // values from canonical vocabulary only
  tier              SleptonsTier  @default(V0)
  isPublic          Boolean       @default(true)
  embedding         Unsupported("vector(1536)")?  // dimension locked, never reduce
  githubHandle      String?
  githubData        Json?         // cached from @octokit/rest, refresh every 24h
  githubRefreshedAt DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  products          SleptonsProduct[]
  following         SleptonsConnection[] @relation("follower")
  followers         SleptonsConnection[] @relation("following")
  @@map("sleptons_member_profiles")
}

enum SleptonsTier { V0  V1  V2  V_INFINITY }
```

**`sleptons_products`**
```prisma
model SleptonsProduct {
  id           String              @id @default(cuid())
  memberId     String
  member       SleptonsaMemberProfile @relation(fields: [memberId], references: [id])
  name         String
  tagline      String
  description  String?
  url          String?
  githubUrl    String?
  thumbnailUrl String?
  stage        ProductStage        @default(BUILDING)
  isFeatured   Boolean             @default(false)
  featuredAt   DateTime?
  featuredWeek String?             // ISO week string e.g. "2026-W14"
  createdAt    DateTime            @default(now())
  upvotes      SleptonsUpvote[]
  @@map("sleptons_products")
}

enum ProductStage { IDEA  BUILDING  LAUNCHED  SCALING }
```

**`sleptons_upvotes`** (replaces mutable `Int` counter)
```prisma
model SleptonsUpvote {
  memberId   String
  productId  String
  createdAt  DateTime @default(now())
  product    SleptonsProduct @relation(fields: [productId], references: [id])
  @@id([memberId, productId])
  @@map("sleptons_upvotes")
}
```

**`sleptons_connections`**
```prisma
model SleptonsConnection {
  followerId   String
  follower     SleptonsaMemberProfile @relation("follower", fields: [followerId], references: [id])
  followingId  String
  following    SleptonsaMemberProfile @relation("following", fields: [followingId], references: [id])
  createdAt    DateTime @default(now())
  @@id([followerId, followingId])
  @@map("sleptons_connections")
}
```

**Migration from existing tables:** On license issue in `api-gateway`, auto-create `sleptons_member_profiles` by reading from `community_profiles` (existing table populated by license wizard). Tier defaults to V0. `avatarUrl` sourced from Clerk `imageUrl`. Silent, no user action required.

### Tech Stack

| Need | Choice | Notes |
|------|--------|-------|
| Social graph viz | **Sigma.js + Graphology** | WebGL, 100k+ nodes, NodeImageProgram for avatars. Phase 3. |
| Semantic matching | **pgvector on ApsaraDB PG** (HNSW, 1536-dim locked) | Confirm extension availability on RDS tier before M2 commit |
| Text search | **Meilisearch ≥1.6** (self-hosted ECS) | Hybrid search requires 1.6+. Pin version in docker-compose. |
| Real-time v1 | **ApsaraDB Redis Pub/Sub + SSE** | Low latency for CN users. Vercel functions: 15s heartbeat + auto-reconnect. |
| Real-time v2 | **PartyKit** | Cloudflare DO. `apps/community` stays on Vercel; PartyKit connects via WebSocket from the browser. No app migration needed. |
| GitHub verification | **@octokit/rest** + OAuth App | Hono route on ECS, 5k req/hr per user token |
| Product card gen | **next/og + Satori** | Edge runtime, zero cost, branded card from DB data |
| Product screenshot | **Microlink** | Async via `@nebutra/queue` (QStash), stored in OSS |
| File storage | **Alibaba Cloud OSS** | `@nebutra/uploads` OSS adapter required. Blocks v1 avatar upload (not v0). |
| Auth | **Clerk** (shared across all apps) | |
| Embeddings | **AI Gateway → text-embedding-3-small** | Always 1536-dim, no dimension param |

### Rate Limiting

Unauthenticated requests to gallery and search endpoints are rate-limited at `api-gateway` (Hono middleware):
- Gallery browse: 60 req/min per IP
- Search: 30 req/min per IP
- Profile view: 120 req/min per IP

Authenticated requests use per-userId limits (10x above).

### Cold Start Strategy

```
Day 0
  Nebutra team = first v∞ members
  30–50 personal network invitations, hand-curated
  "Founding Member #001–050" permanent badge

Week 1–4
  V2EX · 少数派 · 独立开发者微信群 · Twitter/X
  Product Hunt launch (Sleptons itself as the product)

Month 2+
  Every public profile = Google-indexed page
  "Built by Nebutra-Sailor" badge on member products → inbound
  v∞ founder stories published → editorial acquisition flywheel
```

---

## 6. Admin & Editorial Panel

A lightweight admin panel is required for:
- Setting `isFeatured` / `featuredWeek` on products ("This Week's Featured")
- Reviewing v1 → v2 applications (evidence review, approve/reject)
- Selecting v∞ members (manual, rare)
- Managing canonical vocabulary (add new `techStack` / `lookingFor` values)
- Viewing community growth metrics

**Implementation:** A protected route within `apps/web` at `/admin/sleptons`, accessible only to users with a Clerk `admin` role. Uses standard Nebutra-Sailor UI components. No separate admin app required.

---

## 7. Roadmap

> This roadmap describes **market milestones**, not feature checklists.
> Each milestone represents a state of the world, not a sprint backlog.
> "Sleptons Fund" (referenced in M5) is exploratory and subject to legal structuring.

---

### M1 · The First 1,000
*Target: Q2 2026*
*Precondition: none — this is the launch milestone*

**What the world looks like:**
1,000 AI-native founders have claimed their Nebutra-Sailor license and joined Sleptons. Their products are publicly indexed on Google. Phase 1 tag-overlap matching is live for v1+ members. The first v∞ members are being celebrated.

**Why it matters:**
Sleptons is a legitimate destination. Inbound begins. The brand signal is real.

**Key unlock:** Phase 1 matching proves real connections happen through Sleptons.

---

### M2 · The Discovery Engine
*Target: Q3 2026*
*Precondition: 500+ v1 members (sufficient embedding density for semantic matching)*

**What the world looks like:**
A founder in Shanghai finds their designer in Chengdu through Sleptons in under 3 minutes. Semantic vector matching (pgvector) surfaces genuinely relevant connections beyond tag overlap. Product Hunt-style voting surfaces the best work weekly.

**Why it matters:**
Sleptons stops being a directory and becomes a tool. Retention compounds. DAU grows independent of new member acquisition.

**Key unlock:** Network effects begin. The value of membership grows with every new member.

---

### M3 · The Graph is Alive
*Target: Q4 2026*
*Precondition: 200+ documented connections in `sleptons_connections`*

**What the world looks like:**
The Sleptons network graph is publicly visible — a living map of AI-native founders in China, their products, their connections. Press and investors cite the graph as a signal of ecosystem health. v∞ alumni treat Sleptons as a career-defining credential.

**Why it matters:**
The graph is the moat made tangible. It cannot be replicated by a late entrant.

**Key unlock:** Sleptons becomes the authoritative data source for China's AI-native founder ecosystem.

---

### M4 · Policy × Infrastructure × Community
*Target: H1 2027*
*Precondition: 500+ verified v2 members + legal entity incorporation in at least 2 target cities*

**What the world looks like:**
Nebutra has signed MoUs with 3+ municipal governments to recognize Sleptons v2 membership as a qualifying credential for OPC policy benefits (tax preferentials, registration fee waivers, government-backed grants). The flywheel between policy tailwind and platform growth is locked in.

**Why it matters:**
No competitor can replicate government relationships. This is the China-specific structural moat.

**Key unlock:** Sleptons becomes the operating system for China's one-person company policy ecosystem.

---

### M5 · The First Sleptons Unicorn
*Target: 2027–2028*
*Precondition: 3+ v∞ companies having raised institutional rounds*

**What the world looks like:**
A Sleptons v∞ member raises a Series A from a top-tier VC, citing Sleptons as the origin of their co-founder relationship, first 100 users, and angel investor. Nebutra explores a dedicated investment vehicle (exploratory — subject to legal structuring and licensing) for v∞ companies. "Sleptons alumni" carries weight in the Chinese startup ecosystem.

**Why it matters:**
This is proof of concept for the entire thesis: a one-person company, built on Nebutra-Sailor, discovered through Sleptons, scaled to unicorn. The first one proves the model. The second proves the system.

**Key unlock:** Sleptons is no longer a community tool. It is a unicorn factory.

---

## 8. Open Questions (Pre-Implementation)

| # | Question | Impact | Owner |
|---|----------|--------|-------|
| 1 | `apps/community` domain: `community.nebutra.com` now, `sleptons.com` after brand launch? | Routing, SEO | Product |
| 2 | OSS adapter for `@nebutra/uploads`: scope for M1 (v0 uses Clerk imageUrl as interim) or build before launch? | Avatar uploads at v1 | Engineering |
| 3 | ApsaraDB RDS for PG: confirm pgvector extension is available on chosen tier | Blocks M2 matching | Infra |
| 4 | Sleptons brand launch timing: incubate under Nebutra umbrella first, or launch as independent brand at M1? | Marketing, domain | Brand |

---

*Document status: Approved for implementation planning.*
*Next step: Invoke writing-plans to create phased implementation plan.*
