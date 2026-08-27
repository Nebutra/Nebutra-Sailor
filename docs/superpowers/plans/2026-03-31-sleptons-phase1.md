# Sleptons Phase 1: Community Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the full flow work end-to-end with TDD and E2E: 注册登陆 → 申领许可证(含lookingFor字段) → 自动激活Sleptons成员 → 社区Gallery → 欢迎弹层 → 控制台

**Architecture:** Three surfaces changed in concert — Prisma schema gains 4 Sleptons tables, the license API gains profile auto-creation + community redirect, and a new `apps/community` Next.js 16 app serves the public gallery. All share `@nebutra/db` and Clerk auth. Server Components fetch from Prisma directly; client interactions go through Route Handlers.

**Tech Stack:** Next.js 16, Prisma 6 + pgvector (already enabled), Clerk auth, @nebutra/ui, Vitest + @vitejs/plugin-react (unit/integration), Playwright (E2E), Tailwind v4, pnpm workspaces, Turborepo

**Spec:** `docs/superpowers/specs/2026-03-31-sleptons-community-design.md`

---

## File Map

### Modified
| File | Change |
|------|--------|
| `packages/platform/db/prisma/schema.prisma` | Add 2 enums + 4 Sleptons models |
| `packages/platform/db/src/index.ts` | Export new model types |
| `apps/landing/src/app/api/license/route.ts` | Accept `lookingFor`, auto-create `sleptons_member_profiles`, return `communitySlug` |
| `apps/landing/src/app/[lang]/(marketing)/get-license/LicenseWizard.tsx` | Add lookingFor checkboxes to Step 3; update Step 4 redirect to community |
| `turbo.json` | Add `@nebutra/community` to build pipeline |

### Created — `apps/community`
| File | Responsibility |
|------|---------------|
| `apps/community/package.json` | App manifest, deps |
| `apps/community/next.config.ts` | Next.js 16 config |
| `apps/community/tsconfig.json` | TypeScript config |
| `apps/community/src/app/layout.tsx` | Root layout, ClerkProvider, fonts, tokens |
| `apps/community/src/app/page.tsx` | Gallery page (Server Component) |
| `apps/community/src/app/members/[slug]/page.tsx` | Public member profile (Server Component) |
| `apps/community/src/app/api/members/route.ts` | GET list + pagination |
| `apps/community/src/app/api/members/[slug]/route.ts` | GET single member |
| `apps/community/src/components/TierBadge.tsx` | v0/v1/v2/v∞ badge chip |
| `apps/community/src/components/MemberCard.tsx` | Profile card in gallery |
| `apps/community/src/components/MemberGallery.tsx` | Grid wrapper with filters |
| `apps/community/src/components/WelcomeOverlay.tsx` | First-visit welcome modal (Client) |
| `apps/community/src/lib/members.ts` | Prisma query helpers |
| `apps/community/src/lib/constants.ts` | LOOKING_FOR_OPTIONS, TECH_STACK_OPTIONS |

### Tests
| File | What it tests |
|------|--------------|
| `apps/landing/src/__tests__/api/license.test.ts` | License API: lookingFor field + sleptons profile creation |
| `apps/community/src/__tests__/api/members.test.ts` | Members API: list, filter, single member |
| `apps/community/src/__tests__/components/TierBadge.test.tsx` | Tier badge renders correct label/color |
| `apps/community/src/__tests__/components/MemberCard.test.tsx` | Card renders all fields |
| `apps/community/src/__tests__/components/WelcomeOverlay.test.tsx` | Overlay shows/hides on param |
| `e2e/sleptons-flow.spec.ts` | Playwright: full flow from gallery browse to welcome overlay |

---

## Task 1: Prisma — Enums

**Files:**
- Modify: `packages/platform/db/prisma/schema.prisma` (after the last existing enum, before the first model)

- [ ] **Step 1: Write the failing typecheck**

```bash
cd packages/db && pnpm typecheck
# Expected: PASS (baseline)
```

- [ ] **Step 2: Add enums to schema.prisma**

Append after the `NftStatus` enum block:

```prisma
enum SleptonsTier {
  V0
  V1
  V2
  V_INFINITY
  @@schema("public")
}

enum ProductStage {
  IDEA
  BUILDING
  LAUNCHED
  SCALING
  @@schema("public")
}
```

- [ ] **Step 3: Verify schema parses**

```bash
cd packages/db && pnpm prisma validate
# Expected: Schema is valid
```

- [ ] **Step 4: Commit**

```bash
git add packages/platform/db/prisma/schema.prisma
git commit -m "feat(db): add SleptonsTier and ProductStage enums"
```

---

## Task 2: Prisma — Sleptons Models

**Files:**
- Modify: `packages/platform/db/prisma/schema.prisma` (append at end of file)

- [ ] **Step 1: Append the four Sleptons models**

