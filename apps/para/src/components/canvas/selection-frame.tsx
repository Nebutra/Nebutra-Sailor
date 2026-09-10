/**
 * Selection is a 1px stroke on the node's own bounds — no offset ring, no glow, no scale, no fill
 * tint. Five of five mapped products draw exactly this, and none of them spends the brand accent on
 * it (docs/product-intelligence/visual-language.md §4).
 */
export function SelectionFrame() {
  return (
    <div
      aria-hidden="true"
      className="para-selected pointer-events-none absolute inset-0 rounded-[var(--para-node-radius)]"
    />
  );
}
