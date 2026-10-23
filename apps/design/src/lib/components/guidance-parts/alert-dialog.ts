export const guidance: import("../guidance").Guidance = {
  keyboard: [
    { keys: ["Enter", "Space"], does: "Opens the dialog from its trigger." },
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Cycles through the dialog's controls. Focus stays inside; the page behind is out of reach.",
    },
    {
      keys: ["Esc"],
      does: "Closes the dialog without confirming and returns focus to the trigger.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On the focused Cancel or action button, activates it. Both close the dialog.",
    },
  ],
  a11y: [
    {
      title: "Announced as an alert dialog",
      body: "Base UI gives the popup role alertdialog, so assistive technology treats it as an interruption that needs an answer.",
    },
    {
      title: "Title and description name it",
      body: "AlertDialogTitle is the accessible name and AlertDialogDescription the description. Leave the title out and the dialog has no name.",
    },
    {
      title: "Backdrop clicks are ignored",
      body: "Pointer dismissal is switched off in the root, so only Cancel, the action or Escape can close it. A user cannot answer by accident.",
    },
    {
      title: "Focus returns to the trigger",
      body: "Base UI's focus manager restores focus on close. If the trigger is removed (for example the item was deleted), move focus somewhere sensible yourself.",
    },
  ],
  dos: [
    {
      title: "Say what will be lost",
      body: "Put the consequence in the description, and name the action by its outcome: Delete project, not OK.",
      code: "<AlertDialogAction>Delete project</AlertDialogAction>",
    },
    {
      title: "Use asChild for a destructive action",
      body: "Without asChild the action renders the default button. Wrap a destructive Button when the action cannot be undone.",
      code: `<AlertDialogAction asChild>
  <Button variant="destructive">Delete project</Button>
</AlertDialogAction>`,
    },
    {
      title: "Gate irreversible actions",
      body: "Disable the action Button until the user types the resource name when a mistake is expensive.",
      code: '<Button disabled={typed !== "acme-web"} variant="destructive">Delete</Button>',
    },
  ],
  donts: [
    {
      title: "Don't use it for a form or a task",
      body: "An alert dialog is a question with two answers. Anything the user may want to leave and come back to belongs in a Dialog or a Sheet.",
    },
    {
      title: "Don't close it while a request is pending",
      body: "AlertDialogAction closes on click. For async work use a plain Button inside controlled open state and ignore onOpenChange until the request settles.",
    },
  ],
};
