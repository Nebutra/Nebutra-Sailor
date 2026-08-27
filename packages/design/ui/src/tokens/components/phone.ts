import { primitiveFontSize, primitiveFontWeight, primitiveSpacing } from "../primitive";

export const phoneChromes = ["graphite", "silver", "titanium"] as const;
export type PhoneChrome = (typeof phoneChromes)[number];

export const phoneTokens = {
  viewport: {
    width: 433,
    height: 882,
    screen: {
      x: 21.25,
      y: 19.25,
      width: 389.5,
      height: 843.5,
      radius: 55.75,
    },
  },
  chrome: {
    graphite: {
      frame: "var(--neutral-9)",
      frameMuted: "var(--neutral-8)",
      glass: "var(--neutral-1)",
      cutout: "var(--neutral-12)",
      screen: "var(--neutral-2)",
    },
    silver: {
      frame: "var(--neutral-5)",
      frameMuted: "var(--neutral-6)",
      glass: "var(--neutral-1)",
      cutout: "var(--neutral-12)",
      screen: "var(--neutral-2)",
    },
    titanium: {
      frame: "var(--neutral-7)",
      frameMuted: "var(--neutral-8)",
      glass: "var(--neutral-2)",
      cutout: "var(--neutral-12)",
      screen: "var(--neutral-2)",
    },
  } satisfies Record<
    PhoneChrome,
    {
      readonly frame: string;
      readonly frameMuted: string;
      readonly glass: string;
      readonly cutout: string;
      readonly screen: string;
    }
  >,
  fallback: {
    padding: primitiveSpacing[4],
    fontSize: primitiveFontSize.xs,
    fontWeight: primitiveFontWeight.medium,
  },
  shadow: "0 20px 36px color-mix(in oklch, var(--neutral-12) 18%, transparent)",
} as const;
