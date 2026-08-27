# Tool brief: `image-rotate-flip`

Root: **Editor** (09), per §6.7.2a / §6.7.9. Object: raster image bytes.
Tier: `Core` (§6.5 tiering table) — high, stable, single-purpose demand; a
direct-manipulation human page plus a pure-function agent contract.

**Status:** `research-complete` — teardown on file (gate 11 met), archetype
chosen (gate 12 met), no implementation code touched.

## 1. Demand

- **JTBD:** "This photo is sideways / upside down / mirrored — fix its
  orientation and give me the file back," without opening a full editor. A
  30-second corrective action, not a creative edit.
- **Keywords:** rotate image online, flip image online, rotate picture 90
  degrees, mirror image, flip photo horizontal, rotate jpg, image rotation
  tool, 图片旋转, 图片翻转 (per the assignment's WebSearch framing — one of the
  oldest, highest-volume single-purpose image-tool categories on the web).
- **Pain:** phone photos land in the wrong EXIF-implied orientation after
  upload to a system that ignores EXIF; screenshots and scans come in
  sideways; a mirrored/selfie-camera image needs un-flipping before use in a
  document or listing. Users want the *exact same image*, reoriented, with no
  quality loss and no re-interpretation of content — a request that a generic
  photo editor answers with far more friction (open editor, find rotate tool,
  export) than the task deserves.

## 2. Competitors (named, reached, captured)

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| img2go — Rotate Image | https://www.img2go.com/rotate-image | Yes — WebFetch + screenshot | [`img2go-rotate-image.png`](../../research/forge/image-rotate-flip/img2go-rotate-image.png) |
| ResizePixel — Rotate Image | https://www.resizepixel.com/rotate-image | Yes — WebFetch + screenshot | [`resizepixel-rotate-image.png`](../../research/forge/image-rotate-flip/resizepixel-rotate-image.png) |
| Imagy — Rotate Image | https://imagy.app/rotate-image/ | Yes on this pass — WebFetch + screenshot both succeeded (status 200). The assignment's incoming candidate list marked this one `reached: false`; that was true of an earlier attempt, not this one — see §11. | [`imagy-rotate-image.png`](../../research/forge/image-rotate-flip/imagy-rotate-image.png) |

Capture with:

```bash
node scripts/research-screenshot.mjs "<url>" "docs/research/forge/image-rotate-flip/<name>.png"
```

`docs/research/forge/` is gitignored: the captures are local reference
material, this brief is the committed deliverable, and anyone can regenerate
them from the URLs above.

All three competitors were reached on this pass — no "not reached" row to
carry forward, but see §11 for the discrepancy against the incoming brief.

## 3. Feature inventory

**img2go — Rotate Image.**
- Core strength: one page covers presets (90° CW, 90° CCW, 180°) **and** a
  free custom-angle slider from −180° to +180° in 1° steps with live preview,
  **and** independent Flip Horizontal / Flip Vertical toggles — the widest
  single-page control set of the three. Multiple upload paths: drag-drop,
  click, paste, URL, or cloud (Google Drive, Dropbox, OneDrive).
- States "12 popular image formats: JPG, PNG, GIF, WebP, BMP, EPS, HDR/EXR,
  ICO, SVG, TGA, TIFF, and WBMP," output "preserves the original format."
  Marketing copy states 90/180/270° rotation is "lossless for all supported
  formats," and that custom angles "preserve the original resolution and
  color depth" (resampling implied but not detailed — not independently
  verified against actual output bytes).
  This is the tool's own marketing claim, not an observed pixel-level
  verification on our part.
- Privacy claim (marketing copy, not verified): "encrypted connections, files
  are never shared with third parties."
- No batch mode, no stated file-size limit, no signup gate, no ads, no
  developer API mentioned on this page.

