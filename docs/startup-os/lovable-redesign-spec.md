# Startup OS → Lovable-grade Workspace Redesign — Implementation Spec

Status: derived from workflow `wjpnosn84` (2026-06-05). Execute step-by-step; match by
CONTENT not line numbers (the file shifts under concurrent edits + rebases).

## User mandate (non-negotiable)
1. The workspace container must NOT scroll — fixed full-height app shell, only inner panels scroll.
2. Mirror Lovable's layout / state-management / aesthetic.
3. Delete ALL mock/placeholder UI — honest empty states only, never fake data.
4. NO hand-crafting — every interactive/structural element uses `@nebutra/ui/primitives` (or `/components`) + `@nebutra/tokens` + `AnimateIn`.
5. NO borders/rings/branch-lines between layout regions — separate via background tint + spacing. (Intra-panel card borders may stay.)

## Verified primitive APIs (real, grounded — safe to use)
- **Button** (`@nebutra/ui/primitives`): `variant` = default | ink | destructive | outline | secondary | ghost | link | warning; `size` = tiny | sm | default | lg | icon; `shape` = default | square | circle.
- **Badge** (`@nebutra/ui/primitives`, `type BadgeProps`): `variant` = default | secondary | destructive | outline | success | warning | blue-subtle (+ *-subtle family); `size` = sm | md | lg.
- **Tabs** (`@nebutra/ui/primitives`): `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`. `Tabs` props: `value`, `onValueChange?: (value: string, eventDetails) => void` (MUST wrap: `onValueChange={(v) => setActiveSurface(v as typeof activeSurface)}`), `variant` = default|button|line|secondary, `shape` = default|pill. `TabsTrigger` has `icon`/`badge` props.

## Already done (committed)
- Workspace `<section>` pinned `h-[100dvh]` → workspace no longer scrolls (`37d60b28`). main scrollH===clientH verified.
- Preview de-mock: fake "Live preview runs in the sandbox runtime" badge removed (`3c98eb4e`).

