# Tool brief: image-compress

**Status:** built before the §6.7.10 research protocol existed, and still
`lab` rather than shipped. This file has been reshaped onto the canonical
template; the sections it cannot evidence are marked as holes rather than
filled in retroactively.

## 1. Demand

压缩截图/照片体积再上传；保留可接受画质。

## 2. Competitors (named, reached, captured)

*Not yet researched to protocol — predates §6.7.10.* Two products are named in
the original brief — **TinyWow** and **iLoveIMG** — with no URL, no reach
status and no capture, so neither satisfies the "named, reached, captured"
bar. See §11.

**Partial cover from a sibling brief:** `_processor-batch-surface.md` did reach
and capture **TinyPNG**, **iLoveIMG Compress**, **Squoosh** and **CloudConvert**
for the batch-queue archetype, with captures under
`docs/research/forge/processor/`. That teardown is about the *batch surface*,
not about this tool's own single-image journey, so it does not close gate 11
here — but it is the closest existing evidence and should be read before
redoing this research from scratch.

## 3. Feature inventory

*Not yet researched — predates the §6.7.10 protocol.* The original brief
records one line of feature shape for the category: 拖拽、质量滑杆、格式选择、
批量 (drag-drop, quality slider, format choice, batch). Which of those is any
one competitor's core strength, and which are upsell-gated, is unrecorded.

## 4. Journey maps

*Not yet researched — predates the §6.7.10 protocol.* (`_processor-batch-surface.md`
§4 maps the *batch* journey for TinyPNG/iLoveIMG/Squoosh/CloudConvert, with
its own stated capture limitation: the post-upload in-progress state was never
reachable by static capture.)

## 5. Layout + screenshots

*Not yet researched — predates the §6.7.10 protocol.* No captures exist under
`docs/research/forge/image-compress/`; the related processor captures are under
`docs/research/forge/processor/`.

## 6. Their debt

*Not yet researched — predates the §6.7.10 protocol.*

## 7. Domain know-how

| Choice | Why |
|--------|-----|
| **sharp (libvips)** | Node 图片处理事实 SOTA：快、内存可控、格式全 |
| Rejected | 纯 browser canvas 处理大图（内存与格式弱） |

The rejection is the load-bearing part: canvas-based client-side compression is
memory-fragile on large images and weak on format coverage, which is why this
tool is server-side — and therefore why it is the one tool in this group with a
real upload/privacy question to answer (see §11).

## 8. Chosen archetype

*Not argued — predates the §6.7.10 archetype requirement.* Two archetypes are
plausible and the choice has real consequences: **Configure-then-generate**
(quality slider and format choice are the product) for the single-image case,
and **Batch queue** for the multi-file case that `_processor-batch-surface.md`
was written to serve. Nothing on file picks one, and the other five were never
argued away. §6.5 gate 12 is not met. See §11.

## 9. Our design

### 9.1 Journey

*Not written.* The acceptance note records the human-facing upload UX as the
outstanding work (「人用上传 UX 需齐」), which is precisely the journey.

### 9.2 Layout

*Not recorded — predates the §6.7.10 protocol.*

### 9.3 Must-have

*Not recorded as a list.*

### 9.4 Deliberately skipped

One exclusion is on record: **pure browser-canvas processing for large
images**, rejected on memory and format-coverage grounds (§7).

### 9.5 Differentiator

*Not argued against named competitors* (see §2).

### 9.6 I/O contract

*Not written out in this brief.* Since this tool is server-side and
file-producing, its contract is the one in this group that most needs writing
— including the job/async shape, since `_processor-batch-surface.md` names
image compress as a file-producing tool that needs result bundling (a zip)
rather than a JSON verdict.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | **Not met** — the acceptance note says the human upload UX is incomplete (`lab`) |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Not recorded in this brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not recorded in this brief |
| 4 | SKILL.md (what / when / how / limits) | Not recorded in this brief |
| 5 | Meter id + wallet hooks | Not recorded in this brief |
| 6 | Side-effect class declared | Not recorded in this brief — non-trivial here, since this path uploads bytes to a server |
| 7 | Stable error codes; `request_id` on server paths | Not recorded in this brief |
| 8 | Privacy note: client-only vs uploaded; retention | **Open and load-bearing** — this is a server-side (sharp/libvips) tool, so it uploads user images; no retention or privacy statement exists |
| 9 | Decl/ads: intent title, unique value, related tools | Not recorded in this brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Partially — engine named (sharp / libvips), no version pinned |
| 11 | **Competitor teardown on file** (§6.7.10) | **Not met** — two products named, neither reached or captured (§2) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Not met** — no archetype chosen (§8) |

**内部验收状态：** `lab`（引擎 production 级，人用上传 UX 需齐）

## 11. Gaps and open questions

- [ ] **No competitor teardown exists** (§6.5 gate 11). TinyWow and iLoveIMG
      are named and never reached. The processor brief's captures of TinyPNG /
      iLoveIMG / Squoosh / CloudConvert are the nearest evidence and are scoped
      to the batch surface, not to this tool's own journey.
- [ ] **No archetype chosen** (§6.5 gate 12), and the choice is not obvious:
      single-image configure-then-generate and multi-file batch queue are both
      defensible, and picking one determines whether this tool owns a queue UI
      or delegates to the Processor J surface.
- [ ] **Privacy is unanswered and this is the tool where it matters most.**
      Server-side compression means user photos and screenshots leave the
      browser. Retention, deletion timing, and what the page tells the user
      are all unwritten (§10 gate 8). Every competitor in this category makes
      an explicit claim here; we make none.
- [ ] **The human upload UX is the stated blocker to leaving `lab`** and has
      no design on file — no journey, no layout, no error/oversize states, no
      progress behaviour for large files.
- [ ] **No quality/size trade-off policy.** A compressor's whole product is
      the default quality setting and what it does to a given input; no
      default, no per-format policy (JPEG vs PNG vs WebP vs AVIF), and no
      "how much did we save" reporting is specified.
- [ ] **Format coverage is claimed generically** ("格式全" via libvips) but not
      enumerated — which input formats we accept, which outputs we offer, and
      what happens to EXIF/ICC/orientation metadata on the way through are all
      undecided.
- [ ] **Gates 2–7 and 9 are unrecorded, not necessarily unmet.**
