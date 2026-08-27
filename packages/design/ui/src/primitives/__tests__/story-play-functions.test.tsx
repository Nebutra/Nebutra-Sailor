import { composeStories } from "@storybook/react";
import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import * as avatarExtendedStories from "../avatar-extended.stories";
import * as commandStories from "../command.stories";
import * as commandMenuPartsStories from "../command-menu-parts.stories";
import * as fieldStories from "../field.stories";
import * as formStories from "../form.stories";

/**
 * Executes the `play` functions of the story files that carry behavioural
 * assertions.
 *
 * There is no Storybook test-runner in this repo: `apps/storybook` has only
 * `dev`, `build` and `typecheck`, so a `play` function runs in the interactions
 * panel when a human opens the story and nowhere else. That makes the keyboard
 * and ARIA assertions in those stories documentation rather than enforcement —
 * exactly the gap docs/design-system/component-census.md recorded for the
 * component-story rule itself.
 *
 * `composeStories` applies each story's args and decorators and hands back a
 * plain component, so the same assertions run here under jsdom on every
 * `pnpm --filter @nebutra/ui test`. Stories without a `play` are skipped: their
 * value is visual and belongs in Storybook, not in an assertion-free render.
 *
 * Stories are discovered from the module, not listed by hand, so a new `play`
 * function is picked up without touching this file.
 */

const STORY_MODULES = {
  Command: commandStories,
  CommandMenuParts: commandMenuPartsStories,
  AvatarExtended: avatarExtendedStories,
  Form: formStories,
  Field: fieldStories,
} as const;

beforeAll(() => {
  // cmdk calls scrollIntoView on the selected item on every selection change;
  // jsdom does not implement it. Without this, every keyboard story throws
  // during mount rather than failing an assertion.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

type PlayableStory = React.ComponentType & {
  play?: (context: { canvasElement: HTMLElement }) => Promise<void> | void;
};

function playableStories(): Array<[string, PlayableStory]> {
  const entries: Array<[string, PlayableStory]> = [];
  for (const [group, module] of Object.entries(STORY_MODULES)) {
    const composed = composeStories(module as Parameters<typeof composeStories>[0]);
    for (const [name, Story] of Object.entries(composed)) {
      const candidate = Story as unknown as PlayableStory;
      if (typeof candidate.play === "function") entries.push([`${group}/${name}`, candidate]);
    }
  }
  return entries;
}

const stories = playableStories();

describe("story play functions execute outside Storybook", () => {
  it("finds the play functions it is supposed to run", () => {
    // A rename or a lost export would otherwise make this suite silently pass
    // with nothing in it.
    expect(
      stories.length,
      "no story in the surveyed files exposes a play function — did composeStories lose the module?",
    ).toBeGreaterThanOrEqual(14);
  });

  for (const [name, Story] of stories) {
    it(name, async () => {
      const { container } = render(<Story />);
      await Story.play?.({ canvasElement: container });
    }, 20_000);
  }
});
