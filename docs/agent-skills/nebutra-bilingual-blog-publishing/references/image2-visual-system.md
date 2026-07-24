# image2 Editorial Visual System

Use this reference when a Nebutra blog post needs a cover, social image, inline diagram, or visual refresh. The goal is not "make one pretty cover"; the goal is to design a coherent visual system whose number, role, style, and placement are derived from the article.

## Hard Gate

Original Nebutra posts require at least one semantic cover image. The user providing no image assets is not a reason to skip image work; it means the agent must generate a Nebutra editorial cover. Skip cover generation only when the user explicitly asks for no cover, image generation/upload is unavailable, or the task is an update that does not touch visuals. Record that exception in the closeout.

## Image Count Heuristic

- **Short product update / announcement, under 1,200 words**: 1 cover.
- **Founder note / essay, 1,200-3,000 words**: 1 cover, optionally 1 pull-quote/social card.
- **Research report / framework / tutorial, 3,000+ words**: 1 cover plus 2-4 inline editorial graphics.
- **Comparison / review / teardown**: 1 cover plus 1 comparison plate or matrix visual.
- **Authorized repost**: use original media only if rights allow. Otherwise create a Nebutra editorial cover and optionally one explainer visual. Always preserve attribution.

## Image Roles

1. **Cover**
   - Aspect: 16:9 or 1200x630 social-safe composition.
   - Purpose: encode the central thesis in one editorial metaphor.
   - Placement: hero/card/OG source.
2. **Concept map**
   - Aspect: 4:3, 16:10, or tall responsive depending on complexity.
   - Purpose: show framework layers, taxonomy, ecosystem map, or named concepts.
   - Placement: after the section that introduces the framework.
3. **Process diagram**
   - Aspect: wide 16:9 or 21:9.
   - Purpose: show workflow stages, lifecycle, flywheel, or pipeline.
   - Placement: before operational sections.
4. **Comparison plate**
   - Aspect: 16:10 or 4:3.
   - Purpose: visually compare options, tradeoffs, or before/after.
   - Placement: near comparison tables.
5. **Pull-quote/social card**
   - Aspect: 1:1, 4:5, or 1200x630.
   - Purpose: distribution asset, not default article body art.

## image2 Operating Model

Treat image2 as the primary visual synthesis engine. It has strong multimodal, brand, icon, typography, and composition priors; use those capabilities deliberately instead of reducing the task to a generic "AI SaaS cover" prompt.

- Give image2 the article brief, semantic hierarchy, visual references, brand references, and negative constraints in one coherent prompt.
- When an exact brand mark or icon matters, provide the relevant raster reference image directly when available, and state whether it should appear, influence style, or only inform recognition.
- Do not rely on hand-merged external approximations when image2 can preserve identity and visual consistency from references.
- Manual raster composition is acceptable only for deterministic crop, export, exact placement, or final production assembly after the image2 direction is chosen.
- Do not ask image2 to produce publish-critical long text, data tables, dense UI screenshots, or precise chart labels. Use renderer blocks for those.

## Nebutra Editorial Art Direction

Default Nebutra blog imagery should feel like mature editorial design for technical strategy, not commodity AI content marketing.

Preferred visual languages:

- **Swiss editorial systems**: strong grid, asymmetric balance, restrained type-like rhythm, generous margins, deliberate negative space.
- **Information architecture as image**: worktables, routed panes, dossiers, ledgers, split context windows, research rooms, control desks, orchestration boards, layered maps.
- **Premium technical publishing**: off-white or paper-toned grounds, near-black structural linework, restrained Nebutra blue/cyan accent, quiet secondary colors, print grain, calibrated contrast.
- **Institutional product taste**: calm, legible, rigorous, useful; closer to a serious research magazine or design-system case study than a startup landing hero.
- **Specific metaphor over decoration**: every object should map to the article's thesis, tension, workflow, actor, or consequence.

Use richer art direction when appropriate:

- **Systems essay**: modular architecture, isolated work cells, routing lines, context partitions, dispatch/control surfaces.
- **Founder note**: desk, memo, annotated draft, product artifact, human editorial presence without stock-photo cliches.
- **Research/report**: taxonomy wall, evidence board, reference cards, matrix structure, archival/print treatment.
- **Comparison/review**: paired object systems, before/after plates, calibrated split composition, weighted tradeoff geometry.
- **Tutorial/workflow**: stepwise process surface, pipeline, instrument panel, lab notebook, durable visual sequence.

Avoid:

- generic neon AI backgrounds
- random dashboards or fake UI chrome
- isometric SaaS icon farms
- dense node spaghetti with no hierarchy
- generic app-tile grids
- wrong-vendor marks or logo lookalikes, such as a Gemini-like sparkle for an Anthropic/Claude article
- illegible generated text
- unrelated robots unless robotics is actually the topic
- SVG art or SVG intermediate assets unless the user explicitly asks for SVG output
- stock-photo look
- dark blurry atmospheric art
- decorative orbs, bokeh blobs, empty gradients, or single centered logo-like marks
- unrelated third-party logos or badges that imply endorsement

## Brand and Icon Policy

Relevant third-party marks, icons, and product cues may appear when they are factual editorial context. The job is accuracy and context control, not blanket avoidance.

- Use the correct named brand, product, or model cue when the article is about it.
- Prefer direct multimodal reference input to image2 for exact brand/icon recognition and consistency.
- If a mark appears as a primary factual element, verify it visually before publish.
- Never substitute a lookalike, generic sparkle, starburst, swirl, orb, mascot, or logo-like icon for a named vendor.
- Do not imply partnership, endorsement, or sponsorship unless the article says so.
- If a mark is not needed, choose a logo-free concept with neutral topic-specific motifs.

