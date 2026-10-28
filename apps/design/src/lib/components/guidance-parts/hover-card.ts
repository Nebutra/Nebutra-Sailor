export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab"],
      does: "Focuses the trigger. The card opens after openDelay and focus stays on the trigger. Tab again moves into the card's focusable content, and past it the card closes after closeDelay; it is not a focus trap.",
    },
    {
      keys: ["Enter", "Space"],
      does: "Toggles the card at once, without waiting for openDelay.",
    },
    {
      keys: ["Esc"],
      does: "Closes an open card and leaves focus on the trigger.",
    },
  ],
  a11y: [
    {
      title: "Reachable by keyboard and touch",
      body: "The card opens on hover, on keyboard focus, and on a click or tap, which toggles it. Focus never jumps into the card on open, and closing it leaves focus on the trigger. Under dir=rtl the inline-start and inline-end sides mirror.",
    },
    {
      title: "Never the only route to content",
      body: "The card is not announced like a dialog and closes when focus leaves it. Put the same information on the page the trigger leads to: it is a preview that supplements a link, not a container for anything essential.",
    },
  ],
  dos: [
    {
      title: "Make the trigger a real link or button",
      body: "Use asChild so the trigger keeps its own semantics and its own destination.",
      code: `<HoverCardTrigger asChild>
  <Button variant="outline">@acme-web</Button>
</HoverCardTrigger>`,
    },
    {
      title: "Tune the delays",
      body: "openDelay (200 ms) and closeDelay (100 ms) are the defaults and apply to hover and keyboard focus alike. Raise openDelay for dense lists so sweeping the pointer, or tabbing through a row of triggers, does not open a card on every stop.",
      code: "<HoverCard openDelay={600}>…</HoverCard>",
    },
    {
      title: "Keep the card a fixed size",
      body: "Reserve a height for loading, empty and error content so the card does not resize under the pointer.",
    },
  ],
  donts: [
    {
      title: "Don't use it for actions or forms",
      body: "A card that closes when the pointer or focus leaves cannot hold anything the user has to operate. Use Popover, which opens on click and holds focus until dismissed.",
    },
    {
      title: "Don't use it for a one-line hint",
      body: "Tooltip is the right size for a short label and is announced as a description of its control.",
    },
  ],
};