```prisma
// ============================================
// Sleptons Community
// ============================================

model SleptonsaMemberProfile {
  id                  String        @id @default(cuid())
  member_number       Int           @unique @default(autoincrement())
  user_id             String        @unique @map("user_id")
  license_id          String        @unique @map("license_id")
  slug                String        @unique
  display_name        String        @map("display_name")
  bio                 String?       @db.Text
  avatar_url          String?       @map("avatar_url")
  product_name        String?       @map("product_name")
  product_url         String?       @map("product_url")
  product_tagline     String?       @map("product_tagline")
  tech_stack          String[]      @map("tech_stack")
  looking_for         String[]      @map("looking_for")
  tier                SleptonsTier  @default(V0)
  is_public           Boolean       @default(true) @map("is_public")
  embedding           Unsupported("vector(1536)")?
  github_handle       String?       @map("github_handle")
  github_data         Json?         @map("github_data")
  github_refreshed_at DateTime?     @map("github_refreshed_at")
  created_at          DateTime      @default(now()) @map("created_at")
  updated_at          DateTime      @updatedAt @map("updated_at")

  license  License               @relation(fields: [license_id], references: [id])
  products SleptonsProduct[]
  following SleptonsConnection[] @relation("follower")
  followers SleptonsConnection[] @relation("following")

  @@index([tier, is_public])
  @@index([created_at])
  @@map("sleptons_member_profiles")
  @@schema("public")
}

model SleptonsProduct {
  id           String        @id @default(cuid())
  member_id    String        @map("member_id")
  name         String
  tagline      String
  description  String?       @db.Text
  url          String?
  github_url   String?       @map("github_url")
  thumbnail_url String?      @map("thumbnail_url")
  stage        ProductStage  @default(BUILDING)
  is_featured  Boolean       @default(false) @map("is_featured")
  featured_at  DateTime?     @map("featured_at")
  featured_week String?      @map("featured_week")
  created_at   DateTime      @default(now()) @map("created_at")

  member  SleptonsaMemberProfile @relation(fields: [member_id], references: [id], onDelete: Cascade)
  upvotes SleptonsUpvote[]

  @@index([member_id])
  @@index([is_featured, featured_week])
  @@map("sleptons_products")
  @@schema("public")
}

model SleptonsUpvote {
  member_id  String   @map("member_id")
  product_id String   @map("product_id")
  created_at DateTime @default(now()) @map("created_at")

  product SleptonsProduct @relation(fields: [product_id], references: [id], onDelete: Cascade)

  @@id([member_id, product_id])
  @@map("sleptons_upvotes")
  @@schema("public")
}

model SleptonsConnection {
  follower_id  String   @map("follower_id")
  following_id String   @map("following_id")
  created_at   DateTime @default(now()) @map("created_at")

  follower  SleptonsaMemberProfile @relation("follower",  fields: [follower_id],  references: [id], onDelete: Cascade)
  following SleptonsaMemberProfile @relation("following", fields: [following_id], references: [id], onDelete: Cascade)

  @@id([follower_id, following_id])
  @@map("sleptons_connections")
  @@schema("public")
}
```

- [ ] **Step 2: Add back-relation to License model**

Find the `License` model and add:
```prisma
  sleptonsProfile SleptonsaMemberProfile?
```

- [ ] **Step 3: Validate schema**

```bash
cd packages/db && pnpm prisma validate
# Expected: Schema is valid
```

- [ ] **Step 4: Commit**

```bash
git add packages/platform/db/prisma/schema.prisma
git commit -m "feat(db): add Sleptons community models (profiles, products, upvotes, connections)"
```

---

## Task 3: Prisma Migration

**Files:**
- Generate: `packages/platform/db/prisma/migrations/YYYYMMDD_sleptons_community/`

- [ ] **Step 1: Generate migration**

```bash
cd packages/db
pnpm prisma migrate dev --name sleptons_community
# Expected: Migration created, client regenerated
```

- [ ] **Step 2: Verify generated client includes new types**

```bash
grep -r "SleptonsaMemberProfile" packages/platform/db/src/generated/
# Expected: file found with the type
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/db && pnpm typecheck
# Expected: PASS
```

- [ ] **Step 4: Commit**

```bash
git add packages/platform/db/prisma/migrations/ packages/platform/db/src/generated/
git commit -m "feat(db): run Sleptons community migration"
```

---

## Task 4: Constants File + lookingFor in LicenseWizard

**Files:**
- Create: `apps/community/src/lib/constants.ts`
- Modify: `apps/landing/src/app/[lang]/(marketing)/get-license/LicenseWizard.tsx`

- [ ] **Step 1: Create constants.ts**

```typescript
// apps/community/src/lib/constants.ts
export const LOOKING_FOR_OPTIONS = [
  { value: "co-founder",       label: "Co-founder" },
  { value: "designer",         label: "Designer" },
  { value: "engineer",         label: "Engineer" },
  { value: "early-users",      label: "Early users" },
  { value: "angel-investor",   label: "Angel investor" },
  { value: "industry-advisor", label: "Industry advisor" },
  { value: "sales-ops",        label: "Sales / Ops" },
  { value: "nothing-solo",     label: "Nothing — solo is the plan" },
] as const

export type LookingForValue = typeof LOOKING_FOR_OPTIONS[number]["value"]

export const TECH_STACK_OPTIONS = [
  "Next.js", "React", "Vue", "Svelte", "Node.js", "Python", "Go", "Rust",
  "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "Vercel", "AWS", "Alibaba Cloud", "Docker",
  "OpenAI", "Anthropic", "LangChain",
  "Stripe", "WeChat Pay", "Alipay",
] as const

export type TechStackValue = typeof TECH_STACK_OPTIONS[number]
```

- [ ] **Step 2: Add lookingFor state to WizardStep3 interface in LicenseWizard.tsx**

Find `interface WizardStep3` and add `lookingFor: string[]`:

```typescript
interface WizardStep3 {
  tier: "INDIVIDUAL" | "OPC" | "STARTUP" | "ENTERPRISE" | null;
  githubHandle: string;
  twitterHandle: string;
  referralSource: "twitter" | "github" | "product_hunt" | "friend" | "search" | "other" | null;
  lookingFor: string[];  // ← add this
}
```

