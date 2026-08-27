import { Copy, GitBranch, Sparkles } from "@nebutra/icons";
import {
  SplitButton,
  SplitButtonMenuItem,
  type SplitButtonSize,
  type SplitButtonType,
} from "@nebutra/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof SplitButton> = {
  title: "Primitives/SplitButton",
  component: SplitButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Couples one clear primary action with a menu of nearby variants. Use it only when the visible action is also mirrored as the first menu item.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SplitButton>;

const sizes = ["small", "medium", "large"] as const satisfies SplitButtonSize[];
const types = ["default", "secondary"] as const satisfies SplitButtonType[];

function SaveMenuItems() {
  return (
    <>
      <SplitButtonMenuItem
        description="Save changes."
        menuItemProps={{ onClick: () => undefined }}
        title="Save"
      />
      <SplitButtonMenuItem
        description="Save changes and start a production deployment."
        menuItemProps={{ onClick: () => undefined }}
        title="Save and Deploy"
      />
    </>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-8">
      {types.map((type) => (
        <div key={type} className="flex flex-row flex-wrap items-start gap-4">
          {sizes.map((size) => (
            <SplitButton
              buttonProps={{
                onClick: () => undefined,
                size,
                type,
              }}
              key={`${type}-${size}`}
              menuButtonLabel="More save options"
              menuItems={<SaveMenuItems />}
            >
              Save
            </SplitButton>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const MenuAlignment: Story = {
  render: () => (
    <div className="flex flex-row flex-wrap items-start gap-8">
      <SplitButton
        buttonProps={{ onClick: () => undefined, type: "secondary" }}
        menuButtonLabel="More deploy options"
        menuItems={<SaveMenuItems />}
      >
        Deploy
      </SplitButton>
      <SplitButton
        buttonProps={{ onClick: () => undefined, type: "secondary" }}
        menuAlignment="bottom-end"
        menuButtonLabel="More deploy options"
        menuItems={<SaveMenuItems />}
      >
        Deploy
      </SplitButton>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <SplitButton
      buttonProps={{ onClick: () => undefined, size: "small", type: "secondary" }}
      menuButtonLabel="More copy options"
      menuItems={
        <>
          <SplitButtonMenuItem
            description="Copy the current page URL."
            icon={<Copy />}
            menuItemProps={{ onClick: () => undefined }}
            title="Copy Page"
          />
          <SplitButtonMenuItem
            description="Open this page in the v0 generation workspace."
            icon={<Sparkles />}
            menuItemProps={{ onClick: () => undefined }}
            title="Open in v0"
          />
          <SplitButtonMenuItem
            description="Open the source branch for this page."
            icon={<GitBranch />}
            menuItemProps={{ onClick: () => undefined }}
            title="Open Branch"
          />
        </>
      }
      menuProps={{ width: 240 }}
    >
      Copy Page
    </SplitButton>
  ),
};

export const EdgeCases: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <SplitButton
        buttonProps={{ disabled: true, onClick: () => undefined, type: "secondary" }}
        menuButtonLabel="More disabled options"
        menuItems={<SaveMenuItems />}
      >
        Disabled
      </SplitButton>
      <SplitButton
        buttonProps={{ loading: true, onClick: () => undefined }}
        menuButtonLabel="More loading options"
        menuItems={<SaveMenuItems />}
      >
        Saving
      </SplitButton>
      <SplitButton
        buttonProps={{ onClick: () => undefined, type: "secondary" }}
        menuButtonLabel="More branch deployment options"
        menuItems={
          <>
            <SplitButtonMenuItem
              description="Deploy feature/redesign-dashboard-navigation-with-sidebar-improvements to preview."
              menuItemProps={{ onClick: () => undefined }}
              title="Deploy Preview"
            />
            <SplitButtonMenuItem
              description="Create a production deployment from the same commit after checks pass."
              menuItemProps={{ onClick: () => undefined }}
              title="Deploy Production"
            />
          </>
        }
        menuProps={{ width: 320 }}
      >
        Deploy Preview
      </SplitButton>
    </div>
  ),
};
