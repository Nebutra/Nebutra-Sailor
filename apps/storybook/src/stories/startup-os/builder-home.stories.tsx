/**
 * Stories for the Startup OS entry surface.
 *
 * The component is pure — every callback is a prop — so the stories drive it
 * through its four states without any network access.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StartupBuilderHome } from "../../../../web/src/components/startup-os/startup-builder-home";
import { STORY_PROJECTS } from "./_fixtures";

const meta: Meta<typeof StartupBuilderHome> = {
  title: "Startup OS/Builder Home",
  component: StartupBuilderHome,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The entry surface: one focal prompt on a quiet page, the five outputs one sentence compiles into, and the tenant's real recent projects. Regions separate by whitespace and a one-step tonal shift, never by borders.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[100dvh] min-h-0">
        <Story />
      </div>
    ),
  ],
  args: {
    arena: "Developer infrastructure",
    canCompile: false,
    disabled: false,
    isLoading: false,
    isSaving: false,
    onArenaChange: () => undefined,
    onCompile: () => undefined,
    onProjectSelect: () => undefined,
    onThesisChange: () => undefined,
    projects: [],
    selectedProjectId: null,
    thesis: "",
  },
};
export default meta;

type Story = StoryObj<typeof StartupBuilderHome>;

/** Blank page: the example theses carry the user into the first prompt. */
export const Empty: Story = {};

/** Loading: the recent-projects strip holds its geometry so nothing jumps. */
export const Loading: Story = {
  args: { isLoading: true },
};

/** A tenant with real projects, and a thesis long enough to compile. */
export const WithProjects: Story = {
  args: {
    canCompile: true,
    projects: STORY_PROJECTS,
    selectedProjectId: STORY_PROJECTS[0]?.id ?? null,
    thesis: "A usage-metered API gateway for AI apps",
  },
};

/** Compiling: every control is locked while the request is in flight. */
export const Compiling: Story = {
  args: {
    canCompile: false,
    disabled: true,
    isSaving: true,
    projects: STORY_PROJECTS,
    thesis: "A usage-metered API gateway for AI apps",
  },
};