- [ ] **Step 3: Initialize lookingFor in useState**

Find `const [step3, setStep3] = useState<WizardStep3>({` and add:

```typescript
const [step3, setStep3] = useState<WizardStep3>({
  tier: null,
  githubHandle: "",
  twitterHandle: "",
  referralSource: null,
  lookingFor: [],  // ← add this
});
```

- [ ] **Step 4: Add lookingFor checkboxes to Step 3 JSX**

In the Step 3 JSX, before the GitHub username input, add:

```tsx
{/* Looking for — seeds Sleptons matching */}
<div>
  <label className="mb-3 block text-sm font-semibold text-[var(--neutral-12)]">
    What do you need most right now?
  </label>
  <div className="grid grid-cols-2 gap-2">
    {LOOKING_FOR_OPTIONS.map((opt) => (
      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          value={opt.value}
          checked={step3.lookingFor.includes(opt.value)}
          onChange={(e) => {
            setStep3((prev) => ({
              ...prev,
              lookingFor: e.target.checked
                ? [...prev.lookingFor, opt.value]
                : prev.lookingFor.filter((v) => v !== opt.value),
            }))
          }}
          className="h-4 w-4 rounded"
        />
        <span className="text-sm text-[var(--neutral-12)]">{opt.label}</span>
      </label>
    ))}
  </div>
</div>
```

Add the import at top: `import { LOOKING_FOR_OPTIONS } from "@nebutra/community/lib/constants"` — but since community app isn't a package, copy the LOOKING_FOR_OPTIONS array inline into LicenseWizard.tsx for now (DRY violation acceptable until community app is a shared package).

- [ ] **Step 5: Pass lookingFor in the fetch body**

In `handleSubmit`, add to the JSON body:

```typescript
lookingFor: step3.lookingFor,
```

- [ ] **Step 6: Update Step 4 redirect to community**

Replace the hardcoded `app.nebutra.com/dashboard` link in Step 4 with a redirect to the community page. After `setStep4({ licenseKey: data.license.licenseKey })`, add:

```typescript
// Redirect to Sleptons community welcome page
const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "http://localhost:3002"
setTimeout(() => {
  window.location.href = `${communityUrl}?welcome=true`
}, 2500) // short delay so user sees their license key
```

Also update Step 4 JSX button to show the pending redirect:

```tsx
<p className="text-sm text-[var(--neutral-11)]">
  Redirecting you to Sleptons community…
</p>
```

- [ ] **Step 7: Add NEXT_PUBLIC_COMMUNITY_URL to landing .env.local**

```bash
echo "NEXT_PUBLIC_COMMUNITY_URL=http://localhost:3002" >> apps/landing/.env.local
```

- [ ] **Step 8: Typecheck**

```bash
pnpm --filter @nebutra/landing typecheck
# Expected: PASS
```

- [ ] **Step 9: Commit**

```bash
git add apps/landing/ apps/community/src/lib/constants.ts
git commit -m "feat(license): add lookingFor field + Sleptons community redirect on license issue"
```

---

## Task 5: License API — auto-create Sleptons profile

**Files:**
- Modify: `apps/landing/src/app/api/license/route.ts`

- [ ] **Step 1: Write the failing test first**

Create `apps/landing/src/__tests__/api/license.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test_123" }),
}))

// Mock Prisma
const mockPrisma = {
  communityProfile: { upsert: vi.fn().mockResolvedValue({}) },
  license: { create: vi.fn().mockResolvedValue({
    id: "lic_1",
    licenseKey: "NEBUTRA-TEST-KEY",
    tier: "OPC",
    type: "FREE",
    expiresAt: null,
  })},
  sleptonsaMemberProfile: { create: vi.fn().mockResolvedValue({
    id: "smp_1",
    member_number: 42,
    slug: "test-user-42",
  })},
}

vi.mock("@nebutra/db", () => ({ prisma: mockPrisma }))

describe("POST /api/license", () => {
  beforeEach(() => vi.clearAllMocks())

  it("creates a sleptons_member_profile after license creation", async () => {
    const { POST } = await import("../app/api/license/route")
    const req = new Request("http://localhost/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "solo_developer",
        teamSize: "1",
        useCase: "saas",
        tier: "OPC",
        referralSource: "twitter",
        lookingFor: ["early-users", "angel-investor"],
        acceptedTerms: true,
      }),
    })
    const res = await POST(req as any)
    const data = await res.json()

    expect(data.success).toBe(true)
    expect(mockPrisma.sleptonsaMemberProfile.create).toHaveBeenCalledOnce()

    const createCall = mockPrisma.sleptonsaMemberProfile.create.mock.calls[0][0]
    expect(createCall.data.looking_for).toEqual(["early-users", "angel-investor"])
    expect(createCall.data.license_id).toBe("lic_1")
  })

  it("returns communityMemberNumber in response", async () => {
    const { POST } = await import("../app/api/license/route")
    const req = new Request("http://localhost/api/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "founder",
        teamSize: "1",
        useCase: "ai_tool",
        tier: "INDIVIDUAL",
        referralSource: "github",
        lookingFor: [],
        acceptedTerms: true,
      }),
    })
    const res = await POST(req as any)
    const data = await res.json()

    expect(data.community?.memberNumber).toBe(42)
    expect(data.community?.slug).toBe("test-user-42")
  })
})
```

- [ ] **Step 2: Set up Vitest in landing**