## Ordered steps (remaining)
- **STEP 1 — scroll shell (HOME branch still scrolls):** root div `relative h-full min-h-0` → `relative h-[100dvh] min-h-0 overflow-hidden`; the bare wrapper `<div>` around the workspace branch → `<div className="h-full min-h-0">`; StartupBuilderHome `<section ... min-h-screen ...>` → `relative flex h-full min-h-0 flex-col overflow-hidden bg-neutral-1 text-neutral-12`; its inner centered column `mx-auto flex min-h-screen ...` → `relative mx-auto flex min-h-0 flex-1 w-full max-w-5xl flex-col justify-center overflow-y-auto px-5 py-16 sm:px-8`.
- **STEP 2 — chat height:** `startup-chat-panel.tsx` AnimateIn `preset="emerge"` → add `className="h-full min-h-0"`.
- **STEP 3 — imports:** command-center: `import { Badge, Button, Tabs, TabsList, TabsTrigger, type BadgeProps } from "@nebutra/ui/primitives";`. chat-panel: `import { Badge, Button } from "@nebutra/ui/primitives";`. code-view: `import { Button } from "@nebutra/ui/primitives";`.
- **STEP 4 — command-center primitive swaps:** error toast → `<Badge variant="destructive" size="md" className="absolute left-4 top-4 z-20 shadow-sm">`; hero badge span → `<Badge variant="outline" size="md" icon={<Lightning .../>}>Startup Agent OS</Badge>`; attach btn → `<Button variant="outline" shape="circle" size="default">`; submit/build btn → `<Button variant="ink" shape="circle" size="default">`; suggestion chips → `<Button variant="outline" size="sm" className="rounded-full">`; project recent-cards → `<Button variant="ghost" className="h-auto w-full justify-start rounded-2xl p-3 text-left">`; stage badge → `<Badge variant={pending_review?"warning":"secondary"} size="sm">`; approve btn → `<Button variant="warning" size="sm" className="rounded-full">`; execute icon btn → `<Button variant="ink" shape="circle" size="default">`; **surface switcher** (Code/Canvas/Chat) → `<Tabs value={activeSurface} onValueChange={(v)=>setActiveSurface(v as typeof activeSurface)}><TabsList><TabsTrigger value="code" icon={<Code/>}>Code</TabsTrigger>...` (drop the rounded-full border wrapper); file-count → `<Badge variant="secondary" size="sm">`; Save-file → `<Button variant="ink" size="sm" className="rounded-full">`; artifact/run rows → `<Button variant="ghost" size="tiny" className={cn("h-auto w-full justify-between px-2.5 py-2", selected && "bg-blue-3 text-blue-12 dark:bg-blue-9/20 dark:text-blue-5")}>`; file-tab bar → `<Tabs variant="secondary" value={selectedFile?.path ?? ""} onValueChange={(v)=>onSelectFile(v)}><TabsList className="...bg-neutral-2 p-1.5 overflow-x-auto">{files.map(...TabsTrigger)}`; Spatial-graph span → `<Badge variant="blue-subtle" size="sm">`; canvas execute → `<Button variant="ink" size="sm" className="mt-3 w-full">`; kind badge → `<Badge variant="outline" size="sm" className="shrink-0">`; CanvasNodeButton selected `ring-2 ring-blue-8 ring-offset-2 ...` → `outline outline-2 outline-offset-2 outline-blue-8 dark:outline-blue-5`; **StatusPill** body → `const variantMap: Record<string, BadgeProps["variant"]> = { completed:"success", failed:"destructive", waiting_for_review:"warning", planned:"secondary" }; return <Badge variant={variantMap[status] ?? "secondary"} size="sm">{formatRunStatus(status)}</Badge>`.
- **STEP 5 — chat-panel swaps:** suggestion chips → `<Button variant="outline" size="sm" className="rounded-full">`; file-count badge → `<Badge variant="secondary" size="sm" className="tabular-nums">`; Stop btn → `<Button variant="outline" size="sm" className="rounded-full"><StopFill/>Stop</Button>`.
- **STEP 6 — code-view swaps:** Save → `<Button variant="ink" size="sm" className="rounded-full">`; Done → `<Button variant="ghost" size="sm" className="rounded-full">`; Edit → `<Button variant="ghost" size="sm" className="rounded-full">`. Wrap the isEditing toolbar block in `<AnimateIn preset="fade">`.
- **STEP 7 — command-center de-mock copy:** "persisted API event(s)." → "recorded action(s)." (use `activityCount !== 1`); "Select a run to approve or execute through the governed API." → "Select an action below to continue building your startup."; "Persisted workspace" → "Your workspace"; "Select a persisted file to edit the app." → "Select a file to begin editing."; "Select a persisted file from the workspace." → "Select a file to start editing."; delete `<span>iframe srcDoc / no deploy</span>`; "Preview is unavailable until the project API returns persisted files." → "Preview will appear once the project generates files."
- **STEP 8 — aesthetic tokens:** `rounded-[30px]`→`rounded-3xl`; `rounded-[20px]`/`rounded-[22px]`→`rounded-2xl`; `rounded-[12px]`→`rounded-xl`; `tracking-[-0.06em]`/`tracking-[-0.02em]`/`tracking-[-0.01em]`→`tracking-tight`; `tracking-[0.12em]`/`tracking-[0.14em]`→`tracking-widest`; `opacity-[0.12]`→`opacity-10`; `dark:bg-blue-9/18`→`dark:bg-blue-9/20`; prompt-box `shadow-lg shadow-neutral-12/5` → inline `style={{ boxShadow: "0 4px 24px -4px color-mix(in srgb, var(--neutral-12) 6%, transparent)" }}`.
- **STEP 9 — remove panel border separators:** drop every layout-region `border-r/-b/-t/-l border-neutral-6` (aside↔main, toolbar↔content, header↔body, footer). Replace with bg tonal shift: left aside `bg-neutral-1`, main content `bg-neutral-2/40`, tab toolbar `bg-neutral-2`, canvas `bg-neutral-2`, editor `bg-neutral-1`. Keep intra-panel card borders + error badge.
- **STEP 10 — chat written-file badge:** `borderColor: "hsl(var(--success) / 0.25)"` → `border-success/25` (or `color-mix(in srgb, var(--status-success) 25%, transparent)`).
- **STEP 11 — file-tree:** wrap empty-state `<p>` in `<AnimateIn preset="fade">` (import from `@nebutra/ui/components`).
- **STEP 12 — files.ts iframe tokens:** add `IFRAME-TOKEN-SNAPSHOT` comment above the `:root` block; fix `--brand-gradient` to `linear-gradient(135deg, #0033fe 0%, #0bf1c3 100%)`.
- **STEP 13 — verify:** `pnpm --filter @nebutra/web typecheck` + `pnpm lint` (lint-no-raw-inputs + phosphor-marketing-only). Fix Tabs onValueChange wrap.

