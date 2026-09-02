/**
 * The brand mark: eight dots on a 3×3 grid with the centre removed, reading as
 * a small flower or asterisk. Always Ink on Linen. It shipped with five dots
 * arranged in a ring, which is a different glyph.
 */
export function Mark() {
  return (
    <span className="mark" aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
