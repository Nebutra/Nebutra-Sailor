/**
 * Folds what the page already knows from the cva variant maps into an API
 * block: defaults the implementation never destructures (they live in
 * `defaultVariants`), and the declared order of a variant axis.
 *
 * The checker orders the members of a union by internal type id, so a variant
 * prop extracted from `VariantProps<typeof buttonVariants>` reads
 * `'sm' | 'lg' | 'md'`. The cva map has them in the order they were written.
 * The reorder only fires when both sides name exactly the same values, so a
 * prop that merely shares a name with an axis is left alone.
 */

import type { ApiBlock, ApiProp } from "./api-docs";
import type { CvaSpec } from "./ui-source";

const quoted = (value: string) => `"${value}"`;

function literalMembers(type: string): string[] | null {
  const parts = type.split(" | ").map((part) => part.trim());
  const members: string[] = [];
  for (const part of parts) {
    const match = /^"([^"]*)"$/.exec(part);
    if (!match) return null;
    members.push(match[1] as string);
  }
  return members;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}

function mergeProp(prop: ApiProp, specs: CvaSpec[]): ApiProp {
  let next = prop;

  for (const spec of specs) {
    const axis = spec.variants[prop.name];
    if (!axis) continue;

    const members = literalMembers(prop.type);
    if (members && sameSet(members, axis)) {
      next = { ...next, type: axis.map(quoted).join(" | ") };
    }

    const fallback = spec.defaults[prop.name];
    if (next.defaultValue === null && fallback !== undefined) {
      next = { ...next, defaultValue: quoted(fallback) };
    }
  }

  return next;
}

export function mergeCva(block: ApiBlock, cva: Record<string, CvaSpec>): ApiBlock {
  const specs = Object.values(cva);
  if (specs.length === 0) return block;

  return {
    ...block,
    props: block.props.map((prop) => mergeProp(prop, specs)),
    parts: block.parts.map((part) => mergeCva(part, cva)),
  };
}