**ResizePixel — Rotate Image.**
- Core strength: the plainest of the three — rotate left/right by 90° only,
  with an explicit note that beyond-90° rotation requires clicking multiple
  times ("turn the photo clockwise or counterclockwise multiple times"). No
  custom-angle slider, no flip controls, no arbitrary-angle input at all —
  this contradicts the assignment's premise that ResizePixel offers
  "arbitrary-angle rotation with a live preview"; what was actually found on
  this page is 90°-step-only rotation. That premise is not supported by what
  WebFetch returned and should not be repeated as fact — flagged in §11.
- Formats: JPG, GIF, PNG, BMP, TIFF, WEBP. States rotated pixel data stays
  intact (lossless claim, marketing copy).
- Has an "Edit a sample image" trial link and page-level ad space noted; no
  signup/paywall, no API.

**Imagy — Rotate Image.**
- Core strength: broadest scope of the three by a wide margin. Presets (90°
  L/R, 180°) plus a slider for arbitrary angles, flip horizontal/vertical/both
  — and, uniquely, three **fit modes for non-90° angles**: "Expand Canvas"
  (grow output to hold the whole rotated image), "Crop to Fill" (keep original
  dimensions, crop the rotated overhang), "Fit Inside" (scale rotated content
  to stay within original bounds). This is a real design fork the other two
  don't surface at all, because they only support 90°-step rotation where the
  problem doesn't arise.
- States support for a long input list including AVIF, APNG, HEIC/HEIF, GIF,
  MP4 (video!), RAW, PSD, SVG, and others; output list is narrower (AVIF, BMP,
  GIF, JXL, JPG, PNG, SVG, TIFF, WebP). States "full support for animated
  GIFs, animated WebP, and APNG files" including "animation timing and
  quality preservation." These are the page's own stated claims — not
  independently verified frame-by-frame on our part.
- Privacy claim: "All processing happens locally in your browser using
  WebAssembly technology. Your images are never uploaded to any server." This
  is the strongest privacy posture of the three, and if true, means Imagy's
  entire tool runs client-side with zero server round-trip.
- No stated file-size limit, no visible ads, no signup, no API documentation.

**Cross-competitor read:**
- **Table stakes:** 90°/180°/270° rotation, at least one flip axis (or two on
  img2go/Imagy), drag-drop + click upload, live preview before commit,
  download as the same format you uploaded.
- **Worth adopting (only one does it):** img2go and Imagy's free-angle slider
  with live preview; Imagy's three fit-mode choices for non-90° rotation
  (Expand / Crop / Fit); Imagy's client-side-only processing claim.
- **Nobody does (possible edge):** none of the three exposes a documented
  API/MCP surface; none states an explicit maximum file size; none shows a
  numeric angle **input field** next to the slider (all three appear to be
  slider-only for custom angles, going by their own descriptions — an exact
  "type 37.5°" path is not evidenced anywhere).

## 4. Journey maps

**img2go:**
1. Arrival: tool page with upload zone (drag-drop / click / paste / URL /
   cloud picker) as the first thing on the page.
2. First touch: drop or select a file → image loads into a preview canvas.
3. Result: preset buttons (90° CW/CCW/180°) apply instantly; the custom-angle
   slider updates the preview live as it's dragged; flip toggles apply
   instantly. Nothing is downloaded yet — this is a live, no-page-reload edit
   loop with a separate, explicit "Apply" and download step.
4. Exit: click Apply → download in the original format.
5. Large/malformed input: not observed — no error path was surfaced by
   WebFetch's text extraction (page copy, not an actual failed upload was
   tested).

**ResizePixel:**
1. Arrival: upload prompt is first; a "New to it? Edit a sample image" link
   offers a zero-upload trial path — notable because it removes the "do I
   have to give up a real file just to see how this works" hesitation.
2. First touch: upload → rotate-direction buttons only (left/right 90°).
3. Result: repeated clicks stack additional 90° turns (there is no true
   "180°" or arbitrary-angle single action — 180° is two clicks of 90°).
4. Exit: download.
5. Large/malformed input: not observed from page copy.

