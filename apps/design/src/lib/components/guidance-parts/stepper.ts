export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Visits each indicator when clickable is on, then the navigation buttons. Without clickable the indicators are disabled and skipped, as are disabled navigation buttons.",
    },
    {
      keys: ["Enter", "Space"],
      does: "On an indicator, jumps to its step (including steps ahead). On Previous, Next or Finish, activates it.",
    },
  ],
  a11y: [
    {
      title: "The current step is not announced",
      body: "Indicators are plain buttons in plain divs: there is no list, and no aria-current on the current step. Surface the position yourself, for example with a heading or a live region in the panel.",
    },
    {
      title: "Color is not the only signal",
      body: "Completed steps show a check, the current step a ring and a foreground-coloured title, pending steps a number in a muted outline.",
    },
    {
      title: "Disabled indicators are not tab stops",
      body: "Without clickable every indicator is a disabled button, so keyboard users move straight to the navigation buttons.",
    },
    {
      title: "Some text is fixed",
      body: 'The "(Optional)" marker and the ProgressStepper caption (步骤 N / M) are not configurable; Previous, Next and Finish are, via prevLabel, nextLabel and finishLabel.',
    },
  ],
  dos: [
    {
      title: "Hold Next back until the step is valid",
      body: "disableNext keeps the forward button disabled; loading disables both while a save is pending.",
      code: "<StepperNavigation disableNext={!isValid} loading={isSaving} />",
    },
    {
      title: "Render one StepperContent per step",
      body: "Content mounts only while its step is current, so unmounted steps lose local state. Keep form values in the parent.",
      code: "<StepperContent step={0}>…</StepperContent>",
    },
    {
      title: "Use ProgressStepper for position only",
      body: "It needs no provider and no step list, just the current index and the total.",
      code: "<ProgressStepper currentStep={1} totalSteps={4} />",
    },
  ],
  donts: [
    {
      title: "Don't expect an error step",
      body: "StepStatus includes error, but the provider only produces pending, current and completed, so a failed step cannot be shown through the public API.",
    },
    {
      title: "Don't use clickable to enforce order",
      body: "clickable lets users jump to any step, including ones ahead. Leave it off for a strictly linear flow.",
    },
    {
      title: "Don't change initialStep after mount",
      body: "The provider reads it once. Remount with a key, or call goToStep.",
    },
  ],
};
