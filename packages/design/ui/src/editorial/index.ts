/**
 * Editorial blocks — the long-form article vocabulary.
 *
 * Every component here is a pure presentational Server Component: no
 * `"use client"`, no CMS types, no `next/image`. Media and localized labels
 * arrive as props, so the same block renders in the marketing site, in
 * Storybook, and in any future docs surface. Interactive chrome (copy buttons,
 * syntax highlighting) stays in the consuming app.
 */

export {
  EditorialAuthorBio,
  type EditorialAuthorBioProps,
  type EditorialAuthorLink,
} from "./editorial-author-bio";
export { EditorialCallout, type EditorialCalloutProps } from "./editorial-callout";
export {
  EditorialChart,
  type EditorialChartPoint,
  type EditorialChartProps,
} from "./editorial-chart";
export {
  type EditorialComparisonRow,
  EditorialComparisonTable,
  type EditorialComparisonTableProps,
} from "./editorial-comparison-table";
export {
  EditorialDataTable,
  type EditorialDataTableProps,
  type EditorialDataTableRow,
} from "./editorial-data-table";
export { EditorialDivider, type EditorialDividerProps } from "./editorial-divider";
export {
  EDITORIAL_EMBED_PROVIDERS,
  EditorialEmbedCard,
  type EditorialEmbedCardProps,
  type EditorialEmbedProvider,
  isEditorialEmbedProvider,
} from "./editorial-embed-card";
export { EditorialEntityChip, type EditorialEntityChipProps } from "./editorial-entity-chip";
export { EditorialFaq, type EditorialFaqItem, type EditorialFaqProps } from "./editorial-faq";
export {
  EditorialFigure,
  EditorialFigureGroup,
  type EditorialFigureGroupProps,
  type EditorialFigureProps,
} from "./editorial-figure";
export {
  type EditorialKeyTakeawayItem,
  EditorialKeyTakeaways,
  type EditorialKeyTakeawaysProps,
} from "./editorial-key-takeaways";
export { EditorialMarginNote, type EditorialMarginNoteProps } from "./editorial-margin-note";
export { EditorialPullQuote, type EditorialPullQuoteProps } from "./editorial-pull-quote";
export {
  EditorialSourceIndex,
  type EditorialSourceIndexProps,
  type EditorialSourceItem,
} from "./editorial-source-index";
export {
  EditorialStatGrid,
  type EditorialStatGridProps,
  type EditorialStatItem,
} from "./editorial-stat-grid";
export {
  type EditorialStep,
  EditorialStepLadder,
  type EditorialStepLadderProps,
} from "./editorial-step-ladder";
export {
  EDITORIAL_BODY,
  EDITORIAL_CAPTION,
  EDITORIAL_EYEBROW,
  EDITORIAL_FIGURE,
  EDITORIAL_TITLE,
  EDITORIAL_TONE_FG,
  EDITORIAL_TONE_PLATE,
  EDITORIAL_TONE_WASH,
  EDITORIAL_TONES,
  type EditorialTone,
  editorialBlock,
  editorialFrame,
  editorialToneAccent,
  editorialToneStyle,
  isEditorialTone,
} from "./editorial-surface";
export {
  EditorialTimeline,
  type EditorialTimelineItem,
  type EditorialTimelineProps,
} from "./editorial-timeline";