**Imagy:**
1. Arrival: upload zone first.
2. First touch: upload → live preview.
3. Result: presets, slider, flip toggles apply live in preview, same
   interaction shape as img2go but with the added **fit-mode choice**
   (Expand / Crop / Fit) that only becomes relevant once a non-90° angle is
   chosen — implying the fit-mode control likely appears conditionally
   (not confirmed from page copy alone, since WebFetch returns text, not a
   live-interaction trace).
4. Exit: download; batch note states "download individually or as ZIP
   archive" for multi-file uploads — this is the only one of the three that
   states an explicit batch/multi-upload path.
5. Large/malformed input, animated-format edge cases (e.g. rotating an
   animated GIF where fit-mode and per-frame consistency interact): not
   observed — page copy states the capability exists but does not describe
   what happens on a malformed or oversized file.

**Common thread across all three:** none of the three journeys gates the
*preview* behind a click — upload alone produces a visible image, and preset
rotations apply live. Only the final **commit-to-file** step (Apply/download)
is a deliberate, separate action in every case; this matches a "bounded edit
you can preview before committing" shape rather than either a pure instant
transform or a multi-step configure-then-generate wizard.

## 5. Layout + screenshots

- **img2go:** single centered tool card — upload zone at top, then a live
  preview area, with a control rail (presets, slider, flip toggles) placed
  directly under/beside the preview. No sidebar visible in the captured
  above-the-fold view. See `img2go-rotate-image.png`.
- **ResizePixel:** simplest of the three — upload zone, then left/right
  rotate buttons directly under the preview, ad space present on the page.
  See `resizepixel-rotate-image.png`.
- **Imagy:** upload zone, live preview, and the widest control surface of the
  three (presets + slider + flip + fit-mode). See `imagy-rotate-image.png`.
- **Mobile:** not verified for any of the three — all three captures are
  desktop-viewport (script default). No mobile-specific layout claim is made
  here.

**Screenshots on file** (gitignored local reference — regenerable from the
URLs in §2):

- `docs/research/forge/image-rotate-flip/img2go-rotate-image.png`
- `docs/research/forge/image-rotate-flip/resizepixel-rotate-image.png`
- `docs/research/forge/image-rotate-flip/imagy-rotate-image.png`

## 6. Their debt

- **img2go:** no stated file-size limit and no visible signup gate per page
  copy, but multiple sibling tools and cloud-import options suggest the usual
  multi-tool-site chrome around the core card (not itemized here — not
  independently browsed beyond the rotate page). No API.
- **ResizePixel:** the weakest functional surface of the three — 90°-only
  rotation with no flip and no arbitrary angle, plus stated ad space on the
  page. A user who needs anything beyond a quarter-turn bounces immediately.
  No API.
- **Imagy:** broadest feature set but the most sweeping, least-verified
  format claims (MP4 "rotation" of a video file sitting in the same list as
  static-image formats is a scope smell — rotating a video is a materially
  different operation from rotating a still frame, and the page bundles it
  into one undifferentiated format list without explaining the difference).
  No API despite the broadest claimed capability.
- **All three:** no documented OpenAPI/MCP surface — entirely human-only
  pages. None publishes a numeric exact-angle text input alongside its
  slider, which is a real usability gap for anyone who knows the exact
  correction angle (e.g. "this scan is off by 2.3°").

## 7. Domain know-how

1. **90°-multiple rotation is lossless and dimension-swapping; anything else
   is lossy resampling that changes canvas size.** A rotation by exactly 90°,
   180°, or 270° can be implemented as a pure pixel-array transpose/reversal
   with no interpolation — width and height swap on 90°/270°, stay put on
   180°, and no pixel value is ever blended. Any other angle requires
   resampling (nearest/bilinear/bicubic) which necessarily invents or blends
   pixel values at the new canvas edges. A naive implementation that runs the
   same resampling code path for a 90° rotation as for a 37° one either
   needlessly degrades a case that should be lossless, or (worse) silently
   introduces a fractional-pixel seam at 90° that a careful user will notice.
   Source: our own reasoning from standard 2D raster-rotation mechanics,
   consistent with img2go's own claim that "90, 180, or 270 degrees is
   lossless for all supported formats" while custom angles are described
   separately as requiring resampling.
