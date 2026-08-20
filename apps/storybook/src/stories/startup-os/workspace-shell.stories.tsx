/**
 * Stories for the whole workspace shell — the acceptance view for the layout:
 * thread column, surface card, and the tabs that switch between them.
 *
 * The shell reads the dashboard sidebar context, so the stories wrap it in the
 * real `SidebarProvider`.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { SidebarProvider } from "../../../../web/src/components/navigation/sidebar-context";
import { StartupWorkspaceShell } from "../../../../web/src/components/startup-os/startup-workspace-shell";
import {
  IDLE_CONVERSATION,
  STORY_ARTIFACT,
  STORY_FILES,
  STORY_PROJECT,
  STORY_PROJECTS,
  STORY_RUN,
  STORY_SELECTED_FILE,
  STREAMING_CONVERSATION,
} from "./_fixtures";

const meta: Meta<typeof StartupWorkspaceShell> = {
  title: "Startup OS/Workspace Shell",
  component: StartupWorkspaceShell,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The fixed full-height frame. Nothing outside the inner panels scrolls; the thread column and the surface card are separated by a gap plus a one-step tonal shift rather than a rule.",
      },
    },
  },
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Story />
      </SidebarProvider>
    ),
  ],
  args: {
    activityCount: 4,
    canvasLayout: null,
    conversation: IDLE_CONVERSATION,
    files: STORY_FILES,
    isApproving: false,
    isExecuting: false,
    isSavingFile: false,
    onApprove: () => undefined,
    onChatApplied: () => undefined,
    onExecuteRun: () => undefined,
    onPersistLayout: async () => undefined,
    onSaveFile: async () => undefined,
    onSelectArtifact: () => undefined,
    onSelectFile: () => undefined,
    onSelectProject: () => undefined,
    onSelectRun: () => undefined,
    previewHtml: "",
    project: STORY_PROJECT,
    projects: STORY_PROJECTS,
    selectedArtifact: STORY_ARTIFACT,
    selectedFile: STORY_SELECTED_FILE,
    selectedRun: STORY_RUN,
  },
};
export default meta;

type Story = StoryObj<typeof StartupWorkspaceShell>;

/** The default landing state: thread on the left, live preview on the right. */
export const Default: Story = {};

/** A turn in flight — the thread streams while the surface stays usable. */
export const Streaming: Story = {
  args: { conversation: STREAMING_CONVERSATION },
};

/** A project with no generated files yet: honest empty states on both surfaces. */
export const NoFilesYet: Story = {
  args: { activityCount: 0, files: [], selectedFile: null },
};
