# Chromatic Visual Regression CI

Chromatic runs on every PR that touches `packages/design/ui/src/` or `apps/storybook/`.

## Setup

1. Go to https://www.chromatic.com/ and create a project linked to this repo
2. Copy the **Project Token**
3. Add it as a GitHub repository secret: `CHROMATIC_PROJECT_TOKEN`

## Workflow

- **PR opened**: Storybook is built and published to Chromatic. Visual diffs are shown.
- **Merge to main**: Changes are auto-accepted as the new baseline.

## Accessibility

The `@storybook/addon-a11y` addon runs axe-core on every story.
Open the **Accessibility** panel in Storybook to see violations.
