export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Visits the previous and next buttons. A button is disabled, and so skipped, while there is nothing further to scroll to in that direction.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On a button, scrolls to the previous or next direct child of the scroller.",
    },
    {
      keys: ["↑", "↓", "←", "→"],
      does: "Scroll the viewport when it has focus. The component adds no tabindex, so whether the viewport is a tab stop is up to the browser.",
    },
  ],
  a11y: [
    {
      title: "The viewport is a named region",
      body: "It renders a section labelled by contentLabel (default content). Pass a real noun such as build log so the region is not announced as plain content.",
    },
    {
      title: "Buttons are named from contentLabel",
      body: "Generated names read Scroll build log left, right, up or down. Pass previousButtonLabel and nextButtonLabel when the page is not in English.",
    },
    {
      title: "Scroll position is not announced",
      body: "The fades are decoration and the buttons are the only generated controls. Nothing tells a screen reader how far through the content it is.",
    },
    {
      title: "Smooth scrolling ignores reduced motion",
      body: "The buttons call scrollTo with scrollBehavior as written, and the default is smooth. Pass scrollBehavior=auto yourself when prefers-reduced-motion is set.",
    },
  ],
  dos: [
    {
      title: "Give the scroll axis a size",
      body: "A vertical scroller with no height grows to fit its content and never scrolls. Set height, or put it in a sized parent.",
      code: '<Scroller height={240} contentLabel="build log">…</Scroller>',
    },
    {
      title: "Keep rail items from shrinking",
      body: "On the horizontal axis, give each item shrink-0. Otherwise flex compresses them to fit and nothing overflows.",
      code: `<Scroller overflow="x" childrenContainerClassName="gap-3">
  <div className="w-40 shrink-0">…</div>
</Scroller>`,
    },
    {
      title: "Use buttons for pointer-only rails",
      body: "withButtons steps to the next direct child, which is easier than dragging a scrollbar on a long rail.",
      code: '<Scroller overflow="x" withButtons contentLabel="pipeline steps">',
    },
  ],
  donts: [
    {
      title: "Don't treat it as a carousel",
      body: "There is no snapping, looping or virtualization. A long data set or a carousel belongs in a dedicated primitive.",
    },
    {
      title: "Don't use it in right-to-left layouts yet",
      body: "Edge detection reads scrollLeft as a distance from the left edge, which browsers report as zero or negative in RTL. Fades and buttons can show on the wrong side.",
    },
  ],
};
