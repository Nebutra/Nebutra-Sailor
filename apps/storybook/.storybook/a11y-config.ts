/**
 * Storybook @storybook/addon-a11y configuration.
 *
 * Enforces axe-core accessibility rules globally across all stories.
 * Imported by preview.ts and merged into the `parameters.a11y` key.
 */
export const a11yConfig = {
  config: {
    rules: [
      { id: "color-contrast", enabled: true },
      { id: "heading-order", enabled: true },
      { id: "label", enabled: true },
      { id: "button-name", enabled: true },
      { id: "image-alt", enabled: true },
      { id: "link-name", enabled: true },
    ],
  },
};
