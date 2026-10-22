# KCQ UI Convergence - 2026-10-22

KCQ retains its chart-first layout and resolved palette. Nebutra canonical
primitives own hosted account interactions; KCQ shared Vue primitives own chart
interactions. No duplicated chart controls or DOM-injected overrides.

## Findings And Corrections

| Before | After | Why |
| --- | --- | --- |
| Feedback fields and primary actions had page-level borders, padding, colour and focus overrides | Shared Textarea label/size props and canonical Button recipes | A primitive's interaction contract must not be silently replaced by local CSS |
| Tailwind colours followed KCQ but primary recipes, checkbox borders and focus proxies could retain the host skin | One body-level bridge for recipe, focus, danger, density and radius semantics | Portals and nested controls must follow light, dark and every chart preset |
| Empty-chart actions and bootstrap retry were independently styled native buttons | Canonical Button island and exported button variant recipe | One hover, pressed, disabled and keyboard-focus contract |
| Account and wallet triggers hand-built button appearance | Canonical Button rendered through the public menu trigger API | Preserve visible labels, keyboard opening and focus return without custom button states |
| Chinese help dialogs announced an English Close action | Shared UiLabelsProvider exported by the canonical entrypoint and given the product label | Localization must share the same provider instance as the primitive |
| Profile name validation only disabled Save, without explaining the invalid field | Shared Input inline error and association, shared loading Button | Invalid, pending, rejected and successful states remain distinguishable |
| Switching connection editors could retain another connection's uncontrolled fields | Keyed editors, cleared credentials, explicit field errors and focus restoration | Avoid misleading identity and credential state; never keep secrets after a save attempt |
| Browser-native validation popups styled credential errors outside the design system | noValidate plus canonical inline errors and blocked invalid submission | Consistent error appearance and accessible association |
| Long account, email, provider names and error strings could expand their container | Wrapping identities, bounded scrolling menus and responsive action groups | Keep narrow surfaces inside the viewport without hiding recovery actions |
| KCQ shared form-control removed outline but supplied no focus indicator | Shared tokenized focus ring, invalid border and control sizing | Layout names, drawing templates, settings and Agent names must visibly accept input |
| Bare search, Agent composer and message-edit fields discarded the inner focus ring with no group replacement | Focus belongs to each composite group; script resize separator also retains focus | Keyboard and pointer focus must remain visible without nested rings |
| Fixed trailing toolbar actions consumed the entire row at 320px | Independently scrolling trailing group capped at half the row | Instrument selection must remain reachable; keep one toolbar |
| Chart settings navigation used clickable divs | Native buttons with shared focus and pointer states | Enter and Space must open the same settings pages as a pointer |
| Some common controls ignored reduced motion or applied hover on touch; modal limits used static vh | Shared reduced-motion rules, fine-pointer hover and dynamic viewport limits | Respect motion preferences and available phone height |
| Investor locale links returned visitors to Home; theme radios lacked Home/End support | Preserve current public route; complete keyboard navigation | Navigation and controls must behave consistently across public surfaces |
| Public copy icons could shrink in a long command and disabled controls lacked a common state | Fixed copy-icon flex size and shared disabled state; chart-label foreground token | Preserve target visibility, legibility and token ownership |

## Validation Contract

- Red/green behavioral regressions: profile error association; editor reset and
  focus restoration; canonical credential validation; native settings-row
  semantics. Existing credential-clearing and identity revalidation tests remain.
- Built-browser matrix: 1440x900, 390x844, 844x390 and 320x640; light/dark and
  Pro, Exchange, Terminal, Zen and Quant. Check computed focus, growth/scrolling,
  modal bounds, keyboard dismissal/return, toolbar reachability and page overflow.
- Public routes: English/Chinese Home, Benchmark, Investors and real 404 surfaces;
  theme keyboard navigation, route-preserving locale links, reduced motion.
- Local signed-in fixtures: long profile identity, rejected save and connection
  editor interactions. Remote acceptance never impersonates a signed-in account.
- Separate gates: pinned-library compatibility, all Vue package tests, shared
  primitive contracts, strict types, public bundle boundary, production build,
  documentation build, architecture and real connector smoke tests.

The browser gate is checked in at `scripts/ui-smoke.mjs` and runs in KCQ
compatibility CI. Generated reports/screenshots stay in the ignored local output
directory. This audit does not claim physical-device testing, every third-party
theme customization, paid Agent execution or a new authentication/billing audit.

## Integration Evidence

- Chart-library correction: TsekaLuk/KLineChartQuant PR #12, merged; immutable
  source revision `5a552668626114c9576970d490270ad6f2c12101`.
- Product regression suite: 35 files, 137 tests. Full Vue-library suite: 49 files,
  220 tests. Core compatibility: 126 tests; toolbar/managed Agent: 12 tests.
- Shared primitive contracts: 64 tests; architecture/SEO: 33 tests; documentation:
  14 tests, strict types and static production build.
- Product strict types, client build, public-entry isolation, prerender and OG
  generation pass. Existing poster-script lint warnings are not suppressed.
- Browser acceptance is required before release; production acceptance is rerun
  against the deployed origin without the local account/error fixtures.
