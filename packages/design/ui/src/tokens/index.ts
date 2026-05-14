/**
 * Design Token System
 *
 * 3-layer architecture:
 *   Layer 1 — primitive.ts  : raw values (hex, px numbers)
 *   Layer 2 — semantic.ts   : light/dark semantic mapping → CSS variables
 *   Layer 3 — components/*  : per-component design decisions
 *
 * VI Reference: packages/design/brand/assets/vi/full.md
 *
 * @see apps/landing-page/DESIGN.md Section 10
 */

// ─── Layer 3: Component Tokens ────────────────────────────────────────────────
export {
  type AvatarSize,
  avatarTokens,
  type ButtonSize,
  badgeTokens,
  buttonTokens,
  type CardPadding,
  cardTokens,
  inputTokens,
} from "./components";
// Motion — four-rail duration scale (micro/flow/reveal/cinematic)
export {
  type Easing,
  easings,
  interactiveVariants,
  type MotionDuration,
  type MotionVar,
  motionDurations,
  motionVariants,
  motionVars,
  sectionMotions,
  staggerContainers,
  staggerDelay,
  transitions,
  viewportSettings,
} from "./motion";
// ─── Layer 1: Primitive Tokens ────────────────────────────────────────────────
export {
  type PrimitiveColor,
  type PrimitiveFontFamily,
  type PrimitiveFontSize,
  type PrimitiveFontWeight,
  type PrimitiveGradient,
  type PrimitiveRadius,
  type PrimitiveShadow,
  type PrimitiveSizing,
  type PrimitiveSpacing,
  primitiveColors,
  primitiveFocusRing,
  primitiveFontFamily,
  primitiveFontSize,
  primitiveFontWeight,
  primitiveGradients,
  primitiveRadius,
  primitiveShadow,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "./primitive";
// ─── Layer 2: Semantic Tokens ─────────────────────────────────────────────────
export {
  type SemanticColorScale,
  type SemanticGradient,
  type SemanticTheme,
  semanticDark,
  semanticGlobals,
  semanticGradients,
  semanticLight,
} from "./semantic";
// Shadows
export {
  type ShadowBrand,
  type ShadowKey,
  type ShadowLevel,
  shadowBrandScale,
  shadowClasses,
  shadowScale,
  shadowVars,
} from "./shadows";
// Spacing
export {
  type ContainerWidth,
  containerWidths,
  type SemanticSpacing,
  type SpacingScale,
  semanticSpacing,
  spacing,
} from "./spacing";
// Typography
export {
  type ButtonSize as ButtonTextSize,
  buttonScale,
  type CopySize,
  type CopyVariant,
  copyScale,
  type FontSize,
  type FontWeight,
  fontSizes,
  fontWeights,
  type HeadingSize,
  // Named scale (Geist-style)
  headingScale,
  type LabelSize,
  type LabelVariant,
  type LineHeight,
  labelScale,
  lineHeights,
  type TextColor,
  type TextStyle,
  textColors,
  textStyles,
} from "./typography";
