# Tool brief: dockerfile-starter (Dockerfile Starter Generator)

Root: `template`/`generator` (§6.7.2a — Template is an empty root; this is a
candidate to open it). Object: dev/config. Tier: Core candidate — pure,
schema-bound, high agent-composition value (feeds a build/deploy pipeline).

**Status note (this revision):** the original brief (367 lines, 0 mentions of
`docker init`) proposed a generator whose output set and stated differentiator
are largely already shipped, for free, by Docker's own first-party CLI. This
revision keeps §7's domain know-how (it's correct and still worth stating
plainly) but re-derives the reason to exist from scratch against `docker init`
as the primary competitor, with the three web tools kept as secondary.

## 1. Demand

**JTBD:** "I have a Node/Python/Go/etc. app and no Dockerfile — give me a
correct, production-shaped one without me having to know multi-stage build
idioms, and without needing Docker installed locally or a human at a
keyboard." Distinct from "explain Docker to me" — the user (or the agent
acting for them) wants a file, now.

**Keywords:** dockerfile generator, dockerfile generator online, generate
dockerfile for [language/framework], docker init alternative, dockerfile
generator no docker install.

**Pain:** hand-written Dockerfiles from tutorials are almost always
single-stage, run as root, `COPY . .` before `npm install` (cache-busting
every build), and ship devDependencies + build tooling into the runtime
image. `docker init` fixes all of that for people who have Docker Desktop and
a terminal open — but not for someone on a phone, in a browser-only
environment, on a bare Docker-Engine box, or building an agent that needs a
callable tool rather than a wizard.

## 2. Competitors (named, reached, captured)

| Name | URL | Reached | Screenshot |
|------|-----|---------|------------|
| `docker init` (Docker CLI) | https://docs.docker.com/reference/cli/docker/init/ | Yes (docs) | N/A — terminal CLI, not a web page |
| EaseCloud Dockerfile Generator | https://www.easecloud.io/tools/code-generators/dockerfile-generator/ | Yes | [docs/research/forge/dockerfile-starter/easecloud-dockerfile-generator.webp](../../research/forge/dockerfile-starter/easecloud-dockerfile-generator.png) |
| GitLoop Dockerfile Generator | https://www.gitloop.com/tool/dockerfile-generator | Yes | [docs/research/forge/dockerfile-starter/gitloop-dockerfile-generator.webp](../../research/forge/dockerfile-starter/gitloop-dockerfile-generator.png) |
| MagickPen Dockerfile Generator | https://magickpen.com/templates/128/ | Yes | [docs/research/forge/dockerfile-starter/magickpen-dockerfile-generator.webp](../../research/forge/dockerfile-starter/magickpen-dockerfile-generator.png) |
| dockerfile.app | https://www.dockerfile.app/ | **No** | — |

**dockerfile.app could not be verified.** It ranks for the plain keyword, but
both the automated screenshot capture and a direct fetch fail with a TLS
certificate mismatch (`ERR_CERT_COMMON_NAME_INVALID`, certificate points at an
unrelated domain, `mts.ru`). This was checked twice, on two separate passes.
Do not cite this listing's claimed feature set anywhere downstream — nothing
about it was actually observed. Also checked and rejected as not real/reachable
tools: `startwithdocker.com` (ranks in search as "Starter — An Open Source
Dockerfile Generator" but the domain is now a parked for-sale page, no tool
present) and several `github.io` hobby projects (real but negligible reach —
single-input demos, not competitors anyone is actually choosing between).

**§2a below covers `docker init` in full** — it is the category-defining
competitor (first-party, free, GA, widely installed) and is analyzed
separately from the three lightweight web tools below because it is a
different kind of thing: a CLI absorbed into the vendor's own product,
against which the three web tools are the weak, SEO-bait remainder of the
category.

### 2a. Primary competitor: `docker init`

