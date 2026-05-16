import {
  primitiveFontSize,
  primitiveFontWeight,
  primitiveRadius,
  primitiveSizing,
  primitiveSpacing,
  primitiveTransition,
} from "../primitive";

export const radioOrientations = ["vertical", "horizontal"] as const;
export type RadioOrientation = (typeof radioOrientations)[number];

export const radioTokens = {
  group: {
    gap: primitiveSpacing[3],
    labelGap: primitiveSpacing[2],
  },
  item: {
    gap: primitiveSpacing[2],
    minHeight: primitiveSizing.xs,
    fontSize: primitiveFontSize.sm,
    fontWeight: primitiveFontWeight.normal,
    descriptionSize: primitiveFontSize.xs,
    descriptionGap: primitiveSpacing[1],
  },
  control: {
    size: 16,
    dotSize: 6,
    borderWidth: 1,
    radius: primitiveRadius.full,
  },
  label: {
    fontSize: primitiveFontSize.sm,
    fontWeight: primitiveFontWeight.medium,
  },
  motion: {
    duration: primitiveTransition.duration.micro,
    easing: primitiveTransition.easing.default,
  },
} as const;