Add to `apps/landing/package.json` devDependencies:
```json
"vitest": "^2.0.0",
"@vitejs/plugin-react": "^4.0.0",
"@testing-library/react": "^16.0.0",
"@testing-library/jest-dom": "^6.0.0"
```

Create `apps/landing/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

Add test script to `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Run test — verify it FAILS**

```bash
pnpm --filter @nebutra/landing test
# Expected: FAIL — sleptonsaMemberProfile.create not called
```

- [ ] **Step 4: Update the Zod schema in route.ts**

Add `lookingFor` to `CreateLicenseSchema`:

```typescript
lookingFor: z.array(z.string()).default([]),
```

- [ ] **Step 5: Add slug generation helper in route.ts**

```typescript
function generateSlug(displayName: string, memberNumber: number): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40)
  return `${base}-${memberNumber}`
}
```

- [ ] **Step 6: Add Sleptons profile creation after license.create**

After the `prisma.license.create(...)` call, add:

```typescript
// Auto-create Sleptons community profile
const clerkUser = await clerkClient.users.getUser(userId)
const displayName =
  clerkUser.fullName ??
  clerkUser.username ??
  clerkUser.emailAddresses[0]?.emailAddress?.split("@")[0] ??
  "Founder"

// Temp member number via a two-step approach:
// Create with placeholder slug, then update with real number
const sleptonsProfile = await prisma.sleptonsaMemberProfile.create({
  data: {
    user_id: userId,
    license_id: license.id,
    slug: `${userId}-${Date.now()}`, // temp; updated below
    display_name: displayName,
    avatar_url: clerkUser.imageUrl ?? null,
    looking_for: data.lookingFor,
    github_handle: data.githubHandle ?? null,
    tech_stack: [],
  },
})

// Update slug with sequential member number
const finalSlug = generateSlug(displayName, sleptonsProfile.member_number)
await prisma.sleptonsaMemberProfile.update({
  where: { id: sleptonsProfile.id },
  data: { slug: finalSlug },
})
```

- [ ] **Step 7: Return community info in response**

Update the return JSON:
```typescript
return NextResponse.json({
  success: true,
  license: {
    id: license.id,
    licenseKey: license.licenseKey,
    tier: license.tier,
    type: license.type,
    expiresAt: license.expiresAt,
  },
  community: {
    memberNumber: sleptonsProfile.member_number,
    slug: finalSlug,
  },
})
```

Add `@clerk/nextjs` import:
```typescript
import { auth, clerkClient } from "@clerk/nextjs/server"
```

- [ ] **Step 8: Run test — verify it PASSES**

```bash
pnpm --filter @nebutra/landing test
# Expected: PASS — 2 tests passing
```

- [ ] **Step 9: Typecheck**

```bash
pnpm --filter @nebutra/landing typecheck
# Expected: PASS
```

- [ ] **Step 10: Commit**

```bash
git add apps/landing/
git commit -m "feat(license): auto-create Sleptons member profile on license issue"
```

---

## Task 6: Bootstrap apps/community

**Files:** All `apps/community/` root files

- [ ] **Step 1: Create package.json**

Create `apps/community/package.json`:
```json
{
  "name": "@nebutra/community",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@clerk/nextjs": "catalog:",
    "@nebutra/db": "workspace:*",
    "@nebutra/icons": "workspace:*",
    "@nebutra/tokens": "workspace:*",
    "@nebutra/ui": "workspace:*",
    "geist": "catalog:",
    "lucide-react": "catalog:",
    "next": "catalog:",
    "next-themes": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^24.0.0",
    "tailwindcss": "catalog:",
    "typescript": "catalog:",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts** (mirror landing pattern)

```typescript
// apps/community/next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@nebutra/ui", "@nebutra/tokens", "@nebutra/icons"],
}

export default nextConfig
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
```

Create `apps/community/src/__tests__/setup.ts`:
```typescript
import "@testing-library/jest-dom"
```

- [ ] **Step 5: Create root layout**

Create `apps/community/src/app/layout.tsx`:
```tsx
import "@nebutra/tokens/styles.css"
import "./globals.css"
import { ClerkProvider } from "@clerk/nextjs"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import type { ReactNode } from "react"

