export const guidance: import("../guidance").Guidance = {
  keyboard: [
    { keys: ["Enter", "Space"], does: "Opens the drawer from its trigger." },
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Cycles through the drawer's controls. Focus stays inside while it is open.",
    },
    {
      keys: ["Esc"],
      does: "Closes the drawer and returns focus to the trigger. Ignored when dismissible is false.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On a focused DrawerClose control, closes the drawer.",
    },
  ],
  a11y: [
    {
      title: "Title and description name it",
      body: "DrawerTitle is the accessible name and DrawerDescription the description. Render both; Vaul warns when either is missing.",
    },
    {
      title: "Swipe is never the only way out",
      body: "Dragging down dismisses a bottom drawer, but not everyone can drag. Escape and a DrawerClose control must always work. With dismissible set to false they are the only ones left, so keep one in the footer.",
    },
    {
      title: "The handle is decoration",
      body: "The handle is a visual affordance for the drag gesture and only draws on bottom drawers. It adds no keyboard behaviour.",
    },
  ],
  dos: [
    {
      title: "Use bottom for touch",
      body: "Bottom is the default and the only direction with a drag handle. It keeps actions within thumb reach.",
      code: "<Drawer>…</Drawer>",
    },
    {
      title: "Cap tall drawers with height",
      body: "A number resolves to px and a string passes through as CSS. The drawer never grows past the viewport minus 1rem.",
      code: '<Drawer height="60vh">…</Drawer>',
    },
    {
      title: "Lock it while a request is pending",
      body: "dismissible turns off swipe, Escape and outside press. Drive it from your pending state and control open yourself.",
      code: "<Drawer dismissible={!saving} onOpenChange={setOpen} open={open}>…</Drawer>",
    },
  ],
  donts: [
    {
      title: "Don't use it as a desktop side panel",
      body: "Sheet is the lateral panel for desktop, with a fixed width and a built-in close button. Drawer's side directions are plain edge panels.",
    },
    {
      title: "Don't stack it over a Dialog or Sheet",
      body: "Drawer layers at z-index 50, below the backdrop and modal layers (1040 and 1050) that Dialog and Sheet use. Opened from inside one of them it appears behind it.",
    },
  ],
};
