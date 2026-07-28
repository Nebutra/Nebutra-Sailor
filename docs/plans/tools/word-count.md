# Tool brief: word-count

**Status:** shipped before the §6.7.10 research protocol existed. This file has
been reshaped onto the canonical template; the sections it cannot evidence are
marked as holes rather than filled in retroactively.

## 1. Demand

中英文混排字数（作文、公众号、论文）。

## 2. Competitors (named, reached, captured)

*Not yet researched — predates the §6.7.10 protocol.* The original brief named
only a category ("各类「在线字数统计」— 区分字符/词/中文"), with no named
product, no URL, no reach status and no capture. No competitor teardown exists
for this tool. See §11.

## 3. Feature inventory

*Not yet researched — predates the §6.7.10 protocol.* The one observation
carried forward from the original brief is that competitors in this category
distinguish 字符 / 词 / 中文 counts; which products do what, and which of those
counts is their core strength, was never recorded.

## 4. Journey maps

*Not yet researched — predates the §6.7.10 protocol.*

## 5. Layout + screenshots

*Not yet researched — predates the §6.7.10 protocol.* No captures exist under
`docs/research/forge/word-count/`.

## 6. Their debt

*Not yet researched — predates the §6.7.10 protocol.*

## 7. Domain know-how

The one domain decision on record is the segmentation engine, and it is the
right one to record: CJK text has no whitespace word boundaries, so a
whitespace-split word count is simply wrong for mixed Chinese/English input.

| Choice | Why |
|--------|-----|
| **Intl.Segmenter** (when available) + CJK ranges | 现代 Unicode 分词 SOTA 路径 |
| Fallback | 既有 latin token + CJK char 规则 |

## 8. Chosen archetype

*Not argued when this tool was built — predates the §6.7.10 archetype
requirement.* The shipped behaviour (live counts as the user types, no run
button) corresponds to **Instant transform**, but the other six archetypes were
never argued away, so §6.5 gate 12 is not met by a recorded decision — only by
the shipped result. See §11.

## 9. Our design

### 9.1 Journey

*Not written as a journey.* What shipped: paste or type into the input, counts
update live with no run button.

### 9.2 Layout

*Not recorded — predates the §6.7.10 protocol.*

### 9.3 Must-have

*Not recorded as a list.* What shipped: 实时统计 UX, mixed CJK/Latin counting,
and an identical server-side/Agent contract.

### 9.4 Deliberately skipped

*Not recorded — no skipped-with-reason list was written.*

### 9.5 Differentiator

*Not argued against named competitors* (see §2). The only differentiator on
record is structural rather than per-tool: the same counting engine backs the
human page and the Agent contract.

### 9.6 I/O contract

*Not written out in this brief.* The original brief records only that the
server-side/Agent path uses the same contract as the human page
(「服务端/Agent 同契约」); the actual field shapes live in the implementation,
not here.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Shipped (`production` per the acceptance note below); empty/error and mobile states not separately reviewed against this gate |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Shipped — same contract as the human page; not written out in this brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not recorded in this brief |
| 4 | SKILL.md (what / when / how / limits) | Not recorded in this brief |
| 5 | Meter id + wallet hooks | Not recorded in this brief |
| 6 | Side-effect class declared | Not recorded in this brief |
| 7 | Stable error codes; `request_id` on server paths | Not recorded in this brief |
| 8 | Privacy note: client-only vs uploaded; retention | Not recorded in this brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not recorded in this brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Partially — engine named (`Intl.Segmenter` + CJK ranges), no version pinned |
| 11 | **Competitor teardown on file** (§6.7.10) | **Not met** — no named, reached, captured competitor (§2) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Not met** — archetype inferred from the shipped behaviour, never argued (§8) |

**内部验收状态：** `production`（Intl.Segmenter + 实时统计 UX + 服务端/Agent 同契约）

## 11. Gaps and open questions

- [ ] **No competitor teardown exists** (§6.5 gate 11). This tool shipped
      before §6.7.10 required one. Nothing here should be read as "we checked
      and there was nothing to learn" — nobody checked.
- [ ] **No archetype decision on file** (§6.5 gate 12). The shipped shape is
      instant-transform; the argument was never written.
- [ ] **No journey map, layout study, debt analysis, or screenshots** — §4,
      §5 and §6 are empty for the same reason.
- [ ] **`Intl.Segmenter` availability and behaviour differences across engines
      are not documented here** — which browsers/runtimes take the fallback
      path, and how far the fallback's counts diverge from `Intl.Segmenter`'s,
      is unrecorded. For a counting tool, a silent divergence between two code
      paths is the failure mode that matters.
- [ ] **Which counts we report, and how each is defined, is not written
      down** — characters (with/without spaces), words, CJK characters, lines,
      paragraphs, reading time: the definitions exist in code only.
- [ ] **Gates 3–9 are unrecorded, not necessarily unmet** — someone should
      read the implementation and fill the table in rather than assume either
      way.