2. **A non-90° rotation forces a canvas-size decision that 90°-step rotation
   never has to make.** Imagy is the only competitor that surfaces this as an
   explicit choice (Expand Canvas / Crop to Fill / Fit Inside) — the other two
   don't need to, because they don't offer arbitrary angles at all. Once an
   angle isn't a multiple of 90°, the rotated rectangle's bounding box is
   strictly larger than the original, so *something* has to give: either the
   canvas grows (introducing new corner pixels that must be filled — normally
   transparent for formats with alpha, or a fill color for formats without),
   or the image is cropped to the original box (losing the rotated corners),
   or it's scaled down to fit inside the original box (losing no content but
   shrinking everything). A naive "just rotate and keep image dimensions"
   implementation implicitly chooses "crop" without telling the user, which
   silently destroys parts of the image. Source: Imagy's own stated feature
   list (three named fit modes) plus our own geometric reasoning for why the
   choice is unavoidable past ±0.01° off a multiple of 90.
3. **Flip and rotate do not commute when both are non-trivial, and "flip then
   rotate 90°" is a different image from "rotate 90° then flip."** For a
   180°-flip-equivalent case they happen to agree, but in general a
   horizontal flip followed by a 90° clockwise rotation is equivalent to a
   90° counter-clockwise rotation followed by a *vertical* flip, not to
   applying them in the order the user clicked buttons naively assuming
   independence. A naive implementation that applies "current flip state" and
   "current rotation state" as two independent, order-agnostic properties
   (e.g. two separate CSS-transform-like flags multiplied together in the
   wrong basis) can silently produce mirror-image output that looks *plausible*
   but is wrong — this class of bug is invisible on symmetric test images and
   only shows up on asymmetric ones (e.g. an image containing text). The
   correct model treats each user action as a matrix composed onto a running
   transform, applied in the order the user performed the actions. Source:
   our own reasoning from standard 2D affine-transform composition (rotation
   and reflection matrices are non-commutative under composition in general).
