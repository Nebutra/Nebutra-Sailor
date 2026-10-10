import {
  Children,
  type CSSProperties,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * The hero headline's words, each in its own mask (`.hero-mask` in
 * app/landing-motion.css), numbered for the stagger.
 *
 * Server-rendered and script-free: the words are in the HTML as text, the
 * motion is a CSS animation on first paint, and the headline reads the same
 * to a crawler, a screen reader and a visitor with JavaScript off.
 *
 * Words come from `Intl.Segmenter`, so Chinese and Japanese break into words,
 * not characters; punctuation stays glued to the word before it, so a line
 * never starts with "。" or ",". An element inside the headline (the
 * `.signature` span from a rich message) moves as one unit, whole.
 */
export function MaskedHeadline({ children, locale }: { children: ReactNode; locale: string }) {
  const counter = { i: 0 };
  return <>{mask(children, locale, counter)}</>;
}

type Counter = { i: number };

function unit(content: ReactNode, counter: Counter, key: string) {
  const i = counter.i++;
  return (
    <span key={key} className="hero-mask">
      <span style={{ "--i": i } as CSSProperties}>{content}</span>
    </span>
  );
}

function mask(node: ReactNode, locale: string, counter: Counter): ReactNode {
  return Children.toArray(node).map((child, index) => {
    const key = `m${index}`;
    if (typeof child === "string" || typeof child === "number") {
      return <Fragment key={key}>{maskText(String(child), locale, counter, key)}</Fragment>;
    }
    if (isValidElement(child)) {
      // A fragment (or array) is transparent; any other element is one word.
      if (child.type === Fragment) {
        const el = child as ReactElement<{ children?: ReactNode }>;
        return <Fragment key={key}>{mask(el.props.children, locale, counter)}</Fragment>;
      }
      return unit(child, counter, key);
    }
    return child;
  });
}

const SPACE = /^\s+$/u;

/** Split text into words (with trailing punctuation) and the spaces between them. */
export function splitWords(text: string, locale: string): string[] {
  const parts: string[] = [];
  let segments: { segment: string; isWordLike?: boolean }[];
  try {
    segments = [...new Intl.Segmenter(locale, { granularity: "word" }).segment(text)];
  } catch {
    segments = text
      .split(/(\s+)/u)
      .map((segment) => ({ segment, isWordLike: !SPACE.test(segment) }));
  }
  for (const { segment, isWordLike } of segments) {
    if (!segment) continue;
    const last = parts.length - 1;
    if (SPACE.test(segment)) parts.push(segment);
    else if (!isWordLike && last >= 0 && !SPACE.test(parts[last] ?? " ")) parts[last] += segment;
    else if (
      last >= 0 &&
      !SPACE.test(parts[last] ?? " ") &&
      !/[\p{L}\p{N}]/u.test(parts[last] ?? "")
    )
      // An opening mark ("“", "(") waiting for its word.
      parts[last] += segment;
    else parts.push(segment);
  }
  return parts;
}

function maskText(text: string, locale: string, counter: Counter, key: string): ReactNode[] {
  return splitWords(text, locale).map((part, j) =>
    SPACE.test(part) ? part : unit(part, counter, `${key}-${j}`),
  );
}