`docker init` is a Docker CLI plugin, GA since Docker Desktop 4.19 (2024),
that scaffolds `Dockerfile`, `.dockerignore`, `compose.yaml`, and
`README.Docker.md` for a project in one interactive terminal session.
Everything below was reached via Docker's own docs
([docker init reference](https://docs.docker.com/reference/cli/docker/init/))
plus corroborating sources
([Docker's GA announcement](https://www.docker.com/blog/streamline-dockerization-with-docker-init-ga/),
[Spacelift's writeup](https://spacelift.io/blog/docker-init),
a [Docker Community forum thread](https://forums.docker.com/t/docker-init-command-without-installing-docker-desktop/139847)
on the Desktop requirement, and search-result excerpts of the Node.js
language guide's generated Dockerfile). No screenshot capture applies here —
this is a terminal CLI experience, not a web page.

#### 2a.1 What it actually covers

- **Eight built-in templates**, selected via an interactive menu: ASP.NET
  Core, Go, Java (Maven, uber-jar packaging), Node, PHP with Apache, Python,
  Rust, and a generic "Other" fallback. Detection is by manifest file present
  in the working directory (`package.json`, `requirements.txt`/
  `pyproject.toml`, `go.mod`, `Cargo.toml`, a Maven POM, an ASP.NET Core
  project file, a PHP app) — if none matches, it falls back to "Other."
- Per-template interactive prompts: language/runtime version, application
  entry path, port, package manager, build command, start command — e.g. the
  Node template explicitly asks "Which package manager do you want to use?"
  and "What command do you want to use to start the app?"
- **The generated Node.js Dockerfile is already good, not naive**: a `base`
  stage (`FROM node:${NODE_VERSION}-alpine`), a dependency stage running
  `npm ci --omit=dev` with BuildKit cache mounts, and a final stage that
  creates a non-root user (`addgroup -S appgroup && adduser -S appuser
  -G appgroup`) and switches to it with `USER appuser`. That means §7's
  points 1 (dependency-manifest-first layering), 2 (multi-stage), and 3
  (non-root final user) — the three things every hand-written tutorial
  Dockerfile gets wrong — are **already solved by Docker's own tool**, out of
  the box, for its eight templates. Those points are no longer a
  differentiator for us; they are a bar our output must also clear, because
  a Forge tool that regresses below Docker's own default would be strictly
  worse than typing `docker init`.
- Docker states plainly that the output requires follow-up: "After `docker
  init` has completed, you may need to modify the created files and tailor
  them to your project," and for PHP specifically, "you must manually add
  any PHP extensions that are required by your application."

#### 2a.2 What it does NOT cover (the real gaps, evidenced)

1. **Requires Docker Desktop — not available on Docker Engine alone.** Per
   Docker's own community forum: "Docker init isn't currently included in
   Docker Engine, and there's no supported manual installation method.
   Therefore, you must be using Docker Desktop in order to use the `docker
   init` command." This means it is unusable on a headless Linux CI runner,
   a bare Docker Engine server, inside most container-based dev/agent
   sandboxes, or anywhere a team has deliberately not installed Desktop
   (common in server and CI contexts, and in regions/orgs where Desktop's
   licensing terms are a blocker). A web/API tool has no such gate.
2. **Interactive-TTY-only, no scriptable or non-interactive mode.** The
   command's documented flag surface is a single flag, `--version` ("Display
   version of the init plugin"). There is no flag or config-file path to
   supply answers non-interactively, no batch mode. It cannot be invoked from
   a CI script or an agent's tool-call without a human (or a TTY-emulation
   hack) answering the prompts live. It has no API, no MCP surface, no JSON
   in/out — an agent finishing a "scaffold and containerize this repo" job
   cannot call it as a tool at all today.
3. **Framework detection stops at the language boundary for most
   templates.** The eight templates are language/runtime templates, not
   framework templates — Docker's own docs and the GA post describe "the
   template that best suits your application" at the language level; no
   sourced material confirms distinct auto-detected paths for Next.js vs.
   plain Node/Express, or Django/FastAPI/Flask vs. plain Python. (Java and
   ASP.NET Core are the two templates with real framework-shaped defaults —
   Maven uber-jar packaging, and ASP.NET Core's own conventions,
   respectively — everything else is a flat per-language shape.)
4. **Fixed language set — eight, full stop.** No Ruby, no Elixir, no
   Deno/Bun-native runtime handling, no per-runtime variant beyond what's
   built in. A ninth-language project gets the generic "Other" fallback,
   which per its own description is not tailored at all.
5. **Single-app, not multi-service.** `compose.yaml` output targets one
   detected app (with an optional attached datastore prompt in some
   templates); it does not address a monorepo emitting several Dockerfiles
   in one pass.
6. **File-overwrite risk with no dry-run.** Docker's own docs warn "you
   can't recover overwritten files" if `docker init` is re-run over existing
   output — there's no preview-before-write step.

#### 2a.3 What this means for us

`docker init`'s existence kills two of the three things the original brief
called differentiators: "framework-aware" was unverified against a tool that
already ships eight solid language templates with genuinely good defaults,
and "companion files in one pass" is *exactly* what `docker init` already
does (`Dockerfile` + `.dockerignore` + `compose.yaml` + a README, one
command). Competing on template quality alone is competing with a free,
first-party tool that has no incentive to be worse than it is.

The honest differentiators that survive scrutiny are **access**, not
**quality**:

- **No local Docker install of any kind** (not even Engine, let alone
  Desktop) — works from any browser, any CI step, any agent sandbox.
- **Agent-callable over OpenAPI/MCP with a deterministic JSON schema** —
  something `docker init`'s TTY-only, single-flag CLI structurally cannot
  offer today.
- **Framework-level presets deeper than Docker's language-level defaults**
  for the handful of frameworks that most benefit from it (Next.js
  `output: "standalone"`, NestJS, FastAPI/Django/Flask, Spring Boot) — a
  real but narrower claim than "framework-aware" against all languages,
  scoped to where we can actually show daylight over Docker's own output.
- **Coverage beyond the eight built-in languages** for stacks Docker's
  fallback treats generically.

If none of these land with users once shipped, the honest fallback is not to
keep pretending "companion files" is the pitch — it's to fold this
capability into a broader `detector`/`extractor` → `template` pipeline (e.g.
"scaffold this repo" agent action) rather than sell it as a standalone
destination page competing head-on with a tool most developers already have
one command away.


## 3. Feature inventory

*The three web tools. `docker init`'s own generated-output detail stays with
its competitor analysis in §2a.1, since it is inseparable from the gap
argument there.*

**EaseCloud** — the one genuine deterministic generator of the three.
Confirmed via WebFetch + screenshot:
- Fields: Language (dropdown: Node.js confirmed, page copy claims Python, Go,
  Java, PHP, Ruby too), Base Image (dropdown, e.g. `node:18-alpine`), Working
  Directory (text, e.g. `/app`), Port (text, `3000`), Build Command (text,
  `npm install`), Start Command (text, `npm start`).
- Click "Generate Dockerfile" → output fills a read-only textarea below the
  form. "Clear" resets. No live/instant update — it is button-gated.
- Page copy claims multi-stage builds, layer optimization, non-root user,
  minimal base images, "all generation performed client-side."
- Core strength: it is what it claims to be — a small, honest, dropdown-driven
  template generator. This is the shape to beat among the web tools; it is
  still weaker than `docker init`'s actual Node.js output (button-gated, no
  compose/dockerignore companion generation confirmed, no non-Desktop-vs-
  Desktop distinction to make since it's a web page).
- Upsell padding: "Get free cloud audit" CTA above the fold, a "Professional
  Services / DevOps Consulting" banner directly under the tool, a Related
  Tools grid (empty-labelled cards in our capture — likely a loading/broken
  state) and a newsletter signup in the footer. None of it blocks or gates the
  tool itself.

**GitLoop** — inline generator, but the product identity is "AI that reads
your whole codebase," and the tool page is built to funnel there.
- The page **does** have a real inline widget (confirmed on the screenshot,
  which WebFetch's text-only rendering had missed): a code-input textarea
  labelled "Enter your code here," a "Generate →" button, and a
  "Generated code will appear here" output textarea below it.
- A large "Try GitLoop — The AI That Knows Your Entire Codebase" button sits
  between the headline and the widget — the primary above-the-fold CTA is to
  leave this page for the signed-in product, not to use the free tool.
- Body copy: "Provide stack details or package.json and get a minimal, secure
  multi-stage Dockerfile using small base images, caching, and sensible
  defaults." Positions itself as AI-driven, not a fixed template engine.
- Not tested interactively (no code was pasted/submitted) — whether "Generate"
  works anonymously or requires sign-in on submit is unverified; noting this
  rather than guessing.
- Below the tool: a two-column grid of ~24 other "free tools" (`.gitignore
  Generator`, `SQL Formatter`, code converters, an "AI Code Reviewer," etc.) —
  this page is one cell in a large SEO-bait tool farm, not a dedicated
  product.

**MagickPen** — not a form generator at all; a general AI-writing-assistant
template wrapped around a chat prompt.
- Input is a single free-text box ("Tell about your subject," placeholder
  example: "e.g., Generate a Dockerfile for a Python-based web application"),
  a "Fast/Advanced" model toggle, and optional Web Search / Deep Research /
  Thinking switches. No language/port/command fields — the user has to know
  what to type.
- "Generate" costs credits ("10 free credits per day," paid tiers at
  $6.9/$19/$59 per month visible in a pricing table directly on this page).
- The page is templated — "Related Templates" shows the exact same card grid
  pattern for unrelated generators (SQL Generator, Makefile Writer, Terminal
  Command Generator, Blockchain Code Generator…), confirming this is one
  interchangeable prompt-template slot in a general AI content mill, not a
  purpose-built Dockerfile tool.
- Core strength for MagickPen is nonexistent as a *Dockerfile* tool — its
  strength is "AI writing assistant with 90+ templates," and Dockerfile is
  incidental inventory.

## 4. Journey maps

**`docker init`** — arrival is a terminal, not a page: the user runs
`docker init` inside their project directory. First touch is Docker's
own detection announcing the template it picked (or asking the user to pick,
if ambiguous/unmatched), then a short sequence of per-template questions
(version, port, package manager, commands), answered one at a time by
pressing Enter to accept the shown default or typing an override. Result is
four files written directly to disk **the moment the last question is
answered** — no separate "generate" step, no preview pane, no copy button:
the retrieval mechanism is "they're already in your working directory."
Failure mode is the documented overwrite risk (re-running over existing
output cannot be undone) and the fact that the whole flow is unavailable
if Desktop isn't installed or the shell has no TTY.

**EaseCloud** — arrival shows the H1, a one-line pitch, and a lone CTA
("Get free cloud audit," unrelated to the tool) — then, scrolling slightly,
the actual generator card. First touch is the Language dropdown, then Base
Image, then the four text fields. Result appears **only after clicking
"Generate Dockerfile"** — no live preview as fields change. Retrieval is
"Copy the configuration with one click" per body copy (a copy affordance was
not independently confirmed by button label in the fetched text, but is
stated explicitly in the page's own "How to Use" section). No visible
handling for partial/invalid input (e.g., empty Base Image) was observed —
this was not tested live.

**GitLoop** — arrival is the product-brand CTA competing directly with the
tool for attention. First touch, if the user ignores the CTA, is pasting code
or `package.json` contents into the input textarea. Result appears after
clicking "Generate →" into a second textarea styled to look like a terminal
output pane. No file upload — paste only. No visible download button, only
the two stacked textareas (copy is the only implied retrieval path, standard
for this UI shape, though not independently confirmed by testing the button).

**MagickPen** — arrival is a chat-app affordance: a template picker already
set to "Dockerfile Generator," a free-text prompt box, and toggles for
optional AI features (web search, deep research). First touch is typing a
prose description of the stack. Clicking "Generate" burns a credit and
(per general MagickPen product pattern) streams prose/code into the right
panel, which on this page shows an illustration/placeholder rather than a
result — i.e. nothing is generated until the user actually invokes it, and no
live/no-button behavior exists.

## 5. Layout + screenshots

- **`docker init`** has no visual layout to critique — it's a sequential
  terminal prompt. The relevant "layout" lesson is behavioral, not visual:
  answer-and-write-immediately, defaults shown inline so Enter-to-accept is
  always a valid path, and all four output files land in one pass.
- **EaseCloud**: single centered column, form fields in a two-column grid
  above one full-width output textarea, generate/clear buttons directly below
  the output — a classic configure-then-generate layout with input and output
  stacked vertically, not side-by-side. Above the fold is marketing copy, not
  the tool; the user must scroll ~1 viewport to reach the form. Below the
  tool: a consulting upsell banner, then three "why/how/use-case" content
  blocks (clearly written for SEO, not the user mid-task), then a broken/empty
  "Related Tools" card grid, then a newsletter box and full footer. Options
  density is low (6 fields) — appropriate for the task.
- **GitLoop**: dark theme, single centered column, input textarea → button →
  output textarea, all stacked vertically, all above the fold except the
  large brand CTA competing for the same space. Below the tool: a dense
  2-column grid of ~24 unrelated tool links (this is a tool-farm page
  template reused across GitLoop's whole catalog, not a dedicated Dockerfile
  layout).
- **MagickPen**: two-column layout — left is the prompt/config form (template
  picker, free-text box, toggles, Generate/Buy Credits buttons), right is a
  static illustration + "Watch Tutorial" link (no live output pane visible
  pre-generation). Below the fold: a "Related Templates" card grid (8 unrelated
  templates), an "About Dockerfile Generator" text block, a 6-tile feature grid
  ("Powered by ChatGPT," "Free trial," "Use Anywhere," etc.), then a full
  pricing table with three tiers, then an FAQ accordion, then footer. This is
  the deepest page of the three and the least specific to Dockerfiles.
- Mobile behaviour: not tested on any of the three web tools (desktop
  viewport captures only) — not claiming mobile behavior we did not observe.

## 6. Their debt

- **`docker init`**: Desktop-only distribution, TTY-only interaction, no API/
  MCP surface, fixed eight-language set, single-app scope, no dry-run before
  overwrite. This is not "debt" in the sense of a poorly-run product — it's a
  deliberate, reasonable set of boundaries for a CLI plugin bundled with a
  desktop application. But every one of those boundaries is a real gap for a
  user or an agent operating outside that context, and none of the three web
  tools below fill it either (none offer an API/MCP surface, none work
  offline-of-signup the way a plain generator should).
- **GitLoop**: the tool's own page competes with itself — the loudest
  above-the-fold element sends the user away from the free tool and into a
  signup funnel for the paid AI product. The Dockerfile generator itself is
  presented as one of ~24 interchangeable SEO tool pages sharing one template
  (visible in the identical link-grid at the bottom), which is a strong signal
  none of them get product-level care.
- **MagickPen**: not actually a Dockerfile tool — it's a rate-limited
  ("10 free credits per day," capped word count per generation per the footer
  disclaimer) chat prompt wearing a Dockerfile skin, with a hard paywall
  visible directly on the page. No structured input means no correctness
  guarantee — the output quality depends entirely on how well the user's
  free-text prompt happens to describe their stack.
- **EaseCloud**: the most honest of the three, but still button-gated with no
  live preview, no visible error state for missing/invalid fields, a
  "Related Tools" grid that renders as empty boxes (broken or lazy-loaded
  content we could not trigger), and no visible API/programmatic access
  anywhere on the page — a human-only tool with no machine contract.
- **All three web tools**: no tool offers OpenAPI/MCP access; none states any
  privacy boundary about the code/config a user pastes in (GitLoop,
  MagickPen) beyond EaseCloud's one-line client-side claim; none supports
  more than a single target stack per generation (no monorepo / multi-service
  Dockerfile); none goes past language-level presets any more than `docker
  init` does — so none of them close `docker init`'s actual gaps either, they
  just add a web form in front of the same language-level ceiling.

## 7. Domain know-how

A naive implementation ("template string with variables swapped in") gets all
of the following wrong. As §2a.1 established, `docker init` already gets
points 1–3 right for its eight templates — so treat 1–3 as **the bar to
clear**, not a claim to make. Points 4–8 remain open ground where evidence
above did not confirm Docker's own output handles them, either at all or
uniformly:

1. **Layer-order determines cache efficiency.** Dependency manifests (
   `package.json`/lockfile, `requirements.txt`, `go.mod`, `pom.xml`) must be
   copied and installed *before* the rest of the source is copied. `COPY . .`
   before install busts the dependency cache on every source change — the #1
   thing tutorials get wrong. (`docker init` already does this for Node.)
2. **Multi-stage builds separate "build" from "run."** A builder stage should
   carry the compiler/toolchain/devDependencies; the final stage should
   `COPY --from=builder` only the compiled artifact (binary, `dist/`,
   `node_modules` pruned to production) into a minimal runtime base. Shipping
   the builder image to production doubles-to-tenfolds image size and attack
   surface for no benefit. (`docker init` already does this for Node.)
3. **Never run as root in the final image.** A dedicated non-root user
   (`USER node`, or an explicitly created UID) must own the app directory and
   be the process owner. Root-in-container is a real, commonly-flagged
   security finding, not theoretical. (`docker init` already does this for
   Node, via a created `appuser`/`appgroup`.)
4. **Base image tag matters more than base image name.** `node:18` vs
   `node:18-alpine` vs `node:18-slim` vs `node:18-alpine3.19-slim` trade image
   size against glibc/musl compatibility (native npm addons often fail on
   Alpine's musl libc) — a generator that always defaults to `-alpine` will
   silently break native-dependency projects; this needs to be a documented
   choice, not a hidden default. No sourced material confirms whether
   `docker init` exposes this as a real choice vs. a fixed default per
   template.
5. **`.dockerignore` is part of the correct answer, not an optional extra.**
   `docker init` already emits one, so this point is about matching that
   baseline, not beating it — but it remains worth stating because the three
   web competitors are inconsistent about it (only EaseCloud's copy claims
   related best practices; none of the three was confirmed to emit a
   `.dockerignore` file at all).
6. **Framework build output paths are not the language default.** Next.js
   wants `output: "standalone"` support and a `.next/standalone` copy step;
   Vite/CRA want `dist/`/`build/` served by a static server (or `nginx`), not
   `node server.js`; a Spring Boot jar needs `java -jar` with the right
   `target/*.jar` glob. Per-language defaults are not granular enough for the
   frameworks users actually run — and per §2a.2 point 3, this is the one
   place we have real, sourced evidence that `docker init` itself stays at
   the language level for most of its templates. This is where "Template"
   (the empty §6.7.2a root) should live: framework presets, scoped honestly
   to the handful of frameworks worth the extra depth, not a blanket
   "framework-aware" claim across every language.
7. **Healthcheck and signal handling are often silently skipped.** `CMD`
   vs `ENTRYPOINT`, `exec` form vs shell form (shell form swallows SIGTERM,
   breaking graceful shutdown in orchestrators), and an optional `HEALTHCHECK`
   instruction are small, correct-by-default wins not confirmed present in
   any of the four competitors' output (Docker's own docs excerpt did not
   mention `HEALTHCHECK`, and none of the three web tools claim it).
8. **Port exposure is documentation, not enforcement.** `EXPOSE` does not
   publish a port; conflating the two in copy or UI (as a naive generator's
   labelling might) misleads users about what `-p` flags they still need at
   `docker run` time.

## 8. Chosen archetype

**Configure-then-generate.** The options *are* the product here — language,
framework, package manager, port, and a small set of toggles (multi-stage
on/off, non-root user on/off, include `.dockerignore`, include
`docker-compose.yml` companion) directly determine the output, and changing
any one of them should regenerate the file. This matches §6.7.10's own example
list for the archetype (".gitignore by stack, password rules, QR"), and it is
also the one archetype `docker init`'s own interaction model cannot offer on
the web — live, no-flag, no-terminal, re-editable in place.

Why the others are wrong:
- **Instant transform** (no button) doesn't fit — this isn't a 1:1 paste→
  transform of existing content; it's synthesizing a new file from discrete
  choices, and regenerating on every keystroke inside a free-text field (e.g.
  a custom start command) would be noisy. Discrete controls (selects, toggles)
  changing the output live is fine and is *part of* configure-then-generate;
  a dedicated "Generate" button gate on top is the unnecessary tax we should
  drop relative to EaseCloud (and relative to `docker init`'s sequential
  question-by-question flow, which cannot show a live preview at all).
- **Decision wizard** doesn't fit — the user typically already knows their
  stack (Node, Python, Go…); we are not narrowing an unknown, we are
  collecting known facts. A wizard would slow down the very users who came
  here because they're in a hurry — and would just re-implement `docker
  init`'s own sequential-prompt shape, worse, in a browser.
- **Drop-and-verdict** doesn't fit — there is no file to drop and inspect; the
  input is structured choices, not a blob to analyze.
- **Two-pane compare / inspect-and-drill / batch queue** — none apply; there
  is one output artifact, no comparison, no batch of files.

## 9. Our design

### 9.1 Journey

1. Arrival: language/runtime select is the first and only required field,
   defaulted to a sensible guess (Node.js) so the page is never blank-output.
   The Dockerfile output panel is visible and pre-populated with that default
   immediately — no empty state, no "click Generate to see something," and
   no terminal to open first.
2. Selecting a language reveals a framework sub-select scoped to that
   language (Node.js → none/Express/Next.js/NestJS; Python → none/Django/
   FastAPI/Flask; Go → none/generic; etc.) — this is where we beat `docker
   init` and all three web competitors (§2a.2 point 3, §7 point 6): none of
   them go past the language level for these stacks.
3. Remaining fields: package manager (npm/pnpm/yarn where relevant), working
   directory, port, start command (pre-filled per framework, editable),
   build command (pre-filled, editable, hidden entirely for frameworks with
   no build step).
4. Toggles, all on by default with a one-line "why" tooltip: multi-stage
   build, non-root user, generate matching `.dockerignore`, generate
   companion `docker-compose.yml`. Turning multi-stage off is the one control
   that meaningfully changes the shape of the file (single-stage, documented
   as the tradeoff it is), not a cosmetic option. These four defaults exist
   to match `docker init`'s own baseline (§7 points 1–3), not to claim
   novelty for them.
5. Every change to a select/toggle regenerates the output panel immediately —
   no Generate button for the deterministic path, and no sequential
   question-by-question wait the way `docker init`'s terminal flow requires.
   Free-text fields (build command override, start command override)
   regenerate on blur, not on keystroke, so an in-progress edit doesn't flash
   broken output.
6. Output: syntax-highlighted, read-only, with Copy and Download (as
   `Dockerfile`, no extension) both visible without scrolling. If
   `.dockerignore` and/or `docker-compose.yml` were toggled on, they appear as
   additional labelled tabs/panels next to the Dockerfile output, each with
   its own copy/download — not concatenated into one blob, and — unlike
   `docker init` — nothing is written to disk until the user explicitly
   downloads, so there is no overwrite-risk failure mode to design around.
7. Large-input / edge behavior: this tool has no free-form large-input
   surface (no paste-your-whole-codebase like GitLoop) by design — see
   differentiator below — so there is no large-input degradation path to
   design for; the only failure mode is an invalid combination (e.g., a
   framework requiring a build step with "no build command"), surfaced as an
   inline warning under the affected field, not a blocking error.

### 9.2 Layout

Single column, no split panes needed since output is short (a
Dockerfile is rarely more than ~40 lines) — options **above** the output, not
beside it, so mobile users get the natural top-to-bottom reading order without
a layout reflow. Options are grouped into two visually separated clusters
(never bordered per house style): "What you're building" (language, framework,
package manager) and "How it should run" (workdir, port, commands, toggles).
Output panel is full-width below both clusters, with the tab strip
(Dockerfile / .dockerignore / docker-compose.yml) sitting directly above it
when more than one artifact is generated.

### 9.3 Must-have

*without which a user bounces back to `docker init`, EaseCloud, or GitLoop*

- Live regeneration on every select/toggle change (no Generate button for the
  structured path) — this beats EaseCloud's and GitLoop's button-gated flow,
  and beats `docker init`'s sequential terminal prompts on editability (any
  field can be revisited without restarting the flow).
- Multi-stage + non-root defaults on, stated plainly (not buried in body copy
  the way EaseCloud does) — matching, not exceeding, `docker init`'s own
  baseline for its covered languages.
- Copy **and** Download both present without scrolling.
- Framework-level presets, not just language-level (§7 point 6, §2a.2 point
  3) — the one capability we have sourced evidence none of the four
  competitors (`docker init` included) offer uniformly, and the actual
  differentiator, not a nice-to-have.
- No local install of any kind, and no signup — works identically in a
  browser tab or as an agent's tool call, which `docker init` structurally
  cannot do (§2a.2 points 1–2).

### 9.4 Deliberately skipped

- Free-text "paste your code / package.json and let AI figure it out"
  (GitLoop's and MagickPen's core mechanic) — this makes the tool
  non-deterministic and non-`pure`, breaks the agent contract (no stable
  schema for arbitrary pasted code), and is exactly the LLM-marketing pattern
  §6.7.8's gate says we should not build without evidence of removing a real
  step in a job. If real demand shows up later for "read my repo and infer the
  stack," that is a `detector`/`extractor` root feeding *into* this tool's
  schema (framework autodetect from an uploaded `package.json`), not a reason
  to make this tool itself an AI black box.
- A GitLoop-style catalog-farm surrounding of ~20 unrelated tool links under
  the tool — Forge's related-by-root navigation (§6.6) already does this
  properly, scoped to `roots`, not as an undifferentiated grid.
- MagickPen's credit/paywall gate on the free path — this is Core-tier, free
  tier per §6.5 tiering table, with Router/model billing reserved for the
  gated LLM-backed roots only (§6.7.8), which this tool is not.
- Trying to out-cover `docker init`'s eight languages one-for-one on day one
  — better to ship fewer languages with real framework depth (§2a.3) than to
  match the language count with the same flat, language-only shape Docker
  already provides for free.

### 9.5 Differentiator

*re-derived against `docker init`, evidenced in §2a.2–§2a.3, not assumed*

1. **Zero local install, of any kind** — not Docker Desktop, not even Docker
   Engine. Works from a browser tab, a CI step, or an agent sandbox where
   Docker itself may not be present at all — a strictly larger set of
   contexts than "has Docker Desktop installed," which `docker init` requires
   per Docker's own community forum guidance.
2. **Agent-callable over OpenAPI/MCP with a deterministic JSON schema** —
   `docker init`'s only documented flag is `--version`; it is TTY-interactive
   by design with no scripting path. An agent finishing a "scaffold this
   project" job can call this tool directly; it cannot call `docker init` at
   all today.
3. **Framework-level presets** for the frameworks where it matters most
   (Next.js, NestJS, Django/FastAPI/Flask, Spring Boot) — real depth beyond
   Docker's language-level templates, scoped honestly rather than claimed
   across every language docker init or the web competitors touch.
4. Because it is Core-tier, the same engine is directly callable with no
   signup and no credits — matching the free-and-open spirit of `docker
   init` itself, rather than MagickPen's paywall or GitLoop's signup funnel,
   while adding the access `docker init` cannot offer outside a Desktop
   install.


### 9.6 I/O contract

*for the implementer, not final schema*

```
input: {
  language: enum(node, python, go, java, php, ruby, ...),
  framework?: enum (scoped to language),
  packageManager?: enum (scoped to language),
  workdir?: string (default "/app"),
  port?: number (default per-framework),
  buildCommand?: string (framework default, overridable),
  startCommand?: string (framework default, overridable),
  multiStage?: boolean (default true),
  nonRootUser?: boolean (default true),
  includeDockerignore?: boolean (default true),
  includeCompose?: boolean (default false),
}
output: {
  dockerfile: string,
  dockerignore?: string,
  dockerCompose?: string,
  warnings?: string[]   // e.g. "alpine base may break native addons for this framework"
}
```
This is `pure` (no upload, no external call) — straightforward Core-tier
inclusion, and a natural `compose.next` edge target from any future
`extractor/package-json` or `detector` (framework sniff) tool, and a source
for a downstream `checker` (lint the generated Dockerfile with hadolint rules)
later. The same schema, exposed over OpenAPI/MCP, is the actual point of
building this at all — see §9.5 above.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — contract sketched in §9.6 |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — no meter id proposed in this brief |
| 6 | Side-effect class declared | Stated `pure` in §9.6 prose and in the preamble; not written as a formal descriptor field |
| 7 | Stable error codes; `request_id` on server paths | Not started — §9.1 step 7 defines one inline-warning case, no code set |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — no upload path is planned, but the note is unwritten |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — base-image tag policy (§7 point 4) is the version surface here and is undecided |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (four reached; dockerfile.app unverified, see §11) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

## 11. Gaps and open questions

- [ ] **dockerfile.app could not be reached** — TLS certificate mismatch
      (`ERR_CERT_COMMON_NAME_INVALID`, certificate pointing at an unrelated
      domain), checked twice on two separate passes. Nothing about it is
      described anywhere in this brief and nothing should be added downstream.
- [ ] **`docker init` was analysed from documentation, never run.** Every
      claim in §2a — the eight templates, the prompt sequence, the generated
      Node.js Dockerfile's shape, the Desktop-only distribution, the
      single-flag CLI surface — comes from Docker's own docs, its GA blog
      post, a community forum thread, and third-party write-ups. It was not
      executed in this environment. The Node.js output in particular is
      quoted from a language-guide excerpt, not from a run.
- [ ] **Whether `docker init` exposes base-image tag choice per template is
      unknown** (§7 point 4) — no sourced material confirms it either way, so
      our "documented choice, not a hidden default" position is stated
      against an unmeasured baseline.
- [ ] **None of the three web tools were exercised.** EaseCloud's output
      after clicking Generate, GitLoop's behaviour on submit (anonymous vs
      sign-in gated), and MagickPen's actual result were all left untested —
      §4 says so per tool, and it means the "EaseCloud is the shape to beat"
      judgement rests on its form, not its output.
- [ ] **The framework-preset claim is the whole differentiator and the
      thinnest-evidenced part of it.** §2a.2 point 3 establishes that
      Docker's templates are language-level *for most templates* from its own
      docs — not that Next.js/NestJS/Django/FastAPI/Spring Boot output would
      actually be worse. Generating a Next.js app with `docker init` and
      diffing it against our intended preset is the single check that would
      convert this from a reasonable inference into a finding.
- [ ] **Mobile behaviour unverified** for all three web tools (desktop
      captures only).
- [ ] **Language coverage beyond Docker's eight is claimed but not scoped**
      (§2a.3) — which additional stacks ship first, and what "coverage" means
      for them, is undecided.
- [ ] **Meter id, error codes, privacy note and base-image version policy are
      not yet decided** (§10 gates 5, 7, 8, 10).
