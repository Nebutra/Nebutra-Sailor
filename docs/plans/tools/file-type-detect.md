# Tool brief: file-type-detect

**Root:** Detector (§6.7.9, empty root #2 — priority order Template → **Detector** → Processor)
**Category:** File Type Detector (Magic Bytes)
**Status:** research redone (P1 pass) — competitor set corrected against actual keyword reach, not built

**Revision note (this pass):** the previous version of this brief named WuTools,
GeraTools, and devtool.tech as three of its four competitors. Fresh SERP checks
against the keywords a user actually types (below) do not surface any of
WuTools or devtool.tech, and GeraTools/NexBit only surface for some phrasings.
Four real, ranking, previously-unreached competitors were pulled in instead —
**mlab.sh/tool/file-signatures**, **abacktools file-magic-byte-detector**,
**pwndeck magic-bytes-identifier**, and **tool.lu/magicbytes** — all four
captured this pass. WuTools and devtool.tech are demoted to secondary sources
(their domain know-how is kept per 取其精华，去其糟粕; their competitive-teardown
status is not).

## 1. Demand

- **JTBD:** "Is this file actually what its extension/MIME claims?" — verify a file's
  true format by reading its leading bytes against a known signature table, before
  trusting it (upload pipeline, forensic triage, "why won't this open" debugging).
- **Keywords:** file type detector, magic number detector, magic bytes checker,
  file signature identifier, 在线文件格式识别, 文件真实类型检测
- **Pain:** renamed files, spoofed extensions (`invoice.pdf.exe`), broken uploads
  that report the wrong MIME type, "is this ZIP actually a DOCX/JAR/APK" confusion.

## 2. Competitors (named, reached, captured)

**Method this pass:** ran three fresh web searches against the phrasings a real
user or dev would type — `"file type detector magic bytes online free"`,
`"magic number detector online tool identify true file type"`, and
`"file signature" identifier detect true file type no upload client-side"` —
and reached (WebFetch + full-page screenshot) the four named URLs the task
specified, none of which is fabricated: all four resolved, rendered, and were
captured.

| Product | URL | Reached | Screenshot |
|---|---|---|---|
| **mlab.sh File Signature / Magic Bytes Identifier** | https://mlab.sh/tool/file-signatures | Yes — WebFetch + screenshot, full page read directly | [mlab.png](../../research/forge/file-type-detect/mlab.png) |
| **Aback Tools File Magic Byte Detector** | https://abacktools.com/tools/file/forensics/file-magic-byte-detector | Yes — screenshot read directly (WebFetch's text-summary tool hallucinated a *different* Aback Tools page on two separate attempts before the correct URL was found via a targeted search; the screenshot is the trustworthy source, see note below) | [abacktools.png](../../research/forge/file-type-detect/abacktools.png) |
| **PwnDeck Magic Bytes / File Signature Identifier** | https://pwndeck.com/tools/magic-bytes-identifier | Yes — screenshot read directly | [pwndeck.png](../../research/forge/file-type-detect/pwndeck.png) |
| **tool.lu Magic Bytes 文件魔数** | https://tool.lu/magicbytes/ | Yes — screenshot read directly (WebFetch's text-summary attempt errored twice: "Socket is closed") | [toollu.png](../../research/forge/file-type-detect/toollu.png) |
| Gera Tools Magic Number Detector | https://geratools.com/magic-number-detector | Previously reached (prior pass); confirmed still ranking in 2 of 3 fresh SERP checks this pass | [geratools.webp](../../research/forge/file-type-detect/geratools.webp) |
| NexBit File Magic Number Checker | https://tools.nexbit.art/file-magic | Previously reached (prior pass); confirmed still ranking in 2 of 3 fresh SERP checks this pass | [nexbit.webp](../../research/forge/file-type-detect/nexbit.webp) |
| `file(1)` / libmagic | https://man7.org/linux/man-pages/man1/file.1.html | Yes (WebFetch, man page — domain-authority source, not a UI) | not a UI, no screenshot |

**Demoted, not re-verified as ranking this pass:**
- **WuTools** (https://wutools.com/file/file-type-detector) — did not appear in
  any of the three fresh SERP checks. Kept as a *feature/journey reference*
  below (its explicit-button friction and verdict-tier prose are real, citable
  debt/know-how) but no longer treated as a keyword-reach competitor.
- **devtool.tech** (https://devtool.tech/en/filetype) — same: not surfaced by
  any fresh SERP this pass. Its large below-the-fold signature table is kept as
  a know-how reference; its competitive standing is not.

**A caution on WebFetch's text-summarizer for this pass:** twice, asking
WebFetch to describe `abacktools.com/tools/file/forensics/file-magic-byte-detector`
returned confident, detailed prose about a *different* Aback Tools page
(`.../image/utilities/image-format-identifier`, "15+ formats") that does not
match the URL requested, and explicitly denied the "120+" figure that the
correct page's own screenshot shows in plain text three times. The screenshot
(read as an image, not summarized) is what the "120+" figure, the FAQ list, and
every other Aback Tools claim in this brief is sourced from — not WebFetch's
prose. Treat any WebFetch-only claim (no accompanying screenshot) about this
competitor set with more skepticism than usual; this brief only asserts what
the screenshots themselves show.

**Long-tail evidence of category saturation** (surfaced by the three fresh
searches, not individually torn down — listed to support the "table stakes"
finding in §9, not as competitors we studied): Akousa, techonlinetools.com,
file-type.utils.com, justfiletools.com, pudone.com, krakenhub.org,
prompt2tool.com, ezcalculatoronline.com, elysiatools.com, sectools.io,
toolsrail.com, inventivehq.com, plus a public GitHub project
(`murariguna/magic_detector`) with the identical pitch ("detects true file
types using magic numbers instead of trusting file extensions, with
security-focused risk classification"). At minimum a dozen more free, client-
side, no-upload magic-byte detectors exist beyond the seven studied in depth
below.

## 3. Feature inventory

**mlab.sh** (part of a broader paid IOC/threat-intel platform — this specific
tool is the free-tier entry point):
- Two-pane layout: **File** (drop target) | **Detection** (result pane, empty
  until a file is dropped) — the only competitor in this set with a genuine
  side-by-side pane rather than stacked drop-then-result
- Tagline is close to verbatim what our previous brief called *our*
  differentiator: **"identify the true file type and detect mismatched or
  spoofed extensions"** / on-page copy: "Only the first bytes are read · the
  file never leaves your device"
- 3-step "How to use": Drop a file → Read the verdict → Inspect the header
  (hex + ASCII of leading bytes)
- FAQ (4 items): What are magic bytes? / Why doesn't the extension match the
  content? / Is my file uploaded? / Why is no type detected?
- Related tools: Hash Generator, Image Metadata, Hash Identifier, MIME Types,
  All Tools — a security/forensics tool cluster, same shape as NexBit's
  neighborhood
- **No signature-count number stated anywhere on the tool page itself** — the
  only one of the seven studied competitors that makes zero numeric claim
- The site's platform nav (`Developer API`, `MCP Integration`) is for mlab's
  broader paid IOC-analysis product (domain scans, IP/blockchain lookups,
  "Upload a file for analysis" against a malware/threat corpus, quota-gated
  behind an API key) — confirmed by reading `mlab.sh/developer/documentation`'s
  own endpoint list. **Nothing in that API surface is this specific free
  magic-bytes tool** — see §9, this matters for our differentiator claim.

**Aback Tools File Magic Byte Detector** (richest single page of the seven):
- Explicit count: **"a database of 120+ known signatures covering images,
  audio, video, documents, archives, executables, fonts, certificates, disk
  images, and more"** (stated three times on the page: hero copy, a Features
  card, and an About card)
- Sources its database explicitly: "IANA-registered MIME types, common file
  format specifications, and well-known application formats. Sources include
  the FreeDesktop.org shared MIME info database, the FreeDesktop.org shared
  mime database, and format-specific documentation"
- Features grid: Magic Byte Signatures, Hex & ASCII Dump (color-highlights the
  matching bytes), Extension vs Magic Byte Comparison, **"Multi-Format
  Detection"** — claims it "identifies WebP inside RIFF, MPEG-4 subtypes (MP4,
  HEIC, AVIF, 3GP) via ftyp boxes, and **ZIP subtypes (DOCX, XLSX, JAR, APK,
  EPUB) by extension context**" — the phrase "by extension context" is a real
  tell: this reads as inferring the ZIP subtype from the *file's own claimed
  extension* rather than opening the ZIP central directory / internal manifest
  to verify it independently. If that reading is right, a `.docx` file that is
  actually a renamed `.jar` (both are ZIP containers) would not be caught by
  this tool the way a true internal-manifest check would catch it. This is a
  claim we could not verify by exercising the tool (no interactive test
  performed), so it is recorded as a plausible gap, not a confirmed one.
- Use Cases (6 cards): Security & Malware Analysis, File Recovery & Forensics,
  Debugging File Upload Issues, Unknown File Identification, Data Integrity
  Verification, Cross-Platform File Compatibility
- About (4 cards): What Are Magic Bytes, Why Magic Bytes Over File Extensions,
  Where Are Magic Bytes Defined, Browser-Based Processing & Privacy
- FAQ (8 items) including **"How many file signatures does this tool
  support?"** — a question none of the other six competitors' FAQs ask,
  because none of the others lead with a number
- Related tools are all **image**-forensics tools (Steganography Detector,
  Image File Size Analyzer, Image Clone Detector, Image Copyright Checker) —
  a mismatch with the tool's own general-file scope, suggesting the sidebar
  cross-sell is templated by parent category rather than curated per tool
- Newsletter capture, affiliate "Support Us" panel, share buttons — heaviest
  monetization surface of the seven

**PwnDeck Magic Bytes / File Signature Identifier**:
- **The only one of the seven with two input modes**: a `Hex` tab (paste raw
  hex bytes directly, e.g. `89504E470D0A1A0A0000000D49484452`, minimum "first
  8-16 bytes") and a `File` tab (drop/upload, reads only first 64 bytes). This
  is a genuinely useful pattern our brief's I/O contract should adopt (§9).
- Detected-type output: type name + extension + MIME shown together in one
  row, plus a copyable hex dump with offset column
- Sidebar "Quick reference": a compact common-signatures cheat sheet (PNG,
  JPEG, PDF, ZIP, EXE, ELF hex prefixes) plus **explicit triage tips**:
  "Mismatched header vs extension = red flag", "Check offset 4 (ftyp) and 8
  (RIFF subtype)", "PK means a ZIP-based format (docx, apk, jar...)",
  "High-entropy with no header → encrypted/compressed"
- "About" prose explicitly names **polyglot and embedded files** ("carry one
  signature at the start and another deeper in") and CTF/forensics triage as a
  use case — the most security-practitioner-voiced copy of the seven
  (unsurprising: PwnDeck's whole site is a pentesting tool directory, "199
  tools", with its own free browser-extension scanner cross-sold at the bottom
  of the page)
- FAQ (4 items): Why trust magic bytes over the extension? / How many bytes do
  I need? / Is my file uploaded anywhere? / **Why do .docx and .zip show the
  same signature?** — this is the only FAQ across all seven competitors that
  explicitly names the ZIP-collision problem as a *user-facing* question
  rather than burying it in an about-page paragraph
- No numeric signature-count claim on the page ("a curated database of common
  signatures" — no number)
- Related tools: Hex/ASCII/Binary Converter, Encoding Detector, Base64
  Encoder/Decoder, Checksum Calculator — again a coherent forensics/dev
  cluster, not a generic cross-sell grid

**tool.lu Magic Bytes 文件魔数** — structurally different from the other six:
**this is not an interactive detector at all.** The page (confirmed by direct
screenshot, no drop zone or file input anywhere on it) is a **pure static
reference table**: ~40 rows (Adobe Illustrator, BMP, Java .class, JPEG,
JPEG2000, GIF, TIFF, PNG, WAV, ELF, PSD, MIDI, ICO, MP3/ID3, AVI, FLV, MP4,
WMV, WMA, PKZip, GZip, TAR, MSI, generic Object Code, DLL, CAB, EXE, RAR, SYS,
HLP, VMDK, Outlook PST, PDF, DOC, RTF, XLS, PPT, VSD, DOCX, XLSX, PPTX, MDB,
PostScript, EPS, Outlook MSG, JAR, SLN, ZLib, SDF) with columns for format
name, extension, and hex magic number — followed by copy-paste **code
snippets in PHP, Java, Python3, Golang, and Dart** each implementing "read N
bytes at a given offset and hex-encode them." No verdict, no upload, no live
detection of any kind; a comments section (3 comments visible, oldest from
2020) confirms this is a long-standing reference/documentation page, not a
product. It ranks for the Chinese-language keyword (文件魔数/magic number) and
for developers who want to *implement* detection themselves rather than run a
hosted tool — a different intent than the other six, and a reminder that "a
plain reference table with code samples" is itself a competing content shape
we are up against for the SEO keyword, even where it offers zero interactivity.

**Gera Tools / NexBit** — feature detail carried forward unchanged from the
prior pass (both still rank in 2 of 3 fresh SERP checks; not re-fetched this
pass since their captures and copy were already reliable):
- **Gera Tools**: claims to read the first 512 bytes against 45+ signatures; a
  visible signature reference table (hex/ASCII/offset columns); explicitly
  documents the "ZIP family problem" and non-zero-offset signatures (MP4
  `ftyp` at offset 4, TAR `ustar` at offset 257); interactive widget itself
  still unconfirmed in our captures (see prior "could not verify" note, kept
  below).
- **NexBit**: claims 50+ formats; reads only the first 256 bytes; output is
  detected type + MIME + hex dump + ASCII preview (4-part, richer than a
  single info panel); positions itself in a security/forensics tool cluster
  (String Extractor, IOC Extractor, Hash Generator/Lookup as related tools).

**Core capability across all seven interactive competitors:** drop file → get
true type + a flag when the extension is lying. Every one of them does this.
Padding varies (newsletter capture on Aback/Gera, affiliate "Support Us" on
mlab, browser-extension cross-sell on PwnDeck) but the core mechanic is now
fully commoditized — see §9.

## 4. Journey maps

**mlab.sh**:
1. Arrive → two-pane layout visible immediately, no scrolling needed to see
   both the drop target and where the result will render
2. Drop or click-to-browse a file → (per copy) verdict renders in the right
   pane, "the file never leaves your device"
3. Hex/ASCII of leading bytes available (per "Inspect the header" step) —
   exact rendering not confirmed live (no file was actually submitted in our
   capture; the panel was in its empty "Drop a file to begin" state)
4. Below: Related Tools row, then 3-step how-to, then a 4-question FAQ,
   then the site's global footer (platform nav, other free tools)
5. No Reset/Detect button described or visible — reads as live/instant like
   NexBit and PwnDeck, unlike WuTools

**Aback Tools**:
1. Arrive → single drop target directly under the H1, one line of scope text
   above it ("Upload any file to detect its true file type... regardless of
   the file extension")
2. Drop or click to browse → (per copy) shows hex dump with matching bytes
   highlighted in color, ASCII interpretation, MIME type, file category, and
   an extension-match flag
3. Below: a 4-card Features grid, a 6-card Use Cases grid, a 4-card About
   grid, a 4-card Related Tools grid, then an 8-question FAQ — the longest,
   most content-dense page of the seven, by a wide margin
4. Sidebar (persistent alongside the tool, not below it): share buttons, a
   "Support Us" affiliate panel, a newsletter signup

**PwnDeck**:
1. Arrive → tool card with a `Hex` / `File` mode toggle above the fold, sidebar
   "Quick reference" and "Related Tools" visible without scrolling on desktop
2. **Hex mode**: paste raw hex directly into a textarea, no file needed at all
   — result renders live as you type/paste (the captured screenshot shows a
   pre-filled PNG example already resolved to "PNG image .png image/png" with
   a hex dump below it and a copy button)
3. **File mode**: drop/click to browse, same output shape
4. Below the tool: "How to Use" (5 numbered steps), "About" (4 paragraphs of
   genuinely well-written domain prose), then a 4-question FAQ, then a
   cross-sell block for PwnDeck's own browser extension

**tool.lu**:
1. Arrive → a data table is the entire "product." No drop target exists.
2. Scroll → code snippets in 5 languages for readers who want to implement
   this themselves rather than use a hosted tool
3. Comment section at the bottom (a general-purpose site-wide "leave feedback"
   widget, not tool-specific)
4. No verdict, no interactivity, no journey beyond "read the table"

**Common shape across the five interactive tools (mlab, Aback, PwnDeck,
GeraTools, NexBit):** drop-zone-first arrival, a single unambiguous verdict as
the payoff, heavy reference/FAQ content pushed below the fold. **PwnDeck is
the only one that also accepts raw hex as a first-class input**, not just a
file — a genuinely different (and useful) journey variant none of the other
six offer.

## 5. Layout + screenshots

- **Above the fold, all interactive competitors:** page title + one-line
  description, then the drop target (or, PwnDeck only, drop-target *and*
  hex-paste toggle). No sidebar-of-options anywhere.
- **mlab.sh** is the only one of the seven with a genuine **two-pane** layout
  (input left, output right) rather than stacked drop-then-result-below.
- **PwnDeck** and **Aback Tools** both keep a persistent right-rail (Quick
  Reference/Related Tools on PwnDeck; Share/Support/Newsletter on Aback) —
  closer to WuTools' tool-directory sidebar pattern than to NexBit's minimal
  chrome.
- **Options density:** effectively zero for file-drop mode across all six
  interactive tools. PwnDeck's Hex/File toggle is the only "mode" choice that
  exists anywhere in this category, and it is an input-format choice, not a
  detection-behavior configuration.
- **tool.lu** has no interactive layout at all — a single long-scroll
  reference document.
- **Mobile:** not independently verified for any of the four newly-captured
  competitors (all captures were desktop viewport, per §6.7.10's baseline);
  nothing in the fetched copy suggests mobile-specific behavior on any of them.

**Screenshots on file** (gitignored local reference — regenerable from the URLs in §2 via `scripts/research-screenshot.mjs`):

- [docs/research/forge/file-type-detect/mlab.png](../../research/forge/file-type-detect/mlab.png)
- [docs/research/forge/file-type-detect/abacktools.png](../../research/forge/file-type-detect/abacktools.png)
- [docs/research/forge/file-type-detect/pwndeck.png](../../research/forge/file-type-detect/pwndeck.png)
- [docs/research/forge/file-type-detect/toollu.png](../../research/forge/file-type-detect/toollu.png)
- [docs/research/forge/file-type-detect/mlab-api-docs.png](../../research/forge/file-type-detect/mlab-api-docs.png) — mlab's own API reference, used to confirm its documented endpoints do not cover this capability (§3, §6, §9)
- Prior pass (kept for know-how citations, reach status demoted — see revision note): [wutools.webp](../../research/forge/file-type-detect/wutools.webp), [geratools.webp](../../research/forge/file-type-detect/geratools.webp), [nexbit.webp](../../research/forge/file-type-detect/nexbit.webp), [devtool-tech.webp](../../research/forge/file-type-detect/devtool-tech.webp)

## 6. Their debt

- **mlab.sh:** cleanest, least content-padded page of the seven — but that
  also means the FAQ never addresses the ZIP-family collision at all (the
  question set is What/Why-mismatch/Uploaded/Why-none — no ZIP question),
  unlike PwnDeck and GeraTools which name it explicitly. The broader platform's
  paid API/MCP surface is a genuine capability elsewhere on the site but does
  not appear to expose this specific free tool (see §3) — a company that
  *could* ship this as an MCP tool and, as far as our reach shows, has not.
- **Aback Tools:** heaviest monetization chrome (affiliate panel + newsletter)
  of the seven; the "Multi-Format Detection... by extension context" phrasing
  is a real, specific claim we could not verify as either true internal-read
  disambiguation or an extension-trusting shortcut — flagged, not asserted.
  Related-tools sidebar cross-sells unrelated image-forensics tools rather
  than genuinely adjacent file tools — a templating gap, not a deliberate
  choice.
- **PwnDeck:** genuinely the strongest single competitor reached this pass —
  hex-paste input, copy button, well-written domain prose, an explicit
  ZIP-collision FAQ question. Its one gap: no signature-count claim at all
  (harder for a user to judge coverage before trying it), and a persistent
  browser-extension upsell block at the very bottom of every tool page.
- **tool.lu:** not a tool. A user who lands here for "magic bytes" gets a
  table and code to write their own detector — a real, if unintentional,
  argument for why a hosted, zero-setup detector (any of the other six, or
  ours) has a right to exist against a bare reference page.
- **GeraTools / NexBit:** unchanged from the prior pass's findings (see prior
  brief text folded into §3) — Gera's interactive widget still unconfirmed by
  our capture tooling; NexBit's journey remains the shortest and cleanest of
  the pre-existing set.
- **None of the seven interactive/reference competitors expose an
  API/OpenAPI/MCP contract for *this specific capability*.** mlab.sh comes
  closest structurally (it has a real, documented, paid API and an MCP
  integration) but that surface is scoped to its threat-intel product (domain
  scans, IP/blockchain lookups, malware file analysis against a corpus) —
  confirmed by reading its own API reference's endpoint list, which has no
  lightweight "give me the magic-byte verdict for this buffer" endpoint. This
  is exactly the gap Forge's dual-surface design exists to close (§6.5), and
  it survives even against the one competitor that already has agent-facing
  infrastructure.

## 7. Domain know-how

The non-obvious rules a naive "read first 4 bytes and switch on them"
implementation gets wrong — the core of this section is unchanged from the
prior pass (still correct, still confirmed by this pass's fresh captures,
especially PwnDeck's "About" prose and Aback Tools' feature copy), with one
addition from this pass's research (item 10):

1. **Signatures are not always at offset 0.** MP4/MOV/M4A (ISO-BMFF family) carry
   their `ftyp` marker at **byte offset 4**, not 0. TAR's `ustar` marker sits at
   **offset 257**. A detector that only inspects the leading N bytes at offset 0
   will silently misclassify or fail to classify these. (Independently
   reconfirmed this pass by both PwnDeck's sidebar tip — "Check offset 4 (ftyp)
   and 8 (RIFF subtype)" — and Aback Tools' Multi-Format Detection feature copy.)
2. **Read enough bytes, but not the whole file.** Gera Tools reads 512 bytes,
   NexBit and mlab.sh/PwnDeck each read 256/64 — every fixed read-length
   choice is a real trade-off to document, not hide. PwnDeck's own choice (64
   bytes for file mode, but its hex-paste mode has no such ceiling since the
   user supplies the bytes directly) is a useful illustration that the
   *file-read* bound and the *signature-database* depth are two independent
   trade-offs.
2b. **Wildcard/variable bytes exist within a signature.** JPEG's signature
   family varies (`FF D8 FF E0`/`E1`/`DB`, JFIF vs Exif vs raw) — a signature
   match is a pattern, not always a fixed literal string.
3. **The ZIP-family collision is the single hardest real case.** DOCX, XLSX,
   PPTX, ODT/ODS/ODP, JAR, APK, and EPUB are **all** genuinely ZIP archives at
   the byte level (`PK\x03\x04`, `PK\x05\x06`, or `PK\x07\x08`). Distinguishing
   between them requires reading the ZIP central directory / looking for a
   specific member (`[Content_Types].xml` for OOXML, `META-INF/MANIFEST.MF` for
   JAR, `mimetype` as the first stored (uncompressed) entry for ODF/EPUB) — a
   pure magic-byte check can only ever say "this is a ZIP container," and a
   product that claims otherwise without doing the extra read is overclaiming.
   (This pass's Aback Tools capture is a live example of a competitor whose own
   phrasing — "by extension context" — suggests it may be doing exactly this
   overclaim; see §3.)
4. **Polyglot files are a real, deliberately-crafted edge case**, not a corner
   case to ignore: GIFAR (valid as both GIF and JAR, used in early web attacks),
   PDF/ZIP polyglots (PDF tolerates trailing ZIP data appended after `%%EOF`).
   Single-signature-match tools quietly report only the first match found and
   never surface that a file is valid under two formats at once. (PwnDeck's
   "About" copy names this directly this pass: "Polyglot and embedded files
   carry one signature at the start and another deeper in.")
5. **Container vs. format vs. codec is a three-layer distinction.** A byte
   signature identifies the outer *container* (e.g., MP4/ISO-BMFF), not the
   *codec* streams inside it (H.264 video, AAC audio) — those require deeper
   parsing (moov/tracks atoms) that a magic-byte check does not and should not
   claim to do.
6. **A mismatch is not automatically malicious.** A `.jpeg` saved by a tool that
   is actually a PNG under the hood is a benign, common false alarm (format
   re-encoding, lazy renaming) — the risk tiering matters: passive data formats
   (image/document mismatches) are lower severity than an executable
   (`MZ`/`7F 45 4C 46`/Mach-O) or script disguised behind a document or image
   extension, which is the genuinely dangerous case (content-type spoofing /
   OWASP-documented upload-validation bypass).
7. **Plain-text-based formats have the weakest signatures.** CSV/TSV/JSON/YAML/
   Markdown consist mostly of ASCII with no fixed header; distinguishing them
   reliably requires statistical/structural sniffing (delimiter counting, brace
   balance, YAML indentation rules), not a byte-signature table at all — a
   detector should say "text, format ambiguous" here rather than guess with
   false confidence. JSON with a UTF-8 BOM further complicates this.
8. **Detected type vs. reported (browser/OS) MIME vs. filename extension are
   three separate signals** that can legitimately disagree even with no bad
   intent — a good tool surfaces all three distinctly rather than collapsing
   them into one verdict. (PwnDeck is the only competitor this pass whose
   output visibly does this — type, extension, and MIME shown in one row.)
9. **Encrypted/compressed files look like noise beyond a header check** — high
   Shannon entropy in the body is expected and is not itself a signal of
   anything; only the fixed-position header bytes are reliable. (PwnDeck's
   sidebar states this outright: "High-entropy with no header → encrypted/
   compressed.")
10. **Accepting raw hex as an input, not only a file, is a real and
    underserved variant of this job** — PwnDeck is the only competitor across
    both research passes to offer this. It matters specifically for our agent
    surface: a CI pipeline or forensic script that already has a byte buffer
    in memory (e.g., the first N bytes of a stream it does not want to
    materialize as a file) should not be forced to write a temp file just to
    call our detector. Our `/api/v1/jobs` contract should accept either a file
    upload/base64 blob **or** a raw hex string, mirroring PwnDeck's two-mode UI
    on the human side too.

## 8. Chosen archetype

**Drop-and-verdict** (§6.7.10) — file in, one clear answer, detail on demand.
Unchanged from the prior pass; this pass's four new competitors (three
drop-and-verdict, one bare reference page) reconfirm rather than change the
fit. Reasoning kept from the prior pass:

- **Instant transform** — close, but the input is a *file*, not text to
  transform into other text; there is no "output text" to keep live-editing.
- **Configure-then-generate** — there is nothing to configure. Zero real
  options exist across all seven interactive competitors studied (PwnDeck's
  Hex/File toggle is an input-mode choice, not a configuration knob over the
  detection itself).
- **Decision wizard** — the user already knows what they want (the true type
  of this specific file); there is no multi-step narrowing question to ask.
- **Two-pane compare** — there is only one artifact, not two things to diff
  (mlab.sh's two-pane *layout* is input-left/output-right, not a compare of
  two inputs — a different sense of "two-pane" than this archetype means).
- **Inspect-and-drill** — closest runner-up, since the hex dump is genuinely
  "a structure to explore." But the primary payoff is a single verdict
  (type/MIME/mismatch), with the hex dump as *detail on demand* — precisely
  what "drop-and-verdict... detail on demand" describes.
- **Batch queue** — single-file verification is the core job; batch is a
  possible future extension via the existing `/api/v1/jobs` surface, not the
  primary archetype.

## 9. Our design

### 9.1 Journey

1. Arrive at `/t/file-type-detect` — drop target is the first and only thing
   above the fold, one-line description states the client-side/privacy claim
   at the point of action (NexBit/mlab.sh's placement, not WuTools'/Gera's
   buried-in-FAQ placement).
2. **Two input modes, side by side** (adopted from PwnDeck, the one genuinely
   novel pattern found this pass): drag/drop or click-to-browse a file, **or**
   switch to a "paste hex" tab and paste raw leading bytes directly — no file
   required for the second path. Both converge on the same result renderer.
3. User drags a file onto the zone (or pastes hex) — **no separate "Detect
   Type" button.** Reading and matching a header is well under the
   instant-feedback threshold; result renders the moment the file is read or
   the hex is parsed.
4. Result panel renders immediately, structured (not prose) as:
   - **Verdict line**: detected type (human name, e.g. "PNG image") + confidence
     state (`match` / `container-only` / `no signature matched — appears to be
     text or unrecognized binary`)
   - **Three-signal row**: Detected type vs. Reported MIME (from
     `File.type`/OS) vs. Filename extension — shown side by side so a
     disagreement is visually obvious without reading prose (PwnDeck is the
     only competitor that already does this; we match and extend it)
   - **Mismatch flag**, tiered: `benign` (e.g. re-encoded image), `mismatch`
     (extension disagrees with detected container), `high-risk` (executable or
     script signature hiding behind a document/image/archive extension) —
     avoids over-alarming on the common benign case (know-how §7.6)
   - **Container drill-down** (only shown when the container is ZIP-family):
     "This is a ZIP container. Inspected internal manifest → identified as
     DOCX" or "→ could not disambiguate further, reporting as generic ZIP" —
     a real internal-manifest read, not the "by extension context" shortcut
     Aback Tools' own copy suggests it may be using (§3, §9) — never silently
     overclaims specificity it didn't verify
   - **Hex dump + ASCII preview**, collapsed by default under a "show bytes"
     disclosure — the "detail on demand" half of the archetype
5. **Copy button** on both the verdict summary (plain text, pasteable into a
   report/ticket) and the hex dump block.
6. Large files: only the header region needed for detection is read (bounded,
   documented byte count — e.g. enough to reach TAR's offset-257 `ustar`
   check), never the whole file into memory, regardless of file size; error
   state for zero-byte files reports "empty file" rather than a false "no
   signature matched."
7. Drop a second file, or paste new hex → previous result is replaced in
   place (no manual Reset button needed) — the new input *is* the reset.

### 9.2 Layout

- Single column, no sidebar-of-options — but Forge's standard catalog
  sidebar/nav (station-level chrome) stays.
- Drop target + hex-paste tab toggle above the fold, full width within the
  content column.
- Result panel appears directly below in the same column (single-column
  drop-on-top-result-below, matching six of the seven competitors — mlab.sh's
  two-pane is the one exception and we are not adopting it; a single column
  keeps the hex-paste tab and file-drop tab from fighting for the same
  horizontal space on mobile).
- Hex dump/ASCII behind a disclosure toggle, not always-expanded.
- No ads, no newsletter capture, no affiliate panel, no inside-the-workflow
  interruption — matches the station-level §6.7.10 commercial rule (a
  deliberate contrast with Aback Tools' newsletter+affiliate sidebar).

### 9.3 Must-have

**Must-have features** (parity, not differentiation — see §9's table-stakes
finding for why this list looks different from the prior pass's framing):
- Instant, no-button result on drop or hex paste
- The three-signal comparison (detected/reported/extension) shown together
- Extension-mismatch flagging, correctly tiered (benign/mismatch/high-risk) —
  table stakes per §9, but must-have table stakes: shipping without it is not
  an option, it just does not differentiate us
- ZIP-family container drill-down done for real (the one place we can still
  plausibly beat Aback Tools' ambiguous "by extension context" claim)
- Copy button on the verdict and the hex dump
- A stated, real, ≥130 signature count at ship
- Hex-paste as an alternate input, matching PwnDeck (the one competitor
  feature this pass found worth directly adopting)
- Client-side processing claim, honored in fact, not just stated

### 9.4 Deliberately skipped

- Full codec/stream inspection inside containers (H.264/AAC track parsing,
  EXIF/embedded-metadata extraction) — a different tool's job (Metadata
  Viewer / EXIF); scope creep here would blur Detector's identity against
  Inspector-shaped tools.
- Newsletter capture / affiliate panels / tool-pinning / account gating —
  station-level anti-debt rule (§6.7.10), and a deliberate contrast with
  Aback Tools' monetization chrome specifically.
- A "Detect Type" button — keeping it would copy WuTools' one piece of
  avoidable friction rather than its journey.
- Batch upload UI as a bespoke feature of this tool — deferred to the
  existing `/api/v1/jobs` surface per §6.7.9's Processor guidance.
- A two-pane (mlab.sh-style) layout — a reasonable alternative, but adding a
  second input mode (hex paste) to a single drop-and-verdict column already
  gives the page enough surface; a two-pane split on top of two input tabs
  risks the exact "form + button for everything" flatness §6.7.10 warns
  against in the other direction (over-structuring a simple job).

### 9.5 Differentiator

**Two questions this pass was asked to answer directly:**

**Is extension-mismatch detection still an edge, or already table stakes?**
**Table stakes — confirmed, not an open question.** Every single interactive
competitor reached across both research passes (WuTools, GeraTools, NexBit,
devtool.tech, mlab.sh, Aback Tools, PwnDeck — seven of seven) leads with
exactly this capability as its core pitch. mlab.sh's own tagline — "identify
the true file type and detect mismatched or spoofed extensions" — is close
enough to verbatim what our prior brief called *our* differentiator that
continuing to claim it as ours would be a misrepresentation. The three fresh
SERP checks this pass surfaced a further dozen-plus tools (Akousa, 500+
signatures claimed; techonlinetools; file-type.utils.com; justfiletools;
pudone; krakenhub; prompt2tool; ezcalculatoronline; elysiatools; sectools.io;
toolsrail.com; inventivehq.com; even a public GitHub project with the
identical pitch) making the same claim. **This category's baseline is now
"detect the true type and flag a lying extension" — that is the entry ticket,
not a differentiator.** Our brief's §8/§9 below are rewritten to stop
claiming it as an edge and instead treat it as a must-have parity item (it
still must work correctly — see the domain know-how in §7 for how a naive
implementation gets it wrong — it just does not win us anything by itself).

**What is our explicit signature-count target against Aback Tools' 120+?**
**Target: ≥130 distinct signatures at ship, stated on our own page with the
same transparency Aback Tools uses (a real, countable list, not a marketing
round number).** Rationale for landing above 120, not merely matching it:
- Aback Tools is the only competitor across both passes to state a number at
  all, and it is the highest number stated (Akousa's SERP-summary claim of
  "500+" was not independently verified by reaching the page this pass, so it
  is not used as the bar — an unverified number should not set our target).
- 130 is reachable honestly by combining the categories every competitor's own
  reference material already documents across this pass and the prior one:
  images (~18: PNG/JPEG variants/GIF/BMP/TIFF/WEBP/HEIC/HEIF/ICO/PSD/AVIF...),
  audio (~10: MP3/ID3/WAV/FLAC/OGG/MIDI/AIFF...), video/container (~10:
  MP4/MOV/MKV/AVI/WEBM/FLV/WMV...), documents (~15: legacy Office
  DOC/XLS/PPT via `D0 CF 11 E0`, OOXML DOCX/XLSX/PPTX, ODF ODT/ODS/ODP, PDF,
  RTF, EPUB, MSG), archives/compression (~15: ZIP family incl. JAR/APK, RAR,
  7z, GZIP, BZIP2, XZ, TAR (offset 257), ZLib, CAB), executables/binaries
  (~10: PE/MZ, ELF, Mach-O 32/64/fat, class files, SLN), fonts (~5: TTF, OTF,
  WOFF/WOFF2, EOT), certificates/crypto (~5: PEM/DER/PKCS variants), disk
  images/VM (~5: ISO, VMDK, VHD), databases (~5: SQLite, MDB), and a long tail
  of dev/misc formats (~15+: SWF, torrent, PST, VSD, SDF, and others already
  named across the seven competitors' own tables) — summing comfortably past
  130 without inventing formats nobody asked for. This is a target to hit
  during implementation and verify by counting the actual signature table at
  ship, not a number to assert speculatively in marketing copy before the
  table exists.

**Where our actual edge now is, given both answers above:**
- **Agent contract, still uncontested.** Even mlab.sh — the one competitor in
  this set with real agent-facing infrastructure (a documented paid API, an
  MCP integration) — does not expose *this* capability through it (§3, §6);
  its API surface is a different, heavier, quota-gated product. A CI
  pipeline, upload validator, or agent workflow that wants "tell me the true
  type of this buffer, free, no account, one call" still has to shell out to
  `file(1)`, hand-roll a signature table, or pay for a threat-intel platform
  overbuilt for the ask. We expose the identical detection logic through both
  the human runner and `/api/v1/jobs` + MCP with one schema.
- **Hex-paste as a first-class input, not just file upload** (PwnDeck's one
  genuinely novel pattern) — matters doubly for us because it maps directly
  onto the agent I/O contract (§7 item 10): accept a hex string or a file,
  human and machine callers both benefit.
- **Container disambiguation done and verified, not glossed or ambiguously
  claimed.** Where Aback Tools' own copy ("by extension context") is,
  honestly read, ambiguous about whether it does a real internal-manifest
  read, and WuTools/GeraTools only *explain* the ZIP-family problem in prose,
  we do the extra read (central directory / `[Content_Types].xml` /
  `META-INF/MANIFEST.MF` / ODF `mimetype` entry) so DOCX reports as DOCX, not
  merely "ZIP archive" — and we say so plainly in our own copy, in a way that
  is checkable against our actual output rather than a hedged phrase.
- **Copyable, structured, three-signal output** (detected type vs. reported
  MIME vs. filename extension, shown together) — PwnDeck is the only
  competitor that visibly does this today; we match it and add the
  container-drill-down layer on top.
- **A stated, countable signature number (≥130)** where five of the seven
  competitors state none at all, and the one that does (Aback, 120+) we
  explicitly exceed.
- Client-side by default (matches the category norm — every competitor
  studied across both passes claims this, so it is table stakes, not a
  differentiator, but we must not regress below it).

*summary*

Extension-mismatch detection is table stakes now, confirmed against seven
reached competitors and a dozen more surfaced by fresh keyword search — it is
a must-ship parity item, not our edge. Our edge is: agent-callable detection
(uncontested even against mlab.sh, the one competitor with real API/MCP
infrastructure, because that infrastructure does not cover this capability),
a real ≥130-signature table stated transparently (beating Aback Tools' stated
120+, the only competitor number worth beating), container disambiguation done
for real rather than ambiguously claimed, a hex-paste input mode matching the
one genuinely novel pattern found this pass (PwnDeck), and a structured,
copyable, three-signal verdict — delivered through the same OpenAPI/MCP
contract as every other Forge blade.

### 9.6 I/O contract

**I/O contract sketch** (for the `/api/v1/jobs` + MCP surface):
- **Input:** file bytes (base64 or multipart for the human upload path; a byte
  buffer/stream for the programmatic path) **or a raw hex string** (adopted
  from PwnDeck's hex-paste mode, §7 item 10) — at most an optional
  `maxBytesRead` override for advanced/agent callers.
- **Output:** `{ detectedType, detectedMime, reportedMime, filenameExtension,
  matchedSignature: { hex, offset }, containerDrillDown?: { kind, resolvedType },
  mismatch: "benign" | "mismatch" | "high-risk" | "none", hexDump, asciiPreview
  }` — a structured object, not prose, so an agent caller gets the same
  three-signal comparison a human sees rendered, and can branch on `mismatch`
  directly.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Not started — research-only brief |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not started — research-only brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not started — research-only brief |
| 4 | SKILL.md (what / when / how / limits) | Not started — research-only brief |
| 5 | Meter id + wallet hooks | Not started — research-only brief |
| 6 | Side-effect class declared | Not declared in this brief — carried into §11 |
| 7 | Stable error codes; `request_id` on server paths | Not started — research-only brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not started — research-only brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not started — research-only brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Not started — research-only brief |
| 11 | **Competitor teardown on file** (§6.7.10) | **Met** — §2–§6 (named, reached, captured) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Met** — §8 (other six argued away) |

## 11. Gaps and open questions

- [ ] Aback Tools' "ZIP subtypes... by extension context" phrasing (§3) reads
      as a possible extension-trusting shortcut rather than a true internal
      manifest read, but this was not confirmed by exercising the tool with a
      renamed test file (e.g. a `.jar` renamed to `.docx`). Worth a live check
      before citing this as a confirmed competitor gap in marketing copy —
      today it is a plausible, specifically-sourced inference, not a verified
      fact.
- [ ] Akousa's SERP-summary claim of "500+ signatures" was not independently
      reached or verified this pass (it did not come up as one of the four
      named targets and was not chased down). If that number is real, our
      ≥130 target may need revisiting — but an unverified third-party summary
      is not grounds to move the target now.
- [ ] Confirm GeraTools' actual interactive widget behavior with a real
      browser session (carried forward from the prior pass, still open).
- [ ] Decide the exact bounded byte-read length for the file-upload path
      (must cover TAR's offset-257 check; PwnDeck's 64 bytes is the lower
      bound seen this pass, Gera's 512 the upper bound — not yet a coded
      decision).
- [ ] Confirm no slug collision: `dev/mime-lookup` is extension→MIME text
      lookup, a different mechanic (no byte inspection) — verified distinct
      per the prior pass's landscape survey, re-stated here for the brief
      record.
- [ ] Declare the side-effect class and meter id (§10 gates 5–6). The brief
      describes a client-side detection path plus an `/api/v1/jobs` contract
      but never states `pure` / `read` / `write` / `external` for either, and
      proposes no meter id — both are required before ship, and the answer is
      not obvious for a tool that accepts an uploaded file.
- [ ] Write the privacy note and the stable error-code set (§10 gates 7–8).
      The client-side claim in §9.2 is a design commitment; gate 8 wants it
      written as a user-facing statement covering the upload path too.
