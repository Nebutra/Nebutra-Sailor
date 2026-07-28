# Tool brief: json-format

**Status:** shipped before the §6.7.10 research protocol existed. This file has
been reshaped onto the canonical template; the sections it cannot evidence are
marked as holes rather than filled in retroactively.

## 1. Demand

- **JTBD:** 粘贴脏 JSON → 校验 / 美化 / 压缩
- **Keywords:** json格式化, json beautify, json minify
- **Pain:** 报错行号不清、大 JSON 卡死

## 2. Competitors (named, reached, captured)

*Not yet researched to protocol — predates §6.7.10.* Three products are named
in the original brief — **it-tools**, **jsonformatter.org**, **TinyWow** — but
with no URL, no reach status and no capture, so none of them satisfies the
"named, reached, captured" bar. The one recorded observation is that all three
share the same main path: textarea + format/minify. See §11.

## 3. Feature inventory

*Not yet researched — predates the §6.7.10 protocol.* Nothing beyond "textarea
+ format/minify is the main path" was recorded per product; which capability is
each one's core strength, and which features exist only as upsell, is unknown.

## 4. Journey maps

*Not yet researched — predates the §6.7.10 protocol.*

## 5. Layout + screenshots

*Not yet researched — predates the §6.7.10 protocol.* No captures exist under
`docs/research/forge/json-format/`.

## 6. Their debt

*Not yet researched — predates the §6.7.10 protocol.* (TinyWow's ad and
upload posture is criticised in the sibling `md-to-pdf` brief, but no debt
analysis was done for this tool's own competitor set.)

## 7. Domain know-how

| Choice | Why |
|--------|-----|
| **ECMAScript `JSON.parse` / `JSON.stringify`** | 语言内置事实标准；正确性与引擎优化即 SOTA |
| UX SOTA | 错误位置提示、一键复制、indent 控制、示例 |

手写 JSON parser = 禁止。

## 8. Chosen archetype

*Not argued when this tool was built — predates the §6.7.10 archetype
requirement.* The shipped behaviour matches **Instant transform** (paste →
result, with format/minify as mode controls rather than a run gate), but the
other six archetypes were never argued away, so §6.5 gate 12 is met only by the
shipped result, not by a recorded decision. See §11.

## 9. Our design

### 9.1 Journey

*Not written as a journey.* What shipped: paste JSON → format / minify → copy,
with row/column error reporting on invalid input.

### 9.2 Layout

*Not recorded — predates the §6.7.10 protocol.*

### 9.3 Must-have

*Not recorded as a list.* What shipped, per the acceptance note: format,
minify, copy and row/column error location on the human page, with the Agent
path running the identical code path.

### 9.4 Deliberately skipped

Only one exclusion is on record, and it is a hard rule rather than a scope
call: **no hand-written JSON parser.** The language built-in is the standard;
anything else is a correctness regression.

### 9.5 Differentiator

*Not argued against named competitors* (see §2). The only differentiator on
record is structural: one engine, one code path, human page and Agent surface
(「Agent 同路径」).

### 9.6 I/O contract

*Not written out in this brief.* The human and Agent paths are recorded as
identical; field shapes live in the implementation.

## 10. Ship-gate status (§6.5 gates 1–12)

| # | Gate (§6.5) | Status |
|---|---|---|
| 1 | Human page: instant use, clear empty/error states, mobile-usable | Shipped — format/minify/copy plus row-column error location; mobile not separately reviewed against this gate |
| 2 | OpenAPI operation + JSON Schema (or multipart contract) | Shipped — Agent runs the same path; schema not written out in this brief |
| 3 | MCP tool registration (Agent-eligible tools) | Not recorded in this brief |
| 4 | SKILL.md (what / when / how / limits) | Not recorded in this brief |
| 5 | Meter id + wallet hooks | Not recorded in this brief |
| 6 | Side-effect class declared | Not recorded in this brief |
| 7 | Stable error codes; `request_id` on server paths | Partially — parse errors carry row/column; a stable error-code set is not recorded |
| 8 | Privacy note: client-only vs uploaded; retention | Not recorded in this brief |
| 9 | Decl/ads: intent title, unique value, related tools | Not recorded in this brief |
| 10 | Decl engine metadata: upstream SOTA name + version | Partially — engine named (ECMAScript `JSON.parse`/`stringify`), no runtime version pinned |
| 11 | **Competitor teardown on file** (§6.7.10) | **Not met** — three products named, none reached or captured (§2) |
| 12 | **Journey archetype chosen deliberately** (§6.7.10) | **Not met** — archetype inferred from the shipped behaviour, never argued (§8) |

**内部验收状态：** `production`（JSON 引擎事实标准 + 人用 format/minify/复制/行列错误 + Agent 同路径）

## 11. Gaps and open questions

- [ ] **No competitor teardown exists** (§6.5 gate 11) — three names, zero
      reaches, zero captures. All three have live URLs that could be reached
      in an afternoon; nobody has.
- [ ] **No archetype decision on file** (§6.5 gate 12).
- [ ] **The "大 JSON 卡死" pain named in §1 has no recorded answer.** The brief
      states the pain and never says what our large-input behaviour is — no
      size ceiling, no streaming/chunking decision, no degradation path. This
      is the most conspicuous hole in the file: the tool names a failure mode
      it never documents fixing.
- [ ] **No journey map, layout study, debt analysis or screenshots** — §4, §5
      and §6 are empty for the same reason.
- [ ] **JSON edge cases are undocumented**: duplicate keys, integers beyond
      `Number.MAX_SAFE_INTEGER`, `-0`, non-UTF-8 input, BOM, NDJSON/JSON-Lines
      input, and the trailing-comma / JSON5-ish text users routinely paste.
      `JSON.parse` has a defined answer for each; which of those answers we
      surface to the user does not.
- [ ] **Gates 3–9 are unrecorded, not necessarily unmet.**
