/**
 * Stories for the Code and Preview surfaces, including their empty states and
 * the long-file-list overflow behaviour.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { StartupWorkspaceFilesPanel } from "../../../../web/src/components/startup-os/startup-workspace-files-panel";
import { STORY_FILES, STORY_SELECTED_FILE } from "./_fixtures";

const meta: Meta<typeof StartupWorkspaceFilesPanel> = {
  title: "Startup OS/Workspace Files Panel",
  component: StartupWorkspaceFilesPanel,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Code = a recessed file rail plus the read-only source view; Preview = the generated app in a sandboxed iframe. The open-file tabs and the file rail scroll inside themselves, so a long scaffold never widens the workspace.",
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
    files: STORY_FILES,
    isSavingFile: false,
    onSaveFile: async () => undefined,
    onSelectFile: () => undefined,
    previewHtml: "",
    selectedFile: STORY_SELECTED_FILE,
    view: "code",
  },
};
export default meta;

type Story = StoryObj<typeof StartupWorkspaceFilesPanel>;

/** Code view with a real generated file open. */
export const Code: Story = {};

/** Preview view rendering the generated app. */
export const Preview: Story = {
  args: { view: "preview" },
};

/** No file chosen yet — an honest empty state, not a blank pane. */
export const NoFileSelected: Story = {
  args: { selectedFile: null },
};

/** A project that has not generated anything yet. */
export const NoFilesAtAll: Story = {
  args: { files: [], selectedFile: null, view: "preview" },
};