4. **EXIF orientation metadata is a silent pre-existing "rotation" that must
   be resolved before any user-requested rotation, or the two compound
   incorrectly.** Many phone-camera JPEGs store the sensor's native
   (unrotated) pixel data plus an EXIF `Orientation` tag (values 1–8,
   covering rotation and mirroring) that viewers use to display the image
   right-side-up. If a tool reads raw pixels without first "baking in" (or at
   least accounting for) the EXIF orientation, a user who requests "rotate
   90° clockwise" on a photo that already displays upright-only-because-of-
   EXIF will get an output that is rotated an *additional* 90° relative to
   what they see on screen — because their intended 90° was measured against
   the EXIF-corrected view, not the raw pixel grid. None of the three
   competitor pages mentions EXIF handling explicitly in their marketing
   copy, which is itself a real, unaddressed risk area — every rotate tool
   that reads/writes JPEGs has to make an EXIF decision (bake it in on load,
   strip the tag on save, or actively preserve+update it) and getting it
   wrong produces a "my rotate did nothing" or "my rotate did double" support
   complaint. Source: our own reasoning from the well-known EXIF Orientation
   tag mechanic (a standard JPEG/EXIF behavior, not any one competitor's
   documented claim — flagged as our own domain knowledge, not sourced from
   a competitor's copy).
5. **Rotating an animated format (GIF/APNG/animated WebP) is per-frame work,
   not a single-image operation, and every frame must get the identical
   transform to avoid a jitter artifact.** Imagy claims "animation timing and
   quality preservation" for rotated animated GIF/WebP/APNG — this implies
   decoding every frame, applying the same rotation/flip/fit-mode to each,
   and re-encoding with the original frame delays intact. A naive
   implementation that treats "rotate an animated GIF" as "rotate its first
   frame" produces a broken, single-static-frame-looking result; one that
   rotates frames independently with slightly different resampling per frame
   (e.g. re-deciding a fit-mode canvas size per frame) can produce a visibly
   jittering/resizing animation. Source: Imagy's own stated claim — not
   independently verified against an actual rotated GIF output on our part.
6. **A JPEG re-encoded after any raster edit is a lossy round-trip even when
   the *geometry* is lossless.** For 90°/180°/270° rotation of a JPEG
   specifically, some implementations can perform a true "lossless JPEG
   rotation" by manipulating DCT coefficient blocks directly (no
   decode-resample-reencode cycle) — a well-known technique (e.g. `jpegtran
   -rotate`) that avoids the generation-loss a naive
   decode-to-raw→rotate→re-encode-as-JPEG pipeline introduces. None of the
   three competitors' pages describe their internal pipeline in enough
   detail to confirm which approach they use; img2go's "lossless for all
   supported formats" claim is consistent with either approach for exact-90°
   angles but doesn't specify which. This is a real implementation-quality
   fork worth deciding deliberately rather than defaulting to a naive
   decode/re-encode path for JPEG's 90°-step case. Source: our own domain
   knowledge of the JPEG lossless-rotation technique (a well-established
   image-processing practice, not sourced from any competitor's copy).

## 8. Chosen archetype

**Instant transform** — the user supplies one image and one small set of
transform parameters (angle, flip axis, fit mode for non-90°), sees the
result update live, and downloads the same-shape output. There is no
multi-step configuration wizard, no comparison of two things, no queued job,
and no open-ended structure to explore — every one of the three competitors
converges on exactly this shape (upload → live preview reacting to
button/slider input → single commit/download action), which is strong,
convergent evidence this is the right archetype for the category, not a
"generic form + button" default chosen for lack of imagination.

Why the other six are wrong here:
- **Configure-then-generate** — this archetype fits when the output can't be
  previewed cheaply before a "generate" step (e.g. an AI generation call).
  Rotation/flip are cheap, instant, and fully previewable client-side;
  gating them behind a separate "configure, then generate" click (as
  img2go's "Apply" button superficially resembles) would just be an
  unnecessary step-tax on an operation the browser can render live — which is
  exactly why our design keeps the live preview un-gated and reserves a
  single commit action only for the final file-export step (§9.2).
- **Decision wizard** — the user already knows exactly what they want (turn
  this 90° left, or flip it) the moment they arrive; there's no multi-step
  question sequence needed to narrow down intent.
- **Drop-and-verdict** — that shape fits a diagnostic tool that produces one
  answer about an input (line-ending-detect's own chosen archetype). Rotation
  doesn't produce a verdict about the image, it produces a transformed image
  — the opposite of a read-only inspection.
- **Two-pane compare** — nothing is being diffed between two inputs; there is
  one image and one output, and the "compare" the user actually wants is
  simply the live preview against their memory of the original, not a
  side-by-side of two independent artifacts.
- **Inspect-and-drill** — there is no decoded structure to explore layer by
  layer (unlike a JWT-claims or JSON-tree inspector); the entire interaction
  surface is a handful of flat, independent parameters (angle, flip, fit
  mode) applied to one flat object (the image).
- **Batch queue** — real for N-images-at-once (Imagy claims exactly this,
  "download individually or as ZIP"), but that is the Processor root's job
  per §6.7.9 ("same tools, over many files, without blocking"), not this
  Editor-root tool's primary shape — deliberately skipped here, see §9.4.

## 9. Our design

### 9.1 Journey

1. **Arrival:** empty state shows a single upload target ("Drop an image, or
   click to browse") — no options visible before an image exists, since
   presets/slider/flip/fit-mode all operate on a specific image's dimensions
   and orientation.
2. **First touch:** user drops or selects a file. On load: (a) EXIF
   `Orientation` is read and baked into the working canvas immediately if
   present and non-default (domain know-how #4), so every subsequent
   rotation the user requests is measured against what they actually see, not
   against raw sensor pixels; (b) the image renders at full fidelity in a
   live preview area.
3. **Result:** preset buttons (90° CW, 90° CCW, 180°) and flip toggles
   (Horizontal, Vertical) apply instantly with no intermediate "Apply" click
   — these are lossless, cheap operations (know-how #1) with nothing to lose
   by committing them live. A free-angle control (slider **plus** a
   paired numeric degree input field, closing the exact-angle gap named in
   §6) becomes active once the user engages it; the moment the angle is not a
   multiple of 90°, a fit-mode choice (Expand Canvas / Crop to Fill / Fit
   Inside, matching Imagy's naming since it is the clearest of any observed
   phrasing) appears next to it, defaulting to Expand Canvas (the only mode
   that loses zero image content — see know-how #2).
4. **Exit:** a single "Download" action commits the currently-previewed
   transform to an output file in the original input format at the original
   quality/bit-depth, preserving EXIF orientation as `Orientation: 1`
   (normal) going forward rather than silently leaving a stale tag pointing
   at the pre-rotation orientation. A "Copy" path is not offered for images
   (unlike text tools) since large binary payloads don't belong on the
   clipboard reliably — download is the only exit.
5. **Empty state:** the upload target itself, with no destructive action
   possible before a file exists.
6. **Error state:** an unreadable/corrupt file surfaces a plain message
   ("Could not read this file as an image") rather than a blank or frozen
   preview; a file whose format decodes but whose EXIF block is malformed
   falls back to treating orientation as normal (tag 1) rather than crashing.
7. **Large-input path:** very large source images (e.g. a 40+ MP camera
   original) still render into the live preview at a downscaled *display*
   resolution for interaction smoothness, but the export step always
   operates on and writes out full original resolution — the preview must
   never be the thing that gets downloaded.
8. **Animated-format path (deferred, see §9.4):** uploading a GIF/APNG/
   animated WebP is explicitly out of scope for v1 and shows a plain notice
   ("Animated images aren't supported yet — only the first frame would be
   affected") rather than silently mangling the animation (know-how #5)."

### 9.2 Layout

- **Single column, no sidebar, no borders** (house rule): upload target at
  top, live preview directly below it filling most of the vertical space,
  and a compact control strip below/beside the preview holding: preset
  buttons, flip toggles, the angle slider + numeric input pair, and the
  conditional fit-mode selector (using the DS `Select` primitive, never a
  raw `<select>`, per the form-controls rule).
- Panels are separated by whitespace and a tonal background shift, not a
  border line, per the house "no borders" rule.
- Mobile: preview stacks full-width above the control strip; the numeric
  angle field and slider stay paired in one row down to small widths since
  they are the exact-angle path power users need most.
- The single commit action ("Download") is the only primary-styled button on
  the page; presets/flip/angle are all secondary/ghost styling since they
  only affect the live preview, not the committed file, until Download is
  pressed.

### 9.3 Must-have

1. **90°/180°/270° preset rotation, lossless** — parity across all three
   competitors; table stakes.
2. **At least one flip axis** — parity (img2go and Imagy both have H+V;
   ResizePixel has neither, which §6 identifies as the weak point that makes
   it the least capable of the three).
3. **Live preview with no gate before the final commit step** — parity with
   all three competitors' journeys (§4); this is the baseline UX shape of the
   category, not our edge.
4. **Free-angle rotation with a numeric input, not slider-only** — **edge**.
   None of the three competitors' own descriptions mention an exact-degree
   text field; all three appear to be slider (or preset-only, for
   ResizePixel) input. A user correcting a scan by a known exact angle (e.g.
   "2.3°") is underserved by drag-only sliders.
5. **Correct EXIF-orientation handling on load and on save** (know-how #4) —
   **edge**. Not one of the three competitors' marketing copy mentions this
   at all; getting it right (or even just explicitly, visibly right) is a
   real, unaddressed gap across the category.
6. **Non-90° fit-mode choice (Expand / Crop / Fit)** — parity with Imagy
   only, edge relative to img2go and ResizePixel (which don't expose the
   choice at all, either because they don't support arbitrary angles or they
   silently pick one behavior).

### 9.4 Deliberately skipped

- **Video "rotation"** — Imagy's own format list bundles MP4 alongside static
  formats; rotating a video is a fundamentally different operation
  (re-encoding a stream, not transforming a raster) and belongs to a
  video-processing tool/root if it ever gets built, not to this Editor-root
  image tool. Scoping this out keeps the tool's contract honest (§6.5 gate 6
  side-effect class stays clean: pure transform on one image, not a
  transcoding job).
- **Animated-format rotation (GIF/APNG/animated WebP)** — real and valuable
  (Imagy claims it), but per-frame animated processing is materially heavier
  work (know-how #5) that belongs to a Processor-root batch/async job
  wrapping this same per-frame transform logic (§6.7.9's own framing: "same
  tools, over many files, without blocking"), not bolted onto a v1 Editor
  tool whose contract should stay a single-image pure function. Deferred,
  not refused — the trigger to revisit is real demand data or a Processor
  root that already exists to host it.
- **Batch/multi-file upload with ZIP download** — same reasoning as above:
  Imagy's "download individually or as ZIP" is a genuine multi-file
  capability that is the Processor root's job, not this tool's.
- **Cloud-import pickers (Google Drive / Dropbox / OneDrive), paste-from-URL
  import** — img2go offers these; convenient, but adds external OAuth/network
  surface area disproportionate to a "rotate an image" tool's job. Drag-drop
  and click-to-browse cover the core JTBD.
- **Ad space / affiliate boxes / signup gates** — none observed as core to
  the *workflow* on any of the three, so nothing to explicitly refuse beyond
  the house rule of carrying none of it.

### 9.5 Differentiator

- **Correct EXIF-orientation handling, stated explicitly to the user** (know-
  how #4) — a gap no competitor's copy addresses at all; both a UX edge (no
  silent "my rotate did the opposite of what I clicked" complaints) and an
  agent-contract edge (a documented `exifHandled: boolean` output field an
  agent can trust instead of guessing).
- **Exact-degree numeric input alongside the slider** — closes a real
  interaction gap (§6) none of the three competitors appear to offer.
- **Agent contract**: a single documented JSON operation (angle, flip axis,
  fit mode in → transformed image out) with OpenAPI + MCP registration. None
  of the three competitors publish any API; an agent doing "normalize a batch
  of scanned document photos before OCR" today has to script around a human
  page or shell out to ImageMagick/Sharp directly. This tool gives it a
  stable, versioned contract instead.
- **No ad clutter inside the workflow** (ResizePixel carries ad space; ours
  carries none), though this is a structural house-rule edge shared across
  the whole Forge station, not unique to this tool specifically — named here
  because it is a real, checkable difference against ResizePixel.
- **Not claimed as a differentiator:** the free-angle slider (img2go and
  Imagy already have it — parity, per §9.3 #4's numeric-input framing, not a
  novel capability) and the fit-mode choice (Imagy already has it — parity
  per §9.3 #6).

### 9.6 I/O contract

```text
input:
  image: binary                         # required — raw file bytes
  angle: number                         # degrees, -180..180, default 0
  flipHorizontal?: boolean              # default false
  flipVertical?: boolean                # default false
  fitMode?: enum<expand, crop, fit>     # only meaningful when angle is not a multiple of 90; default "expand"
  outputFormat?: string                 # defaults to input format when omitted

output:
  image: binary                         # transformed file, same format unless outputFormat overridden
  width: number
  height: number                        # both post-transform; differ from input when angle rotates by 90/270 or fitMode="expand" on a non-90 angle
  exifOrientationHandled: boolean       # true if a non-default EXIF Orientation tag was detected and baked in before applying the requested transform
  lossless: boolean                     # true only for angle in {0, 90, 180, 270} with no resampling required

sideEffect: pure
meterId: forge.editor.image-rotate-flip
roots:   [Editor]
objects: [image]
```

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Meter id proposed in §9.6; wallet hooks not started |
| 6 | Side-effect class declared | Declared `pure` in §9.6 |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief; competitors' own privacy claims (img2go, Imagy) are unverified marketing copy, not a basis for our own claim |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 |

**内部验收状态：** `research-complete` — teardown on file per §6.7.10 gate 11;
archetype chosen (gate 12); implementation not started.

## 11. Gaps and open questions

- [ ] **Imagy's reach status changed between the incoming brief and this
      pass.** The assignment listed Imagy as `reached: false`. On this pass,
      both WebFetch and the screenshot script succeeded (HTTP 200) against
      `https://imagy.app/rotate-image/`. Recorded as reached here since that
      is what was actually observed today; the earlier failure is not
      explained (could have been transient, a redirect, or a bot-check that
      passed this time) and is not investigated further.
- [ ] **The assignment's claim about ResizePixel ("arbitrary-angle rotation
      with a live preview") is not supported by what WebFetch returned.**
      What was found is 90°-step-only rotation via repeated left/right
      clicks, no slider, no flip. This brief reports the observed behavior,
      not the assignment's premise — flagging the discrepancy rather than
      silently reconciling it.
- [ ] **All three competitor readings are WebFetch text-extraction plus a
      static screenshot, not a live interaction trace.** Claims about
      conditional UI (e.g. "the fit-mode selector likely appears only for
      non-90° angles," "the Apply button gates only the final download, not
      the live preview") are inferred from page copy and screenshot
      composition, not from actually dragging a slider and watching the DOM
      change. Flagged, not asserted as observed fact, throughout §3–§4.
- [ ] **No competitor's lossless/quality claim was independently verified**
      (know-how #1, #6) — every "lossless" statement in §3 is the
      competitor's own marketing copy, quoted and labeled as such, not a
      byte-level comparison we ran ourselves.
- [ ] **Imagy's animated-format and video-rotation claims are entirely
      unverified** — no animated GIF or MP4 was actually uploaded and rotated
      during this research pass; §3 and §6 both label these as "the page's
      own stated claims."
- [ ] **EXIF-orientation handling (know-how #4) is sourced from our own
      domain knowledge of the JPEG/EXIF standard, not from any competitor's
      documentation** — none of the three mentions EXIF at all in their own
      copy. This is flagged as a real gap in the competitive set, which is
      exactly why it's proposed as a differentiator (§9.5), but it should be
      validated against actual EXIF-bearing test images before shipping the
      `exifOrientationHandled` output field as a contract promise.
- [ ] **Mobile behaviour unverified** for all three competitors and unbuilt
      for ours — desktop-viewport captures only.
- [ ] **Meter id, wallet hooks, error codes, and privacy note are not yet
      decided** (§10 gates 5, 7, 8) beyond the proposed meter-id string and
      the `pure` side-effect declaration in §9.6.
- [ ] **The pain named in §1** ("exact same image, reoriented, no quality
      loss, no re-interpretation") is answered by §9's lossless-preset path
      (know-how #1) and the EXIF-correctness differentiator (§9.5); the
      free-angle/lossy case is answered by the fit-mode choice (know-how #2)
      but its actual resampling-quality behavior is unverified against any
      reference implementation — carried forward as an implementation-time
      decision (know-how #6's JPEG lossless-rotation technique vs. a plain
      decode/rotate/re-encode path), not resolved in this brief.