export const metadata = {
  title: "Sleptons — AI-native founders",
  description: "Where AI-native one-person companies are born, discovered, and scaled.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="bg-[var(--neutral-1)] text-[var(--neutral-12)]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
```

Create `apps/community/src/app/globals.css`:
```css
@import "@nebutra/tokens/styles.css";
@import "tailwindcss";
```

- [ ] **Step 6: Add to turbo.json pipeline**

In `turbo.json`, ensure `@nebutra/community` is included. The existing `"apps/*"` glob pattern should handle it automatically. Verify with:

```bash
pnpm turbo ls
# Expected: @nebutra/community appears in the list
```

- [ ] **Step 7: Install deps**

```bash
pnpm install
# Expected: community app deps installed
```

- [ ] **Step 8: Verify dev server starts**

```bash
pnpm --filter @nebutra/community dev &
sleep 5 && curl -s http://localhost:3002 | head -20
# Expected: HTML response (even if 404, means server is running)
kill %1
```

- [ ] **Step 9: Commit**

```bash
git add apps/community/
git commit -m "feat(community): bootstrap Sleptons community Next.js 16 app"
```

---

## Task 7: Members API + lib/members.ts

**Files:**
- Create: `apps/community/src/lib/members.ts`
- Create: `apps/community/src/app/api/members/route.ts`
- Create: `apps/community/src/__tests__/api/members.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/community/src/__tests__/api/members.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockMembers = [
  {
    id: "m1", member_number: 1, slug: "alice-1",
    display_name: "Alice", bio: "Building fintech",
    avatar_url: null, product_name: "FinFlow", product_tagline: "Finance for freelancers",
    tech_stack: ["Next.js", "PostgreSQL"], looking_for: ["early-users"],
    tier: "V1", is_public: true, created_at: new Date("2026-01-01"),
    github_handle: "alice", twitter_handle: null,
    products: [],
  },
]

vi.mock("@nebutra/db", () => ({
  prisma: {
    sleptonsaMemberProfile: {
      findMany: vi.fn().mockResolvedValue(mockMembers),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(mockMembers[0]),
    },
  },
}))

describe("GET /api/members", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns paginated list of public members", async () => {
    const { GET } = await import("../app/api/members/route")
    const req = new Request("http://localhost/api/members")
    const res = await GET(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.members).toHaveLength(1)
    expect(data.members[0].slug).toBe("alice-1")
    expect(data.total).toBe(1)
  })

  it("only returns is_public members", async () => {
    const { prisma } = await import("@nebutra/db")
    const { GET } = await import("../app/api/members/route")
    await GET(new Request("http://localhost/api/members") as any)

    const findManyCall = (prisma.sleptonsaMemberProfile.findMany as any).mock.calls[0][0]
    expect(findManyCall.where).toMatchObject({ is_public: true })
  })
})
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
pnpm --filter @nebutra/community test
# Expected: FAIL — module not found
```

- [ ] **Step 3: Create lib/members.ts**

```typescript
// apps/community/src/lib/members.ts
import { prisma } from "@nebutra/db"

export const MEMBERS_PAGE_SIZE = 24

export async function getPublicMembers(opts: {
  page?: number
  tier?: string
  lookingFor?: string
}) {
  const { page = 1, tier, lookingFor } = opts
  const skip = (page - 1) * MEMBERS_PAGE_SIZE

  const where = {
    is_public: true,
    ...(tier ? { tier: tier as any } : {}),
    ...(lookingFor ? { looking_for: { has: lookingFor } } : {}),
  }

  const [members, total] = await Promise.all([
    prisma.sleptonsaMemberProfile.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: MEMBERS_PAGE_SIZE,
      skip,
      include: { products: { take: 1, orderBy: { created_at: "desc" } } },
    }),
    prisma.sleptonsaMemberProfile.count({ where }),
  ])

  return { members, total, page, pageSize: MEMBERS_PAGE_SIZE }
}

