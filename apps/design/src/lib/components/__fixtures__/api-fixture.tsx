// @primitive-exempt: type fixture for the API extractor; it intentionally mimics a bare button.
/**
 * Fixture for api-docs.test.ts. Each export covers one shape the extractor has
 * to read in the real library: forwardRef-free function components, union
 * props, inherited DOM attributes, JSDoc defaults, destructuring defaults,
 * compound statics and hooks.
 */
import type * as React from "react";

type Native = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "prefix">;

export interface FixtureButtonProps extends Native {
  /** Visual weight. */
  variant?: "solid" | "outline" | null;
  /** Shows a spinner and blocks input. */
  loading?: boolean;
  /** The label. */
  label: string;
  /**
   * Corner radius.
   * @default "md"
   */
  radius?: "sm" | "md";
  /** @deprecated Use `variant`. */
  tone?: string;
  /** Leading glyph. */
  icon?: React.ReactNode;
  /** Forwarded to the root element. */
  ref?: React.Ref<HTMLButtonElement>;
}

/** A button used to test the extractor. */
export const FixtureButton = ({
  variant = "solid",
  loading = false,
  size = 3,
  ...props
}: FixtureButtonProps & { size?: number }) => {
  void variant;
  void loading;
  void size;
  return <button type="button" {...props} />;
};

type Labelled = { label: string; id: string };
type Unlabelled = { label?: undefined; id?: string };

export type FixtureFieldProps = { tone?: "a" | "b" } & (Labelled | Unlabelled);

/** Field whose props are a union. */
export function FixtureField(props: FixtureFieldProps) {
  const { tone = "a", ...rest } = props;
  void tone;
  void rest;
  return null;
}

type RootProps = { striped?: boolean };
type PartProps = { numeric?: boolean };

const Root = (props: RootProps) => {
  void props;
  return null;
};
const Part = (props: PartProps) => {
  void props;
  return null;
};

export const FixtureTable = Object.assign(Root, { Part });

export function useFixtureThing() {
  return {
    /** Shows the thing. */
    show: (text: string) => text.length,
    hide: () => undefined,
  };
}

export const NOT_EXPORTED_AS_COMPONENT = 3;

// A cva-shaped mapped type: the props have no written annotation of their own.
const config = { variants: { density: { compact: "", cozy: "" } } };
type VariantsOf<T extends { variants: Record<string, Record<string, string>> }> = {
  [K in keyof T["variants"]]?: keyof T["variants"][K] | null;
};

export function FixtureVariants(props: VariantsOf<typeof config>) {
  void props;
  return null;
}
