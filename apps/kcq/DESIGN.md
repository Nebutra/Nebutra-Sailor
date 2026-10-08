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

Validate production build, strict types, lint, the toolbar public contract,
both themes, keyboard menu dismissal and Agent open/close in a real browser.
Deployment builds workspace prerequisites and pins the canonical library
revision in chart-source.json. Product and library remain separate repositories.
