/**
 * Stories for the workspace's conversational column.
 *
 * `conversation` is injected so the panel never opens an SSE stream — each
 * story is a frozen frame of a real turn state.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StartupThreadPanel } from "../../../../web/src/components/startup-os/startup-thread-panel";
import {
  ERROR_CONVERSATION,
  IDLE_CONVERSATION,
  STORY_PROJECT,
  STORY_PROJECTS,
  STORY_REVIEW_RUN,
  STORY_RUN,
  STREAMING_CONVERSATION,
} from "./_fixtures";

const meta: Meta<typeof StartupThreadPanel> = {
  title: "Startup OS/Thread Panel",
  component: StartupThreadPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "One column: project header, thread history, and the live chat composer. The governed-run controls (approve / execute) stay attached to the selected-run card because they are real API calls.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="grid h-[100dvh] min-h-0 grid-cols-[380px_minmax(0,1fr)] bg-neutral-2">
        <Story />
        <div className="m-3 rounded-2xl bg-neutral-1 shadow-ambient-sm" />
      </div>
    ),
  ],
  args: {
    activityCount: 4,
    conversation: IDLE_CONVERSATION,
    isApproving: false,
    isExecuting: false,
    onApprove: () => undefined,
    onChatApplied: () => undefined,
    onExecuteRun: () => undefined,
    onSelectProject: () => undefined,
    onToggleNav: () => undefined,
    project: STORY_PROJECT,
    projects: STORY_PROJECTS,
    selectedRun: STORY_RUN,
  },
};
export default meta;

type Story = StoryObj<typeof StartupThreadPanel>;

/** Idle: history above, composer below, an executable run selected. */
export const Default: Story = {};

/** The selected run is gated — the approve control replaces execute. */
export const AwaitingApproval: Story = {
  args: { selectedRun: STORY_REVIEW_RUN },
};

/** Mid-turn: plan narration streams in and the composer offers cancel. */
export const Streaming: Story = {
  args: { conversation: STREAMING_CONVERSATION },
};

/** A failed turn keeps the history and the composer intact. */
export const TurnFailed: Story = {
  args: { conversation: ERROR_CONVERSATION },
};

/** A fresh project with no run selected and nothing recorded yet. */
export const NoRunSelected: Story = {
  args: { activityCount: 0, selectedRun: null },
};
