/**
 * Turns playground state into the JSX a reader would paste.
 *
 * Pure string building, so the snippet next to a live preview is produced by
 * the same values that drive the preview and can be tested without a browser.
 * The rule it enforces is the one that makes a snippet worth copying: a prop
 * that equals the component's default is left out, because nobody writes
 * `variant="default"` by hand.
 */

/** An expression written verbatim inside braces: `prefix={<Plus />}`. */
export interface RawExpression {
  readonly raw: string;
}

export const raw = (expression: string): RawExpression => ({ raw: expression });

export type PropValue = string | number | boolean | null | undefined | RawExpression;

export interface JsxOptions {
  name: string;
  /** Written in this order. */
  props: Record<string, PropValue>;
  /** A prop equal to its default here is omitted. */
  defaults?: Record<string, PropValue>;
  /** Text, an expression (`{row.name}`), or one pre-rendered block per child. */
  children?: string | string[] | RawExpression;
  /** Longest single-line opening tag before props move to their own lines. */
  maxLine?: number;
}

const INDENT = "  ";

function isRaw(value: PropValue): value is RawExpression {
  return typeof value === "object" && value !== null;
}

function sameValue(a: PropValue, b: PropValue): boolean {
  if (isRaw(a) && isRaw(b)) return a.raw === b.raw;
  return a === b;
}

function attribute(key: string, value: PropValue): string | null {
  if (value === undefined || value === null) return null;
  if (value === true) return key;
  if (value === false) return `${key}={false}`;
  if (typeof value === "number") return `${key}={${value}}`;
  if (isRaw(value)) return `${key}={${value.raw}}`;
  // A double quote cannot sit in a JSX string attribute; an expression can.
  return /["&<>\r\n\t]/.test(value) ? `${key}={${JSON.stringify(value)}}` : `${key}="${value}"`;
}

/** Text JSX would read as syntax has to be an expression. */
function childText(text: string): string {
  return /[{}<>&\r\n\t]/.test(text) || text !== text.trim() ? `{${JSON.stringify(text)}}` : text;
}

export function jsx({ name, props, defaults = {}, children, maxLine = 80 }: JsxOptions): string {
  const attributes: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (key in defaults && sameValue(value, defaults[key])) continue;
    const written = attribute(key, value);
    if (written !== null) attributes.push(written);
  }

  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  // Text and a lone expression are both one inline child.
  const inlineChild =
    typeof children === "string"
      ? childText(children)
      : children !== undefined && !Array.isArray(children)
        ? `{${children.raw}}`
        : null;
  const close = hasChildren ? ">" : " />";
  const oneLine = `<${[name, ...attributes].join(" ")}${close}`;

  const open =
    oneLine.length <= maxLine || attributes.length === 0
      ? oneLine
      : [`<${name}`, ...attributes.map((a) => `${INDENT}${a}`), hasChildren ? ">" : "/>"].join(
          "\n",
        );

  if (!hasChildren) return open;

  if (inlineChild !== null) {
    const inline = `${open}${inlineChild}</${name}>`;
    if (!open.includes("\n") && inline.length <= maxLine) return inline;
    return [open, `${INDENT}${inlineChild}`, `</${name}>`].join("\n");
  }

  const lines = (Array.isArray(children) ? children : [])
    .flatMap((child) => child.split("\n"))
    .map((l) => `${INDENT}${l}`);
  return [open, ...lines, `</${name}>`].join("\n");
}

export function importLine(names: string[], from: string, maxLine = 80): string {
  const unique = [...new Set(names)].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const oneLine = `import { ${unique.join(", ")} } from "${from}";`;
  if (oneLine.length <= maxLine) return oneLine;
  return [`import {`, ...unique.map((name) => `${INDENT}${name},`), `} from "${from}";`].join("\n");
}

export interface SnippetOptions {
  imports: { names: string[]; from: string }[];
  body: string;
}

/** Imports (merged per module, modules sorted), a blank line, then the body. */
export function snippet({ imports, body }: SnippetOptions): string {
  const byModule = new Map<string, string[]>();
  for (const entry of imports) {
    byModule.set(entry.from, [...(byModule.get(entry.from) ?? []), ...entry.names]);
  }
  const lines = [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([from, names]) => importLine(names, from));

  return lines.length > 0 ? `${lines.join("\n")}\n\n${body}` : body;
}
