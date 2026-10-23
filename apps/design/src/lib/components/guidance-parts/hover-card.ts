export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab"],
      does: "Focuses the trigger. Focus alone does not open the card; the open state is driven by pointer hover on the wrapper.",
    },
    {
      keys: ["Esc"],
      does: "Closes an open card.",
    },
  ],
  a11y: [
    {
      title: "Not reachable by keyboard",
      body: "The card opens from mouse enter and leave on the wrapper. Focus and click requests to open are ignored, so a keyboard or touch user never sees it.",
    },
    {
      title: "Never the only route to content",
      body: "Put the same information on the page the trigger leads to. The card is a preview that supplements a link, not a container for anything essential.",
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
      body: "openDelay (200 ms) and closeDelay (100 ms) are the defaults. Raise openDelay for dense lists so sweeping the pointer does not open a card on every row.",
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
      body: "A card that closes when the pointer leaves cannot hold anything the user has to operate. Use Popover, which opens on click and the keyboard.",
    },
    {
      title: "Don't use it for a one-line hint",
      body: "Tooltip opens on focus as well as hover and is the right size for a short label.",
    },
  ],
};
