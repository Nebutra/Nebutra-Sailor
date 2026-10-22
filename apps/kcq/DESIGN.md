# KCQ workbench interface contract

The product is a chart workspace. Account and workspace selection occupy the
native `toolbar-start` slot; there is one 40px toolbar, not a second navigation
row. Drawing controls remain on the left, Agent on the right. Preserve the
canonical chart's interactions and density. Do not clone its toolbar or query
its DOM to inject controls.

The account menu uses Nebutra's public canonical Avatar and DropdownMenu.
One trigger reveals identity, workspace membership and account actions.
Keep the active workspace name short with truncation. On narrow viewports,
keep the avatar trigger and omit its label; chart controls scroll independently.
Keyboard navigation, Escape dismissal and focus return belong to the shared
primitive. Navigation is a small React island with an explicit Vue lifecycle;
authentication and chart lifecycle stay in their respective adapters.

KCQ owns the palette. Consume the chart's resolved `--klc-color-ui-*` variables
on body, including light, dark and custom presets. Map shared component colour
semantics to these tokens in styles.css. Never override chart colours with a
second neutral palette. Geist is bundled locally with the shared CJK fallbacks.
Use 13px navigation, 14px menu identity and 16px empty-state guidance. Controls
are 30px, avatars 24px and action icons 16px. Use semantic radius tokens.

No large KCQ wordmark, decorative captions, status strip, onboarding cards or
marketing gradients. Empty state is one instruction; errors show actionable
provider feedback. State must reflect actual controller data and disappear
when data arrives. Do not fabricate prices, connector health or cloud sync.

The empty chart may offer compact market shortcuts below its one instruction.
Show them only before any instrument is selected; never replace a restored
layout. A pending catalog lookup offers cancellation, and a failed bar request
offers an explicit retry. Research guidance and feedback live in shared dialogs,
opened from the account menu or empty state, without another toolbar row.
Feedback diagnostics are optional and reviewable before opening a public draft.
Feedback fields keep the shared Textarea growth and scrolling behavior, without
a native resize handle.
Configure controls through shared variants, label/error props and semantic recipe
variables. Do not restyle primitive borders, padding, focus or disabled states
from a page selector. The KCQ token bridge must cover recipes and proxy-control
focus as well as Tailwind colours; portals inherit that bridge from body.
Empty-chart actions and bootstrap recovery use the same canonical Button contract.
Anonymous activation statistics require explicit consent and stay off by default.

Validate production build, strict types, lint, the toolbar public contract,
both themes, keyboard menu dismissal and Agent open/close in a real browser.
Deployment builds workspace prerequisites and pins the canonical library
revision in chart-source.json. Product and library remain separate repositories.

`/settings/profile` mounts a separate account surface, without creating a chart
or Agent runtime. It reads the same scoped settings and public KCQ theme resolver,
uses shared Avatar/Input/Button primitives and keeps session revalidation active.
Profile edits go through the public Nebutra auth adapter; email is read-only.

## UI Acceptance

`node apps/kcq/scripts/ui-smoke.mjs` checks the built app in real Chrome. Set
`KCQ_UI_SERVE=true` to serve the build on loopback, or `KCQ_SMOKE_ORIGIN` to inspect
the deployed origin without injecting account fixtures. CI runs this gate with
Playwright Chromium. The matrix includes desktop, phone, narrow phone and short
landscape viewports; both modes; all five chart presets; account menus; feedback;
layout naming; symbol/indicator search; chart settings; Agent settings/composer;
public pages; and local account/error/credential fixtures. It never sends an AI
request or submits feedback. Connector correctness has a separate real-data gate.

Keep source-library corrections in its repository and consume an immutable SHA.
`UI-AUDIT.md` records the cross-surface convergence rather than isolated patches.