export async function getMemberBySlug(slug: string) {
  return prisma.sleptonsaMemberProfile.findUnique({
    where: { slug, is_public: true },
    include: { products: { orderBy: { created_at: "desc" } } },
  })
}
```

- [ ] **Step 4: Create /api/members/route.ts**

```typescript
// apps/community/src/app/api/members/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { getPublicMembers } from "@/lib/members"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get("page") ?? "1")
  const tier = searchParams.get("tier") ?? undefined
  const lookingFor = searchParams.get("lookingFor") ?? undefined

  try {
    const result = await getPublicMembers({ page, tier, lookingFor })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run tests — verify PASS**

```bash
pnpm --filter @nebutra/community test
# Expected: PASS — 2 tests
```

- [ ] **Step 6: Commit**

```bash
git add apps/community/src/lib/ apps/community/src/app/api/ apps/community/src/__tests__/
git commit -m "feat(community): add members API with pagination and filtering"
```

---

## Task 8: TierBadge + MemberCard Components

**Files:**
- Create: `apps/community/src/components/TierBadge.tsx`
- Create: `apps/community/src/components/MemberCard.tsx`
- Create: `apps/community/src/__tests__/components/TierBadge.test.tsx`
- Create: `apps/community/src/__tests__/components/MemberCard.test.tsx`

- [ ] **Step 1: Write TierBadge tests**

```typescript
// apps/community/src/__tests__/components/TierBadge.test.tsx
import { render, screen } from "@testing-library/react"
import { TierBadge } from "@/components/TierBadge"

describe("TierBadge", () => {
  it("renders v0 label for V0 tier", () => {
    render(<TierBadge tier="V0" />)
    expect(screen.getByText("v0")).toBeInTheDocument()
  })

  it("renders v∞ for V_INFINITY tier", () => {
    render(<TierBadge tier="V_INFINITY" />)
    expect(screen.getByText("v∞")).toBeInTheDocument()
  })

  it("applies correct color class for each tier", () => {
    const { container: c1 } = render(<TierBadge tier="V2" />)
    expect(c1.firstChild).toHaveClass("bg-[var(--blue-3)]")
  })
})
```

- [ ] **Step 2: Run TierBadge tests — verify FAIL**

```bash
pnpm --filter @nebutra/community test
# Expected: FAIL
```

- [ ] **Step 3: Implement TierBadge**

```tsx
// apps/community/src/components/TierBadge.tsx
const TIER_CONFIG = {
  V0:         { label: "v0",  className: "bg-[var(--neutral-3)] text-[var(--neutral-11)]" },
  V1:         { label: "v1 ⚡", className: "bg-[var(--blue-3)] text-[var(--blue-9)]" },
  V2:         { label: "v2 🚀", className: "bg-[var(--blue-3)] text-[var(--blue-9)]" },
  V_INFINITY: { label: "v∞ 🦄", className: "bg-gradient-to-r from-[var(--blue-3)] to-[var(--cyan-3)] text-[var(--blue-9)]" },
} as const

type Tier = keyof typeof TIER_CONFIG

export function TierBadge({ tier }: { tier: Tier }) {
  const { label, className } = TIER_CONFIG[tier]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Write MemberCard tests**

```typescript
// apps/community/src/__tests__/components/MemberCard.test.tsx
import { render, screen } from "@testing-library/react"
import { MemberCard } from "@/components/MemberCard"

const mockMember = {
  id: "m1", member_number: 42, slug: "alice-42",
  display_name: "Alice", bio: "Building fintech",
  avatar_url: null, product_name: "FinFlow",
  product_tagline: "Finance for freelancers",
  tech_stack: ["Next.js"], looking_for: ["early-users"],
  tier: "V1" as const, is_public: true,
  github_handle: "alice", created_at: new Date(),
  products: [],
}

describe("MemberCard", () => {
  it("renders member name and product tagline", () => {
    render(<MemberCard member={mockMember} />)
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Finance for freelancers")).toBeInTheDocument()
  })

  it("shows member number", () => {
    render(<MemberCard member={mockMember} />)
    expect(screen.getByText(/#42/)).toBeInTheDocument()
  })

  it("renders looking_for tags", () => {
    render(<MemberCard member={mockMember} />)
    expect(screen.getByText(/early-users/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Implement MemberCard**

```tsx
// apps/community/src/components/MemberCard.tsx
import Link from "next/link"
import { TierBadge } from "./TierBadge"
import { Github } from "lucide-react"

type Tier = "V0" | "V1" | "V2" | "V_INFINITY"

interface MemberCardProps {
  member: {
    member_number: number
    slug: string
    display_name: string
    bio?: string | null
    avatar_url?: string | null
    product_name?: string | null
    product_tagline?: string | null
    tech_stack: string[]
    looking_for: string[]
    tier: Tier
    github_handle?: string | null
    created_at: Date
    products: { name: string; tagline: string }[]
  }
}

export function MemberCard({ member }: MemberCardProps) {
  const initials = member.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Link
      href={`/members/${member.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-5 transition-all hover:border-[var(--blue-9)] hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--blue-3)] text-sm font-semibold text-[var(--blue-9)]">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-[var(--neutral-12)]">{member.display_name}</p>
          </div>
        </div>
        <TierBadge tier={member.tier} />
      </div>

      {/* Product tagline */}
      {member.product_tagline && (
        <p className="text-sm text-[var(--neutral-11)] line-clamp-2">
          "{member.product_tagline}"
        </p>
      )}

      {/* Tags */}
      {member.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {member.tech_stack.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-[var(--neutral-3)] px-2 py-0.5 text-xs text-[var(--neutral-11)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Looking for */}
      {member.looking_for.length > 0 && (
        <p className="text-xs text-[var(--neutral-11)]">
          🔍 {member.looking_for.slice(0, 2).join(" · ")}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 text-xs text-[var(--neutral-11)]">
        <div className="flex items-center gap-2">
          {member.github_handle && (
            <span className="flex items-center gap-1">
              <Github className="h-3 w-3" />
              {member.github_handle}
            </span>
          )}
        </div>
        <span>Member #{member.member_number}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 6: Run tests — verify PASS**

```bash
pnpm --filter @nebutra/community test
# Expected: PASS — 6 tests
```

- [ ] **Step 7: Commit**

```bash
git add apps/community/src/components/ apps/community/src/__tests__/components/
git commit -m "feat(community): add TierBadge and MemberCard components with tests"
```

---

## Task 9: WelcomeOverlay + Gallery Page

**Files:**
- Create: `apps/community/src/components/WelcomeOverlay.tsx`
- Create: `apps/community/src/app/page.tsx`
- Create: `apps/community/src/__tests__/components/WelcomeOverlay.test.tsx`

- [ ] **Step 1: Write WelcomeOverlay tests**

```typescript
// apps/community/src/__tests__/components/WelcomeOverlay.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { WelcomeOverlay } from "@/components/WelcomeOverlay"

describe("WelcomeOverlay", () => {
  it("renders member number when visible", () => {
    render(<WelcomeOverlay memberNumber={42} />)
    expect(screen.getByText(/member #42/i)).toBeInTheDocument()
  })

  it("shows welcome message", () => {
    render(<WelcomeOverlay memberNumber={1} />)
    expect(screen.getByText(/welcome/i)).toBeInTheDocument()
  })

  it("calls onClose when dismiss button clicked", () => {
    const onClose = vi.fn()
    render(<WelcomeOverlay memberNumber={1} onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: /explore/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
pnpm --filter @nebutra/community test
# Expected: FAIL
```

- [ ] **Step 3: Implement WelcomeOverlay**

```tsx
// apps/community/src/components/WelcomeOverlay.tsx
"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface WelcomeOverlayProps {
  memberNumber: number
  onClose?: () => void
}

export function WelcomeOverlay({ memberNumber, onClose }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(true)

  const handleClose = () => {
    setVisible(false)
    onClose?.()
    // Remove ?welcome param from URL without reload
    const url = new URL(window.location.href)
    url.searchParams.delete("welcome")
    window.history.replaceState({}, "", url.toString())
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-[var(--neutral-7)] bg-[var(--neutral-1)] p-8 text-center shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close welcome"
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--neutral-11)] hover:bg-[var(--neutral-3)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 text-4xl">🎉</div>

        <h2 className="mb-2 text-2xl font-bold text-[var(--neutral-12)]">
          Welcome to Sleptons!
        </h2>

        <p className="mb-1 text-[var(--neutral-11)]">You are</p>
        <p className="mb-6 text-3xl font-bold" style={{ background: "var(--brand-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Sleptons Member #{memberNumber}
        </p>

        <p className="mb-6 text-sm text-[var(--neutral-11)]">
          Your profile is now live. AI-native founders around the world can discover you.
        </p>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg px-6 py-3 font-semibold text-white"
          style={{ background: "var(--brand-gradient)" }}
        >
          Explore the Community →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create Gallery page (Server Component + Client shell)**

```tsx
// apps/community/src/app/page.tsx
import { Suspense } from "react"
import { getPublicMembers } from "@/lib/members"
import { MemberCard } from "@/components/MemberCard"
import { WelcomeOverlayShell } from "@/components/WelcomeOverlayShell"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ welcome?: string; page?: string; tier?: string; lookingFor?: string }>
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const params = await searchParams
  const isWelcome = params.welcome === "true"
  const page = Number(params.page ?? "1")

  const { members, total, pageSize } = await getPublicMembers({
    page,
    tier: params.tier,
    lookingFor: params.lookingFor,
  })

  return (
    <>
      {/* Welcome overlay — only renders client-side when ?welcome=true */}
      {isWelcome && <WelcomeOverlayShell />}

      <main className="mx-auto max-w-[1400px] px-4 py-12 md:px-6">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-bold tracking-tight text-[var(--neutral-12)]">
            SLEPTONS
          </h1>
          <p className="mb-6 text-lg text-[var(--neutral-11)]">
            AI-native founders. One person. Infinite potential.
          </p>
          <div className="flex justify-center gap-8 text-sm text-[var(--neutral-11)]">
            <span><strong className="text-[var(--neutral-12)]">{total}</strong> founders</span>
          </div>
        </div>

        {/* Gallery grid */}
        <Suspense fallback={<div className="text-center text-[var(--neutral-11)]">Loading...</div>}>
          {members.length === 0 ? (
            <div className="py-24 text-center text-[var(--neutral-11)]">
              No members found. Be the first →
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((member) => (
                <MemberCard key={member.id} member={member as any} />
              ))}
            </div>
          )}
        </Suspense>
      </main>
    </>
  )
}
```

Create `WelcomeOverlayShell` — a thin client wrapper that reads member number from localStorage (set by license page on redirect):

```tsx
// apps/community/src/components/WelcomeOverlayShell.tsx
"use client"

import { useEffect, useState } from "react"
import { WelcomeOverlay } from "./WelcomeOverlay"

export function WelcomeOverlayShell() {
  const [memberNumber, setMemberNumber] = useState<number | null>(null)

  useEffect(() => {
    const num = localStorage.getItem("sleptons_member_number")
    if (num) setMemberNumber(Number(num))
  }, [])

  if (!memberNumber) return null
  return (
    <WelcomeOverlay
      memberNumber={memberNumber}
      onClose={() => localStorage.removeItem("sleptons_member_number")}
    />
  )
}
```

Update LicenseWizard Step 4 (before the redirect) to store the member number:
```typescript
// In handleSubmit, after receiving response:
if (data.community?.memberNumber) {
  localStorage.setItem("sleptons_member_number", String(data.community.memberNumber))
}
```

- [ ] **Step 5: Run all tests — verify PASS**

```bash
pnpm --filter @nebutra/community test
# Expected: PASS — 9+ tests
```

- [ ] **Step 6: Typecheck community app**

```bash
pnpm --filter @nebutra/community typecheck
# Expected: PASS
```

- [ ] **Step 7: Commit**

```bash
git add apps/community/ apps/landing/
git commit -m "feat(community): add Gallery page and WelcomeOverlay with full flow"
```

---

## Task 10: E2E Tests (Playwright)

**Files:**
- Create: `e2e/sleptons-flow.spec.ts`
- Modify: `playwright.config.ts` (add community app base URL)

> **Prerequisites:** Both `apps/landing` (port 3000) and `apps/community` (port 3002) must be running locally.

- [ ] **Step 1: Check Playwright is installed**

```bash
ls e2e/ 2>/dev/null || echo "no e2e dir"
cat playwright.config.ts 2>/dev/null | head -20
# If no playwright.config.ts exists, install first:
# pnpm add -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Add community URL to playwright.config.ts**

In the `webServer` array (or `use.baseURL`), ensure the community app is covered:

```typescript
// In playwright.config.ts webServer array, add:
{
  command: "pnpm --filter @nebutra/community dev",
  url: "http://localhost:3002",
  reuseExistingServer: !process.env.CI,
}
```

- [ ] **Step 3: Write E2E tests**

Create `e2e/sleptons-flow.spec.ts`:

```typescript
import { test, expect } from "@playwright/test"

const COMMUNITY_URL = "http://localhost:3002"
const LANDING_URL = "http://localhost:3000"

test.describe("Sleptons Community Gallery", () => {
  test("gallery page loads and shows member count", async ({ page }) => {
    await page.goto(COMMUNITY_URL)
    await expect(page.getByText("SLEPTONS")).toBeVisible()
    await expect(page.getByText(/founders/)).toBeVisible()
  })

  test("gallery grid renders member cards", async ({ page }) => {
    await page.goto(COMMUNITY_URL)
    // Allow empty state (cold start) OR member cards
    const hasCards = await page.locator("a[href^='/members/']").count()
    const hasEmpty = await page.getByText(/no members found/i).count()
    expect(hasCards + hasEmpty).toBeGreaterThan(0)
  })
})

test.describe("Welcome Overlay", () => {
  test("welcome overlay appears when ?welcome=true + memberNumber in localStorage", async ({ page }) => {
    // Set localStorage before navigating
    await page.goto(COMMUNITY_URL)
    await page.evaluate(() => {
      localStorage.setItem("sleptons_member_number", "42")
    })

    await page.goto(`${COMMUNITY_URL}?welcome=true`)
    await expect(page.getByText("SLEPTONS")).toBeVisible() // page loads
    await expect(page.getByText(/Member #42/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Welcome to Sleptons/)).toBeVisible()
  })

  test("overlay dismisses on button click", async ({ page }) => {
    await page.goto(COMMUNITY_URL)
    await page.evaluate(() => {
      localStorage.setItem("sleptons_member_number", "7")
    })

    await page.goto(`${COMMUNITY_URL}?welcome=true`)
    await page.getByRole("button", { name: /explore/i }).click()
    await expect(page.getByText(/Welcome to Sleptons/)).not.toBeVisible()
  })

  test("URL no longer contains ?welcome after dismiss", async ({ page }) => {
    await page.goto(COMMUNITY_URL)
    await page.evaluate(() => {
      localStorage.setItem("sleptons_member_number", "7")
    })

    await page.goto(`${COMMUNITY_URL}?welcome=true`)
    await page.getByRole("button", { name: /explore/i }).click()
    await expect(page).not.toHaveURL(/welcome=true/)
  })
})

test.describe("License Flow → Community Redirect", () => {
  // This test requires a running landing and a real (or test) Clerk account.
  // Skip in CI unless CLERK_TEST_USER_ID is set.
  test.skip(
    !process.env.CLERK_TEST_USER_ID,
    "Requires real Clerk test user — set CLERK_TEST_USER_ID to enable"
  )

  test("completing license wizard redirects to community with welcome overlay", async ({ page }) => {
    // This is an integration E2E — assumes user is already logged in via Clerk test token
    await page.goto(`${LANDING_URL}/en/get-license`)
    await expect(page.getByText(/Tell us about yourself/i)).toBeVisible()

    // Step 1: role + team size
    await page.getByText("Solo Developer").click()
    await page.getByLabel("Just me (1)").check()
    await page.getByRole("button", { name: /next/i }).click()

    // Step 2: use case
    await page.getByText("AI Tool / Copilot").click()
    await page.getByRole("button", { name: /next/i }).click()

    // Step 3: tier + looking for
    await page.getByText("OPC Free License").click()
    await page.getByLabel("Early users").check()
    await page.getByLabel(/twitter/i).selectOption("twitter")
    await page.getByRole("button", { name: /get license/i }).click()

    // Step 4: should show license key then redirect
    await expect(page.getByText(/Redirecting you to Sleptons/i)).toBeVisible({ timeout: 10000 })

    // Should land on community with welcome overlay
    await page.waitForURL(`${COMMUNITY_URL}/**`, { timeout: 10000 })
    await expect(page.getByText(/Welcome to Sleptons/i)).toBeVisible({ timeout: 5000 })
  })
})
```

- [ ] **Step 4: Run E2E tests (gallery + overlay, skip auth flow)**

```bash
# Start both apps in background, then run tests
pnpm --filter @nebutra/community dev &
COMMUNITY_PID=$!
sleep 5

npx playwright test e2e/sleptons-flow.spec.ts --project=chromium
kill $COMMUNITY_PID

# Expected:
# ✓ gallery page loads and shows member count
# ✓ gallery grid renders member cards
# ✓ welcome overlay appears
# ✓ overlay dismisses on button click
# ✓ URL no longer contains ?welcome after dismiss
# ~ license flow test (skipped — no CLERK_TEST_USER_ID)
```

- [ ] **Step 5: Commit**

```bash
git add e2e/sleptons-flow.spec.ts playwright.config.ts
git commit -m "test(e2e): add Sleptons community flow Playwright tests"
```

---

## Final Verification

- [ ] **Full flow manual smoke test**

```bash
# Terminal 1
pnpm --filter @nebutra/landing dev

# Terminal 2
pnpm --filter @nebutra/community dev
```

1. Open `http://localhost:3000/en/get-license`
2. Complete all 4 wizard steps including lookingFor checkboxes
3. Observe Step 4 shows "Redirecting you to Sleptons community…"
4. After 2.5s, browser navigates to `http://localhost:3002?welcome=true`
5. Welcome overlay appears with "Sleptons Member #N"
6. Click "Explore" — overlay dismisses, URL loses `?welcome=true`
7. Your member card appears in the gallery

- [ ] **Full test suite**

```bash
pnpm --filter @nebutra/landing test
pnpm --filter @nebutra/community test
npx playwright test e2e/sleptons-flow.spec.ts
# Expected: all unit/integration tests green; 5 E2E tests green (1 skipped)
```

- [ ] **Typecheck all modified apps**

```bash
pnpm --filter @nebutra/landing typecheck
pnpm --filter @nebutra/community typecheck
pnpm --filter @nebutra/db typecheck
# Expected: all PASS
```

- [ ] **Final commit**

```bash
git add .
git commit -m "feat: Sleptons Phase 1 complete — community flow end-to-end"
```

---

## Environment Variables Checklist

Before starting, ensure these are set in the respective `.env.local` files:

**`apps/landing/.env.local`**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
DATABASE_URL=postgresql://...
NEXT_PUBLIC_COMMUNITY_URL=http://localhost:3002
```

**`apps/community/.env.local`**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...    # Same key as landing
CLERK_SECRET_KEY=sk_...
DATABASE_URL=postgresql://...               # Same DB as landing
```