When the article discusses Anthropic/Claude and the visual needs a brand cue, use the Anthropic/Claude mark or a clearly Claude-specific factual cue. Do not use Gemini-like sparkles, generic AI stars, or unrelated model-provider iconography.

## Creative Brief Before Generation

Before calling image generation, write this brief. This is a prompt-engineering step, not paperwork. It forces semantic accuracy, aesthetic quality, and production constraints into the image2 prompt.

```text
ARTICLE INTENT
- Article title:
- Language coverage:
- Content type: original / repost / research / tutorial / founder note / comparison / announcement
- Audience:
- Central thesis:
- Central tension:
- Named entities and brands:
- What a reader should understand from the image before reading:
- What must not be implied:

VISUAL STRATEGY
- Image set count:
- Image roles and placements:
- Dominant metaphor:
- Supporting motifs:
- Visual hierarchy:
- Brand/icon treatment:
- Multimodal references to provide:
- Renderer/crop constraints:

AESTHETIC DIRECTION
- Design lineage: Swiss editorial / research magazine / institutional product / technical poster / archival report / other
- Composition: grid, balance, margins, focal path, depth
- Color: ground, structural color, accent, forbidden colors
- Material and texture: paper, glass, metal, screen, grain, shadow, lighting
- Typography presence: none / abstract typographic texture / short exact mark only
- Detail density: sparse / medium / rich, with thumbnail-safe focal point

NEGATIVE SPACE
- Avoid:
- Must reject if:
```

## Prompt Engineering Rules

The generation prompt must be specific enough that a professional art director could understand the intended image without seeing the article.

Include:

- **Subject**: the concrete objects, scene, or abstract system to render.
- **Meaning**: what each major object represents in the article.
- **Hierarchy**: primary focal point, secondary details, background support.
- **Composition**: camera/viewpoint, grid, margins, crop safety, foreground/midground/background.
- **Style lineage**: editorial references by design tradition, not vague adjectives.
- **Color and material**: exact mood and constraints, not a one-hue palette.
- **Brand/icon instructions**: whether to show, reference, or avoid brand marks.
- **Text policy**: no readable generated text unless it is a provided exact mark or very short controlled label.
- **Failure conditions**: what makes the image unusable.

Do not use vague prompts like "AI agents workflow, futuristic, beautiful, SaaS style." Replace them with visual grammar: "a quiet editorial workroom of separated context desks connected by routed blue signal lines, each desk holding a distinct dossier, with a central orchestration ledger in near-black linework."

## Candidate Generation Standard

- Generate at least 3 cover candidates when practical.
- Make the candidates materially different:
  - editorial object metaphor
  - abstract system architecture
  - human/product context
- Generate 2 candidates for important inline graphics when practical.
- Pick based on semantic fit first, visual craft second, novelty third.
- Check desktop and mobile crop safety.
- Reject images with broken hands/text, unrelated symbolism, unreadable words, generic "AI network" filler, accidental vendor-logo resemblance, cheap SaaS clip-art composition, or a single centered decorative icon.
- Record final alt text and intended article placement.

## Design Quality Rubric

Score candidates before upload:

| Criterion | Pass condition |
| --- | --- |
| Semantic fit | A reader can infer the article's core tension without reading the title. |
| Specificity | The imagery belongs to this article, not any generic AI automation post. |
| Hierarchy | One focal idea dominates at 320px-wide thumbnail size. |
| Composition | Grid, margins, depth, and object relationships feel deliberately designed. |
| Editorial craft | Color, texture, and restraint feel like technical publishing, not prompt-template output. |
| Brand accuracy | Logos and vendor cues are exact, intentionally referenced, or absent; no lookalikes. |
| Renderer safety | 16:9 desktop crop and card crop preserve the focal point. |

## Prompt Template

```text
Create a Nebutra editorial blog <role> for an article titled "<title>".

Core argument:
<one sentence thesis>.

Reader takeaway from the image:
<what the image should communicate before the reader sees the headline>.

Named entities and brand/icon handling:
<entities>. <Show/reference/avoid exact marks>. If brand references are attached, preserve their identity and use them only as factual editorial context.

Visual concept:
<specific metaphor, objects, and semantic mapping. Explain what each important object means>.

Composition:
<viewpoint, grid, foreground/midground/background, focal point, negative space, safe margins, mobile crop behavior>.

Aesthetic direction:
Mature technical editorial illustration, Swiss grid discipline, research-magazine clarity, institutional product taste, warm off-white or paper-toned ground, near-black structural linework, restrained Nebutra blue/cyan accent, quiet secondary colors, subtle print grain, calibrated shadows, premium but not glossy.

Detail and texture:
<sparse/medium/rich>. Keep details meaningful and ordered. Maintain thumbnail-safe hierarchy.

Constraints:
No generic neon AI background. No fake dashboard unless explicitly requested. No random robots. No illegible generated text. No wrong-vendor symbol or logo lookalike. No decorative orb/blob/empty gradient. No SVG output or SVG intermediate asset. Do not imply endorsement. The image must communicate <semantic purpose>.

Reject conditions:
Reject if it looks like commodity AI blog art, icon collage, unrelated SaaS marketing, a generic network diagram, a single centered logo-like symbol, or if any brand cue is wrong.

Output:
<aspect ratio and target use>.
```
