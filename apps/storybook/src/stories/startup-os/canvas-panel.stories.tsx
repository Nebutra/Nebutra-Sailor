/**
 * Stories for the spatial company canvas and its inspector rail.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StartupCanvasPanel } from "../../../../web/src/components/startup-os/startup-canvas-panel";
import { STORY_ARTIFACT, STORY_PROJECT, STORY_RUN } from "./_fixtures";

const meta: Meta<typeof StartupCanvasPanel> = {
  title: "Startup OS/Canvas Panel",
  component: StartupCanvasPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Artifacts and governed runs as one draggable graph derived from persisted state. The canvas well is a tonal step below the toolbar and the inspector — there are no rules between them.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[100dvh] min-h-0 bg-neutral-2 p-3">
        <div className="h-full min-h-0 overflow-hidden rounded-2xl bg-neutral-1 shadow-ambient-sm">
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    canvasLayout: null,
    isExecuting: false,
    onExecuteRun: () => undefined,
    onPersistLayout: async () => undefined,
    onSelectArtifact: () => undefined,
    onSelectRun: () => undefined,
    project: STORY_PROJECT,
    selectedArtifactId: STORY_ARTIFACT?.id ?? null,
    selectedRun: STORY_RUN,
  },
};
export default meta;

type Story = StoryObj<typeof StartupCanvasPanel>;

/** An artifact and a run selected — the inspector shows both cards. */
export const Default: Story = {};

/** Nothing selected — the inspector states what to do instead of sitting blank. */
export const NothingSelected: Story = {
  args: { selectedArtifactId: null, selectedRun: null },
};

/** A run is executing — the inspector's action reflects it. */
export const Executing: Story = {
  args: { isExecuting: true },
};

/** A persisted layout with a wider zoom. */
export const ZoomedIn: Story = {
  args: {
    canvasLayout: {
      zoom: 1,
      updatedAt: "2026-01-05T09:00:00.000Z",
      nodePositions: {},
    },
  },
};
