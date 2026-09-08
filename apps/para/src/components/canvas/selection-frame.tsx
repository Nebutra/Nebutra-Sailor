/** Selection border drawn over the selected node. Offset ring keeps it readable on any poster. */
export function SelectionFrame() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary ring-offset-1 ring-offset-background"
    />
  );
}
