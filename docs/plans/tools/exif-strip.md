# Tool brief: `exif-strip`

Root: **Editor** (`09`, per §6.7.2a / §6.7.9). Object: image bytes (JPEG / PNG
/ WebP first; format ceiling stated in §9.4).

Tier: **Core** (§6.5 tiering table) — high Agent value: "take a file, remove
one well-specified span, return the file" is exactly the bounded edit an
agent planner reaches for after a capture/upload step, and it is a pure
function with no model in the loop.

**Status:** research-complete. Teardown on file (§2–§6); domain know-how and
design decided (§7–§9); not yet implemented — no code exists under this slug.

## 1. Demand

- **JTBD:** "I'm about to post/send/upload this photo and I don't want the
  GPS coordinates, camera serial number, or capture timestamp baked into the
  file" — strip the file's metadata *before* sharing, without touching the
  visible pixels.
- **Keywords:** remove exif data from photo online, exif remover, delete exif
  data, strip metadata from image, remove GPS from photo, remove metadata
  online, 去除照片EXIF信息, 删除图片元数据.
- **Pain:** Photos silently carry GPS lat/long, device serial numbers,
  capture date/time, and (per exifremover.com's own copy, verified in §3) an
  EXIF **thumbnail** that can still show the pre-crop framing even after the
  visible image has been cropped — so "I cropped out the background" does not
  mean the sensitive frame is gone. Users cannot see any of this by eye; the
  only way to know is a tool that opens the file and shows the removed
  span, or simply performs the removal.

## 2. Competitors (named, reached, captured)

Search phrasing used: "remove exif data from photo online tool" (per the
task's stated demand evidence — a dense field of ~10 distinct competitors:
exifremover.com, imagesmaller.com/exif-remover, imgonline delete-exif.php,
pics.io metadata-remover, aimetadatacleaner.com, verexif.com, imagy.app,
exifremove.com). Four were selected for this teardown, spanning the category's
range: the leading purpose-built tool, an older high-ranking incumbent, a
general image-tool suite's EXIF page, and the newest entrant expanding the
category past classic EXIF.

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| **EXIF Remover** | https://exifremover.com/ | Yes — WebFetch + full-page screenshot | [`exifremover.webp`](../../research/forge/exif-strip/exifremover.webp) |
| **IMG online — Delete EXIF** | https://www.imgonline.com.ua/eng/delete-exif.php | Yes — WebFetch (readable form-page content) + screenshot, **but the screenshot itself captured an error state** — see §4 and §11 | [`imgonline-delete-exif.webp`](../../research/forge/exif-strip/imgonline-delete-exif.webp) |
| **ImageSmaller EXIF Remover** | https://www.imagesmaller.com/exif-remover/ | Partial — WebFetch succeeded (page text below); **screenshot blocked, HTTP 403** (bot-detection on the capture UA, one attempt) | *(none — 403)* |
| **AI Metadata Cleaner** | https://aimetadatacleaner.com/ | Partial — full-page screenshot succeeded (above-the-fold only; full-page capture failed first with a WebP dimension-limit error, retried with `--clip-full false`); **WebFetch blocked, HTTP 403** | [`aimetadatacleaner.webp`](../../research/forge/exif-strip/aimetadatacleaner.webp) |

Not reached this pass and carried into §11 rather than described: **pics.io
metadata-remover, verexif.com, imagy.app, exifremove.com**.

Capture command used (script fixed this pass — see note):

```bash
node scripts/research-screenshot.mjs "<url>" "docs/research/forge/exif-strip/<name>.webp"
```

**Infra note (in-scope fix, not a new dependency):** `scripts/research-screenshot.mjs`
was failing on every `.webp` target with `unsupported mime type "image/webp"` —
current Playwright's native `page.screenshot()` only emits `png`/`jpeg`, so the
old extension-inferred `type` broke for every future teardown, not just this
one. Fixed by capturing PNG in memory and re-encoding through `sharp`, already
an installed repo dependency (`package.json` `pnpm.overrides`), only when the
output path ends in `.webp`. No new package was added.

`docs/research/forge/` is gitignored: the captures are local reference
material, this brief is the committed deliverable, and anyone can regenerate
them from the URLs above. The script exits non-zero on failure — nothing above
was recorded as captured without a successful run.

## 3. Feature inventory

**EXIF Remover (exifremover.com)** — core strength: this *is* the product,
and it is the most complete single-purpose implementation reached.
- Multi-format input: JPEG, PNG, WebP, HEIC/HEIF, GIF, AVIF images; MP4/MOV
  video; PDF (author/software/timestamp fields).
- Batch: up to 20 files per run, 50 MB each (own copy, verified in the
  captured page).
- Inspect-before-remove: a searchable metadata table per file (search box for
  tag names like "GPS" or "Date") — view, then act, not just act blind.
- Selective preservation stated explicitly: image orientation, color profile
  (sRGB, etc.), image dimensions, actual pixel data, and PNG transparency are
  named as *preserved*; GPS, camera/device info, timestamps, thumbnails,
  software tags are named as *removed*. This distinction (§7 know-how #1) is
  the single most load-bearing thing on the page.
- All-client claim: "all processing happens in your browser… local
  WebAssembly… No uploads… No servers… No tracking… No accounts."
- Upsell: none observed — no paywall, no account gate on the core function.
- Debt: a full-width ad banner (a Chinese enterprise-agent-platform ad,
  unrelated to the tool) sits directly under the upload widget, inside the
  fold, on a page whose own copy argues *for* not exposing users' data to
  third parties. That is the contradiction to avoid inheriting (§6, §9.4).

**IMG online — Delete EXIF (imgonline.com.ua)** — core strength: none; this is
one page in a large multi-tool suite (Resize / Convert / Compress / EXIF
editor / Effects / Improve), and the EXIF page is thin relative to
exifremover.com.
- JPEG-only, single file, no visible options before submit (per WebFetch's
  read of the form page) — no batch, no format choice, no preview/inspect
  step.
- States explicitly "The original image is not changed" (i.e. produces a new
  file rather than mutating in place) — this is marketing/help copy, not
  something this pass observed happening live (see below).
- No pricing, no account gate observed.
- Debt: dated, form-only, table-based layout typical of a legacy multi-tool
  aggregator (see confirmed sibling read in `line-ending-detect.md` §3 for the
  same site family's general house style).

**ImageSmaller EXIF Remover** (WebFetch text only — no screenshot, see §11) —
marketing copy states removal of "geolocation, camera model, copyright,
date" from JPG/JPEG and PNG, explicitly **server-side** ("Cloud-Based
Service… processed online on our servers"), no batch mentioned, "Lossless
Compression" and no-watermark claimed. Minimal cross-promotion to sibling
tools (compress/convert/MP3/audio-remove) in the footer; not aggressive.
Since the upload mechanism was read from marketing copy rather than observed
live, its journey is not mapped in §4 beyond what the copy states.

**AI Metadata Cleaner (aimetadatacleaner.com)** — core strength: the only
product in this set that names **AI-generation provenance metadata** as a
first-class removal target, not just classic camera EXIF.
- Own headline copy (captured, verified): "strips EXIF, GPS, C2PA, and AI
  generation tags from your images, and removes Stable Diffusion parameters —
  to protect your privacy before you share, all in your browser."
- Accepts `.jpg .png .webp .avif`, up to 10 MB per file (stated on the drop
  zone itself).
- Quota gate, visible above the fold: **"0/3 images today"** with "Sign up
  free for 10 images/day — 3× your limit" directly under the drop zone. This
  is a real upsell/account gate on the core function, not just a nice-to-have
  tier — the first three uses of the day are free, then the tool asks for an
  account.
- Nav includes Blog / Pricing / Disclaimer / Other Tools / Sign In / Register
  — a small SaaS shell around one function.
- Debt: the daily-count gate sits inside the primary workflow fold, which is
  exactly the "upsell interruption inside the tool journey" §6.7.10 tells us
  to refuse.

**Cross-competitor read:**
- **Table stakes:** paste/drop → process → download a cleaned file; a stated
  privacy posture (client-side or "we don't keep your files"); JPEG + PNG at
  minimum.
- **Worth adopting (only one does it):** exifremover.com's inspect-then-act
  table with a preserved/removed split named explicitly, and its 20-file
  batch cap; aimetadatacleaner.com's coverage of AI-provenance tags (C2PA,
  Stable Diffusion parameters) as a metadata category distinct from classic
  EXIF.
- **Nobody does:** none of the four reached shows the removed bytes/segment
  count as a structured, machine-readable result — every one of them is a
  human-facing download-a-file product with no visible API, MCP, or schema.
  That gap is exactly this brief's differentiator (§9.5).

## 4. Journey maps

**EXIF Remover** — arrival: hero copy + drop zone with format tabs
(JPEG/PNG/GIF, EXIF-tag chosen) visible immediately, no login wall. First
touch: drop or "SELECT FILES," up to 20 at once. Result: files appear in a
carousel/list; clicking one opens the searchable metadata table — the user
*sees* what would be removed before removing it. Taken away: "REMOVE EXIF"
per file or "BULK REMOVE" for all, then "SAVE ALL" to download. No live-preview
transform — there is a button, and it is justified because the tool wants the
user to inspect the table first (§8: this rules out *Instant transform*).
Large/malformed input: not observed live this pass (no file was actually
submitted); the copy states a 50 MB/file, 20-file ceiling but behavior past
that ceiling is unverified — carried to §11.

**IMG online — Delete EXIF** — arrival: suite-wide top nav, then a bare file
picker with no options, per the WebFetch read of the form page. Result: not
observed as a working submit — see the anomaly below. Taken away: unverified.
**Anomaly, recorded rather than guessed at:** the screenshot capture of this
exact URL, on two separate attempts (one with a cache-busting query param),
rendered the site's **own error state** — "Image processing result / Error,
image file was not specified" — instead of the upload form the same URL
returned to WebFetch's text extraction moments earlier. This looks like a
session/cookie quirk in imgonline's own server-side handling of a fresh
headless-browser visit (the form and the result apparently share one URL,
gated by server session state), not a page-content difference on our end. It
is reported here as observed, not smoothed over — see §11.

**ImageSmaller EXIF Remover** — arrival and result flow not independently
observed (screenshot blocked, §2); everything here is drawn from the page's
own marketing copy via WebFetch, which is stated as such rather than
presented as an observed journey.

**AI Metadata Cleaner** — arrival: headline + subhead naming every metadata
category it strips, directly above a bordered drop zone ("Drop image here,"
.jpg/.png/.webp/.avif, up to 10 MB) — no run button visible above the fold,
consistent with a live/instant transform once a file lands. Below the drop
zone, a persistent quota strip ("0/3 images today") with a sign-up link is
the very next thing the eye hits — the upsell sits inside the first-touch
path, not after it. Result/exit behavior past the drop was not observed this
pass (no file was submitted, screenshot is above-the-fold only) — carried to
§11.

## 5. Layout + screenshots

**EXIF Remover:** single centered card, ~630px content width on a wide page,
no sidebar. Above the fold: hero copy, an ad banner, then the upload widget
with format tabs and Select/Clear/Bulk-remove/Save-all buttons stacked
tightly. Below the fold, a long-form "Complete Privacy Guide" (what is EXIF,
why remove it, a risk table, a removed-vs-preserved table, a numbered
how-to) — this is the page doing SEO-lander duty and tool duty at once.
Desktop capture only; mobile behavior not verified.

**IMG online:** legacy suite layout — thin top nav bar, then a plain form,
consistent with the same site family documented in `line-ending-detect.md`.
Desktop capture only (and, per §4, the capture itself landed on the site's
error state rather than the form).

**AI Metadata Cleaner:** modern SaaS marketing layout — top nav
(Blog/Pricing/Disclaimer/Other Tools/Sign In/Register), centered hero, one
large bordered drop zone, quota strip directly beneath it. Screenshot is
above-the-fold only (full-page capture hit a WebP encoder size limit on this
very tall page and was not retried full-page — see §11). Mobile not verified.

**ImageSmaller:** not verified visually — no screenshot (§2); described from
WebFetch text only: nav with category dropdowns, feature cards, social
sharing, usage-stat counters, 10-language switcher, per the fetched copy.

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/exif-strip/exifremover.webp`
- `docs/research/forge/exif-strip/imgonline-delete-exif.webp` (captured the
  site's error state, not the form — see §4)
- `docs/research/forge/exif-strip/aimetadatacleaner.webp` (above-the-fold only)

## 6. Their debt

- **exifremover.com:** a third-party ad banner sits inside the primary
  workflow fold on a page whose whole pitch is "your files never leave your
  device" — the one competitor doing the *journey* best also has the clearest
  case of ad-inside-workflow debt to refuse copying.
- **imgonline.com.ua:** dated multi-tool-suite chrome, one option-free form,
  no batch, no inspect step — the weakest journey of the four, table-stakes
  only.
- **imagesmaller.com:** server-side-only ("Cloud-Based Service") for a
  privacy-purpose tool — the upload-required-for-local-work pattern §6.7.10
  calls out directly; a metadata-privacy tool that itself requires an upload
  is a structural contradiction we should not repeat.
- **aimetadatacleaner.com:** a hard daily quota (3 free images) with a
  sign-up prompt inside the first-touch fold — an upsell interruption sitting
  directly in the tool journey, which is exactly the pattern §6.7.10's edge
  table says we structurally do not have to ship (metered wallet, not a
  server-enforced per-day image cap with an account wall).

**取其精华，去其糟粕**: copy exifremover.com's inspect-then-act table and its
explicit removed/preserved split; copy aimetadatacleaner.com's broadened
metadata scope (C2PA/AI-provenance tags); refuse the ad banner, the upload
requirement, and the account-gated quota.

## 7. Domain know-how

1. **The removed/preserved split is not "remove everything with metadata in
   the name."** Image orientation (EXIF tag 274) and the embedded color
   profile (ICC, e.g. sRGB) live in the *same* metadata segments as GPS and
   camera-serial data, but stripping them changes how the image *displays* —
   a naive "delete the whole APP1/EXIF segment" implementation can silently
   rotate or recolor photos on next open. Source: exifremover.com's own
   "Removed vs. Preserved" table, cross-checked against the EXIF 2.32
   specification's definition of the Orientation tag (tag 0x0112) and the
   ICC profile's separate segment (APP2, not APP1) in JFIF/JPEG — i.e. this
   is also an artifact of *which marker segment* a given tag lives in, not
   only which tag it is.
2. **A crop does not remove the EXIF thumbnail.** JPEG EXIF can embed a
   separate compressed thumbnail image (IFD1) independent of the main image
   data; cropping or editing the visible frame does not touch that embedded
   thumbnail unless the tool explicitly regenerates or deletes it. Source:
   exifremover.com's own copy ("Even if you crop or edit a photo, the
   original thumbnail in EXIF data may still show the uncropped version") —
   marketing copy, but it correctly describes a real, well-known JPEG/EXIF
   structural fact (the IFD1 thumbnail pointer), not a fabricated claim.
3. **Metadata is not one segment.** A JPEG can carry EXIF (APP1), IPTC (in
   APP13, Photoshop "8BIM" resource blocks), and XMP (a second, separately
   marked APP1 block with an `http://ns.adobe.com/xap/1.0/` namespace GUID) —
   three independently-positioned blocks that a "strip EXIF" tool can miss if
   it only looks for one marker. Source: exifremover.com's stated scope
   ("EXIF, IPTC, XMP and Photoshop metadata") plus the existing sibling tool
   in this repo (`packages/ai/forge-runtime/src/tools/wave4-longtail.ts`
   `exifViewerTool`), which already reads `tiff / xmp / iptc / icc / jfif /
   ihdr` as distinct segment families via `exifr` — the read side of this
   exact fact.
4. **PNG and WebP carry metadata in different containers than JPEG's marker
   segments** — PNG uses `tEXt`/`iTXt`/`zTXt` chunks (and an `eXIf` chunk in
   newer PNGs) rather than APP1 markers; WebP uses RIFF `EXIF`/`XMP ` chunks.
   A strip implementation that only understands JPEG APP1 will silently do
   nothing on a PNG/WebP file and *report success anyway* if it isn't
   honest about per-format coverage. Source: our own reasoning from the PNG
   (ISO/IEC 15948) and RIFF/WebP container structures — not independently
   re-verified against a competitor's copy this pass, so treat this as an
   engineering constraint to design around (§9.4), not a competitor-sourced
   fact.
5. **AI-generation provenance metadata is a newer, growing metadata family,
   distinct from camera EXIF, that a "photo privacy" framing can miss
   entirely.** C2PA (Coalition for Content Provenance and Authenticity)
   manifests and Stable-Diffusion-style generation parameters (prompt,
   sampler, seed — commonly embedded in PNG `tEXt` chunks by tools like
   AUTOMATIC1111) are both metadata a user may want stripped before sharing
   an AI-generated image, and neither is "EXIF" in the camera sense. Source:
   aimetadatacleaner.com's own captured headline copy, which is the only
   competitor in this set naming this category — recorded as their claim,
   not independently verified against a C2PA sample file this pass (§11).
6. **"The file is unchanged for humans" is the whole point, so the output
   must remain byte-decodable as the same image.** The job is defined by
   subtraction only: same pixels, same dimensions, same visible orientation,
   minus one class of bytes. Any tool that re-encodes/re-compresses the image
   while stripping metadata (as a side effect of, say, round-tripping through
   a decode/re-encode library) has silently turned an Editor-class edit into
   an Optimizer-class lossy transform — a distinction this brief's object
   (root Editor, "remove a span," not "re-encode") depends on getting right.
   Source: our own reasoning, grounded in the Editor-root framing given in
   this task and §6.7.9.

## 8. Chosen archetype

**Drop-and-verdict** — file in → one clear answer (metadata gone, file
otherwise unchanged) → detail on demand (an optional before/after tag count,
not a mandatory inspection step). This is the same archetype §6.7.10's own
table names for **EXIF** specifically, and it matches the object: a user
does not want to configure anything, they want the file back, clean.

- **Instant transform** — wrong: the input is binary file bytes dropped by
  the user, not text typed live; there is no "as you type" surface to make
  live, and a network/worker round-trip for even a small image means a
  visible processing beat exists whether we want it to or not.
- **Configure-then-generate** — wrong: there are no real user-facing options
  that change the *shape* of the output (unlike, say, a `.gitignore`
  generator where stack choice changes the file). The one dial worth
  exposing (keep-orientation, discussed in §9.3) is a checkbox, not a
  configuration surface the tool "regenerates against."
- **Decision wizard** — wrong: the user already knows exactly what they
  want ("get the metadata out"); there is no ambiguous intent to narrow by
  asking questions, unlike a LICENSE chooser.
- **Two-pane compare** — wrong: there is only one file in this operation.
  A before/after *tag list* is a detail-on-demand panel within
  drop-and-verdict, not a second independent input to synchronize against.
- **Inspect-and-drill** — this is exifremover.com's chosen shape (inspect
  the table, then act) and it is a legitimate alternative, but it makes
  inspection the *primary* step and removal secondary; our object is "give
  me the file back clean," so inspection is demoted to an optional detail
  panel rather than the main path (see §9.1 step 3) — this is the closest
  call of the six, and the sibling `exif-viewer` tool already fully owns the
  inspect-and-drill shape for this same payload (§9.4), which is the
  deciding reason not to duplicate it here.
- **Batch queue** — wrong for the Core/sync tier: single-file, in-memory,
  sub-second processing does not need a visible progress queue; batch (if
  ever added) is additive scope for a later `/api/v1/jobs` pass, not the
  default journey (§9.4).

## 9. Our design

### 9.1 Journey

1. **Arrival:** empty drop zone, one line of copy naming exactly what is
   removed (GPS, timestamps, camera/device info, thumbnails, software tags)
   and exactly what is kept (orientation, color profile, dimensions, pixel
   data) — the removed/preserved split from know-how #1, stated up front
   rather than left for the user to discover after the fact.
2. **First touch:** drop or pick one image (JPEG/PNG/WebP — §9.4 ceiling).
   No configuration screen; one optional checkbox, off by default: "also
   strip embedded EXIF thumbnail" (know-how #2), because the vast majority
   of users' privacy risk is GPS/timestamp, and the thumbnail-strip path can
   very slightly increase file size handling complexity for zero benefit to
   users who don't know the thumbnail exists — surfaced, not hidden, but not
   the default extra step.
3. **Result:** near-instant (this is bytes-in/bytes-out with no model, no
   network round-trip beyond the initial upload) — a one-line verdict:
   "Removed N metadata fields (X bytes) — image otherwise unchanged," with a
   collapsed "what was removed" detail panel the user can expand (borrowing
   exifremover.com's inspect table as a *secondary* affordance, per §8, not
   the primary path). No ad, no upsell banner in this fold (refusing both
   exifremover.com's and aimetadatacleaner.com's debt from §6).
4. **Exit:** one download button for the cleaned file. No account, no daily
   quota gate (refusing aimetadatacleaner.com's debt from §6) — the wallet
   meter is the only limiter, and it is stated as such, not hidden behind a
   fake "images today" counter.
5. **Empty state:** the arrival state described in step 1 *is* the empty
   state — no separate illustration needed.
6. **Error state:** malformed/non-image bytes, or a format outside the
   supported set (§9.4) → a stable error code (`unsupported_format` /
   `no_metadata_found` — the latter is a *successful*, not-an-error verdict:
   "this file already has no removable metadata," matching the honest
   read of know-how #4 rather than claiming a strip happened when nothing
   was found).
7. **Large input:** size ceiling stated up front (matching the 10–50 MB range
   observed across competitors in §3); over the ceiling is a clear
   `file_too_large` error before any processing starts, not a silent hang.

### 9.2 Layout

Single column, no sidebar, per house rules (no borders — the drop zone is
set off by a tonal background shift, not a dashed border, unlike every
competitor captured in §5). Above the fold: the one-line removed/preserved
copy, the drop zone, and (once a file is processed) the verdict line and
download button, in that same vertical slot — the result replaces the empty
state in place rather than pushing it down the page, so there is no
above-the-fold/below-the-fold jump between empty and filled states. The
detail panel (expanded tag list, per step 3) sits directly under the verdict
line, collapsed by default, using `@nebutra/ui/primitives` disclosure — not a
second page, not a modal. Mobile: single column already; the drop zone
becomes a tap-to-pick target (native file input via `@nebutra/ui/primitives`
per the form-controls house rule, `data-allow-native` on the underlying
`type="file"` input triggered by a styled button, matching the documented
escape-hatch pattern in CLAUDE.md).

### 9.3 Must-have

- **Parity:** JPEG + PNG + WebP support, matching or exceeding the narrowest
  reached competitor (imgonline: JPEG-only) and approaching the widest
  (exifremover.com: six image formats plus video/PDF — video/PDF explicitly
  out of scope here, §9.4).
- **Parity:** preserve visible orientation, color profile, dimensions, and
  pixel data — the removed/preserved split (know-how #1) is table stakes,
  not a differentiator; getting it wrong is a regression a user can see
  (rotated photo) or notice later (recolored photo).
- **Parity:** a clear stated privacy posture and a size ceiling before
  upload, matching what every reached competitor states somewhere on page.
- **Edge:** the `no_metadata_found` verdict as a distinct, honest outcome
  rather than reporting a strip on a file that had nothing to strip (no
  reached competitor states this distinction).
- **Edge:** a structured, schema-typed verdict object (§9.6) available to
  agent callers with no reached competitor offering anything past a
  download link.

### 9.4 Deliberately skipped

- **Video (MP4/MOV) and PDF metadata stripping** — exifremover.com covers
  both, but each is a materially different container/parser problem (video
  container metadata atoms; PDF `/Info` dictionary and XMP streams) that
  would make this brief's object three tools wearing one name. Scope this
  brief to still images only; a video- or PDF-specific sibling is a separate
  brief if demand justifies it.
- **HEIC/HEIF and AVIF and GIF input** — exifremover.com supports these;
  we do not, on this pass, because our runtime's existing EXIF-adjacent
  sibling (`exifViewerTool`, `packages/ai/forge-runtime/src/tools/wave4-longtail.ts`)
  already leans on `exifr` for read, and HEIC in particular needs a
  dedicated container parser (ISO BMFF) beyond what a JPEG/PNG/WebP-focused
  strip needs — tracked as a follow-up, not silently dropped (§11).
- **Merging with the existing `exif-viewer` tool** — that sibling only
  reads: it does not write. We ship the "write" sibling this brief describes,
  and both tools should cross-link as related-by-root/related-by-object once
  built — not merge into one tool, since read and write are different
  side-effect classes (`pure`/read-only-analysis vs. pure/transform-producing
  a new artifact) and different agent-call shapes.
- **Inspect-and-drill as the primary journey** — exifremover.com's own shape
  (§8); we keep a collapsed detail panel but do not make table-browsing the
  main path, because that is the `exif-viewer` sibling's job, not this one's.
- **Batch/multi-file upload** — exifremover.com's 20-file batch is real
  value, but batch is the `/api/v1/jobs` **Processor** root's shape by
  design (§6.7.9's "Processor is a shape, not a keyword" framing) — a
  future batch wrapper over this same pure function, not part of this
  Core-tier sync tool.
- **Account / sign-up / daily quota** — refusing aimetadatacleaner.com's
  debt outright (§6, §9.1 step 4); the wallet meter is the only limiter.
- **Ads inside the workflow** — refusing exifremover.com's debt outright
  (§6); if Forge ever runs ads on the free human tier, per §6.7.10's own
  policy they stay outside the tool workflow, never inside it.
- **C2PA/AI-provenance tag stripping (know-how #5)** — a real, verified-as-
  claimed capability of aimetadatacleaner.com, but C2PA manifest parsing is
  a distinct, more complex data structure (signed JUMBF boxes) than classic
  EXIF/IPTC/XMP removal, and stripping a *signed* provenance manifest has
  different implications (defeats an authenticity claim, not just a privacy
  leak) worth a deliberate, separate design pass rather than folding
  silently into a "remove EXIF" tool. Flagged as a real gap, not silently
  dropped (§11).

### 9.5 Differentiator

Checked against §3 and §6, not asserted: none of the four reached
competitors expose a machine-callable contract — every one is a
download-a-file human page with no OpenAPI/MCP surface, no structured
verdict, and (per §6.7.10's edge table, actually checked here) real
per-tool debt we can refuse rather than merely claim to. Concretely, for
this tool:
- A typed verdict (`fieldsRemoved`, `bytesRemoved`, per-format coverage
  flag) an agent can branch on, where every reached competitor returns only
  a file.
- Honest `no_metadata_found` as a distinct outcome (know-how #1/#4), which
  no competitor's stated copy claims to distinguish.
- No ad, no account gate, no daily quota inside the workflow — a checked
  refusal of two competitors' actual, observed debt (§6), not a generic
  "we have no ads" claim.
- Same implementation, human page and agent call — the sibling `exif-viewer`
  (read) and this tool (write) compose on one wallet, one schema family,
  which no single-purpose competitor in this set can offer.

### 9.6 I/O contract

```text
input:   {
  imageBase64: string,          // data-URL or raw base64, matching the
                                 // existing exifViewerTool convention
  keepThumbnail?: boolean       // default false — see §9.1 step 2
}
output:  {
  imageBase64: string,          // cleaned file, same container format
  format: "jpeg" | "png" | "webp",
  bytesIn: number,
  bytesOut: number,
  fieldsRemoved: number,
  removedSegments: string[],    // e.g. ["exif","iptc","xmp"] — which of the
                                 // three families (know-how #3) were present
                                 // and stripped, so a caller can tell
                                 // "nothing to remove" from "removed everything"
  preserved: { orientation: boolean, colorProfile: boolean },
  verdict: "stripped" | "no_metadata_found"
}
sideEffect: pure
meterId: forge.image.exif_strip
roots:   [editor, optimizer?]   // "optimizer" only if bytesOut reporting is
                                 // judged to overlap that root's contract —
                                 // orchestrator call, not decided here
objects: [image]
```

Error codes (sketch, matching the stable-error-code house convention seen in
`file-type-detect.md`): `unsupported_format`, `file_too_large`,
`decode_failed` (bytes are not a valid image in the declared format).

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — design only (§9.1–9.2) |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — sketch only (§9.6) |
| 3 | MCP tool registration (Agent-eligible tools) | Not started |
| 4 | SKILL.md (what / when / how / limits) | Not started |
| 5 | Meter id + wallet hooks | Not started — `forge.image.exif_strip` proposed (§9.6) |
| 6 | Side-effect class declared | **Met** — `pure` (§9.6); bytes in, bytes out, no external call |
| 7 | Stable error codes; `request_id` on server paths | Not started — codes sketched (§9.6) |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — design leans client/ephemeral-server (§9.4 mirrors exifremover.com's stance) but implementation decides actual runtime |
| 9 | Decl/ads: intent title, unique value, related tools | Not started |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — likely reuses `exifr` (already a runtime dependency via the sibling `exifViewerTool`) for read-side parsing, plus our own segment-removal write path; not yet decided which library, if any, performs the write |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 |

## 11. Gaps and open questions

- [ ] **Not reached:** pics.io metadata-remover, verexif.com, imagy.app,
      exifremove.com — named in the task's demand evidence but not visited
      this pass. Any feature/journey/layout claim about them would be
      fabrication; none is made.
- [ ] **Not reached (screenshot):** ImageSmaller EXIF Remover — HTTP 403 on
      the one capture attempt; its feature/journey description in §3–§4 is
      explicitly sourced from WebFetch marketing copy, not observed behavior.
- [ ] **Not reached (text):** AI Metadata Cleaner — WebFetch returned HTTP
      403; its description is sourced from the captured screenshot's visible
      text (above-the-fold only), not from reading the rest of the page.
- [ ] **Anomalous capture:** the imgonline.com.ua screenshot rendered the
      site's own error page ("Error, image file was not specified") on two
      attempts, rather than the upload form WebFetch's text extraction
      returned for the same URL — recorded as observed in §4, not smoothed
      into a form-page description.
- [ ] **Inferred, not measured:** the framing of exifremover.com as "the
      leading purpose-built tool" and imgonline as "an older, high-ranking
      incumbent" both come from the task's own supplied competitor
      annotations, not from an independent ranking check performed this
      pass — carried forward as the task's stated context, not re-verified.
- [ ] **Deferred — PNG/WebP chunk-level removal implementation detail (know-how
      #4):** stated from our own reasoning about container formats, not
      cross-checked against a competitor's implementation notes (none reached
      published implementation-level detail). Reopen when implementation
      starts: verify against the PNG and RIFF/WebP specs directly, and against
      a real `libpng`/`sharp`/`exifr`-adjacent library's actual behavior on
      sample files with tEXt/eXIf/RIFF EXIF chunks.
- [ ] **Deferred — scoped-out formats and features:** video/PDF,
      HEIC/HEIF/AVIF/GIF input, and C2PA/AI-provenance tag stripping are all
      named explicitly as scoped-out (§9.4) with the reason and, where
      relevant, a reopening trigger — not silently dropped.
- [ ] **§9 fully written** — no subsection left blank this pass.
- [ ] **Pain named in §1 answered:** the GPS/timestamp/serial-number pain and
      the "a crop doesn't remove the thumbnail" pain (know-how #2) are both
      answered directly by §9.1 steps 1–3 and the `keepThumbnail` option in
      §9.6.
- [ ] **Untested claim to verify at implementation time, not before:**
      whether the existing `exifr` dependency (already used by the sibling
      `exifViewerTool`) exposes a write/strip path, or whether the write side
      needs its own segment-splicing implementation (JPEG APP1 removal is a
      byte-copy operation that does not strictly require a full EXIF parser
      to perform — only to *report* what was removed, per §9.6's
      `removedSegments` field). This is an implementation decision
      deliberately left open here, not a research gap.
