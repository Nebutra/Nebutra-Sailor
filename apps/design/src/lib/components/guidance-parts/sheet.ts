export const guidance: import("../guidance").Guidance = {
  keyboard: [
    { keys: ["Enter", "Space"], does: "Opens the sheet from its trigger." },
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Cycles through the sheet's controls. Focus is trapped inside while it is open.",
    },
    { keys: ["Esc"], does: "Closes the sheet and returns focus to the trigger." },
    {
      keys: ["Enter", "Space"],
      does: "On the focused close button or a SheetClose control, closes the sheet.",
    },
  ],
  a11y: [
    {
      title: "Title names the sheet",
      body: "SheetTitle is the accessible name and SheetDescription the description. Leave the title out and the sheet has no name.",
    },
    {
      title: "The close button is named",
      body: "The built-in close icon carries an aria-label from closeLabel (default Close). Pass a translated string; if you hide it with showClose={false}, give the footer a close control.",
    },
    {
      title: "Backdrop clicks are ignored by default",
      body: "Sheet sets disablePointerDismissal, so unsaved input is not lost to a stray click. Pass disablePointerDismissal={false} for read-only content.",
    },
    {
      title: "Focus is trapped, scroll is not locked",
      body: "The default modal is trap-focus: focus stays inside but the document can still scroll. Pass modal for full scroll locking.",
    },
  ],
  dos: [
    {
      title: "Keep the page in view",
      body: "Use a sheet for a secondary task such as editing a record, where seeing the page behind it helps. Right is the default edge.",
      code: '<SheetContent side="right">…</SheetContent>',
    },
    {
      title: "Put actions in SheetFooter",
      body: "SheetBody scrolls on its own and the footer stays pinned, so the confirm button is always reachable.",
      code: `<SheetFooter>
  <SheetClose asChild>
    <Button variant="outline">Cancel</Button>
  </SheetClose>
  <Button>Save</Button>
</SheetFooter>`,
    },
    {
      title: "Control open while saving",
      body: "Hold open in state and ignore onOpenChange until the request settles, so the sheet cannot be dismissed mid-save.",
      code: "<Sheet onOpenChange={(next) => { if (!saving) setOpen(next); }} open={open}>",
    },
  ],
  donts: [
    {
      title: "Don't use it for a blocking decision",
      body: "A confirm that must be answered belongs in AlertDialog, which cannot be dismissed by accident. A sheet can be closed with Escape.",
    },
    {
      title: "Don't rely on left and right in RTL",
      body: "The sides and the close button are physical. They do not mirror in a right-to-left page, so choose the edge deliberately.",
    },
  ],
};
