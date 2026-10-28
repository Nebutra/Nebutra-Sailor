export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Visits each BreadcrumbLink in order. The current page and the separators are not tab stops.",
    },
    { keys: ["Enter"], does: "Follows the focused link." },
  ],
  a11y: [
    {
      title: "A labelled navigation landmark",
      body: "Breadcrumb renders a nav whose aria-label defaults to breadcrumb. Override it when the page has more than one trail or the UI is localised.",
    },
    {
      title: "An ordered list",
      body: "The trail is an ol, so the depth is announced. Separators are li elements marked presentation and aria-hidden, so they are not read.",
    },
    {
      title: "The current page is marked, not linked",
      body: 'BreadcrumbPage carries aria-current="page" and aria-disabled, and cannot be focused.',
    },
    {
      title: "The ellipsis is decoration",
      body: "BreadcrumbEllipsis is aria-hidden and not interactive. To let people expand a collapsed trail, wrap it in your own named button or menu trigger.",
    },
    {
      title: "Wrapping, not truncation",
      body: "The list is flex-wrap, so a long trail flows onto further lines instead of clipping.",
    },
  ],
  dos: [
    {
      title: "Use asChild with your router link",
      body: "BreadcrumbLink merges its props onto the child, so client-side navigation keeps working.",
      code: '<BreadcrumbLink asChild><Link href="/docs">Docs</Link></BreadcrumbLink>',
    },
    {
      title: "End the trail with BreadcrumbPage",
      body: "The last item is the current page, rendered as plain text rather than a link to itself.",
    },
    {
      title: "Set the separator once, or per divider",
      body: "The separator prop on Breadcrumb replaces the default chevron everywhere; children of a BreadcrumbSeparator override it for that divider.",
      code: '<Breadcrumb separator="/">…</Breadcrumb>',
    },
  ],
  donts: [
    {
      title: "Don't use a one-way arrow as a custom separator in RTL",
      body: "The default chevron mirrors in right-to-left pages, but a custom node such as → is drawn as given. Use a symmetric mark like / or flip your own icon.",
    },
    {
      title: "Don't make it the only way back",
      body: "Breadcrumbs show location. Keep a primary navigation path as well.",
    },
  ],
};
