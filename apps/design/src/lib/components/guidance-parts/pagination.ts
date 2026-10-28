export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Visits the previous link, then the next link. A missing side leaves no tab stop.",
    },
    { keys: ["Enter"], does: "Follows the focused link." },
  ],
  a11y: [
    {
      title: "A labelled navigation landmark",
      body: "Pagination renders a nav whose aria-label defaults to Page navigation. Override it when a page has more than one.",
    },
    {
      title: "Links name their destination",
      body: "Each link reads Go to previous page or Go to next page followed by the destination title. Pass linkLabel to replace that English default (for example when localising); previousLabel and nextLabel only change the visible caption.",
    },
    {
      title: "Relations are declared",
      body: "The links carry rel=prev and rel=next.",
    },
    {
      title: "A missing side is blank, not disabled",
      body: "With no previous or next, an aria-hidden spacer keeps the other link on its side. Nothing is announced or focusable in its place.",
    },
    {
      title: "One focus ring, from the page",
      body: "The ring comes from the global :focus-visible rule; focus-visible:outline-none on the link does not remove it.",
    },
  ],
  dos: [
    {
      title: "Pass only the neighbours that exist",
      body: "Omit previous on the first page and next on the last.",
      code: '<Pagination next={{ title: "Installation", href: "/docs/install" }} />',
    },
    {
      title: "Keep titles short",
      body: "A long title is truncated to one line, so put the distinguishing words first.",
    },
  ],
  donts: [
    {
      title: "Don't use it for numbered pages",
      body: "It is a previous and next pair for sequential documents. There are no page numbers or ellipsis.",
    },
    {
      title: "Don't expect anything with neither side",
      body: "With no previous and no next the component renders nothing at all, so no empty landmark is emitted.",
    },
  ],
};