## Round 2 — Lovable chrome (from user screenshots, 2026-06-05)

DONE: Preview is its own full-width top tab (Preview|Code|Canvas|Chat), Code = file
tree + editor only (no preview split) — commit `6322c412`. Thread header compacted to
one row (name + StatusPill), promise paragraph + dividers removed — commit `0352cabc`.

PENDING — a cohesive single-top-bar chrome redesign (do in a fresh context; touches the
SHARED `design-system-shell.tsx` + cross-component state — coordinate with the other
session that owns sidebar collapse):
- **Hide the dashboard sidebar in startup-os + merge its collapse toggle into the
  thread-header logo.** The shell exposes `const { collapsed, toggle } = useSidebar()`
  (`design-system-shell.tsx:144`); for `isStartupOSRoute`, default the dashboard sidebar
  hidden/collapsed and let the Nebutra logo at the top of the thread panel call `toggle`
  (Lovable hamburger pattern). Verify `useSidebar` is exported + its provider wraps the
  startup-os route before wiring it into command-center.
- **Unified single top bar (Lovable model):** one horizontal bar — LEFT: logo/toggle +
  project-name with a `⌄` **DropdownMenu** (real actions only — back to projects, rename
  if an API exists, details; NO mock credits/settings/upgrade) + StatusPill; the view Tabs
  (Preview|Code|Canvas|Chat). CENTER: a route/preview selector (`/`, `/api/...`) like
  Lovable's. RIGHT: real actions (e.g. Build/Share-equivalent). Collapse the now-redundant
  second sub-header ("Code and preview / N files / Select a file…") into this single bar —
  that two-row stack is the remaining "冗余" the user flagged.
- **"Code and preview" sub-header label** is stale now that Preview is a separate tab —
  drop it or make it view-aware ("Code" vs "Live preview").
- **Merge Chat INTO the Thread panel; remove the Chat tab.** The left thread aside and the
  right Chat surface are redundant (both conversational). Remove `"chat"` from
  `activeSurface` + its TabsTrigger + surface div (tabs become Preview|Code|Canvas). Move
  `StartupChatPanel`'s strengths into the left thread aside footer: the prompt input
  ("再加一个定价页、把 hero 改成品牌渐变、生成 README…"), suggestion chips, streaming PLAN
  narration, attach/connectors row, and `onCancel` — replacing the current "N recorded
  actions / Build" footer box. The thread list (Proposition/CompanyContext/runs) stays as
  the message history above the input. One unified conversational column, Lovable-style.
- **Full de-mock sweep (reiterated):** audit every startup-os surface again; any placeholder/
  fake/coming-soon UI must go (honest empty states only). Run the discovery workflow's
  mockUi list to completion.

## Notes
- Implement single-threaded, commit per file/chunk (`git commit -- <file>`) to avoid clobbering the concurrent session on command-center.
- biome shim (`node_modules/.bin/biome`) is periodically rewritten broken by the other session's worktree pnpm install — re-patch its exec path to absolute (or use `node_modules/@biomejs/cli-darwin-arm64/biome`) if commits fail at biome-check. See [[project-worktree-pnpm-corrupts-main-node-modules]].
