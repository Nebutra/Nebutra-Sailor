"use client";

import { External, Trash } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { Menu, MenuButton, MenuContainer, MenuItem, MenuItemLocked, MenuSection } from "./menu";

const meta = {
  title: "Primitives/Menu",
  component: Menu,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Geist-style flat menu facade over DropdownMenu for resource actions, gated rows, and sectioned menus.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <MenuContainer position="bottom-start">
      <MenuButton type="secondary" showChevron>
        Project actions
      </MenuButton>
      <Menu width={220}>
        <MenuSection title="Project" showDivider={false}>
          <MenuItem suffix={<External />}>Open dashboard</MenuItem>
          <MenuItem>Rename project</MenuItem>
        </MenuSection>
        <MenuSection title="Admin" showDivider>
          <MenuItemLocked>Rotate secrets</MenuItemLocked>
          <MenuItem type="error" prefix={<Trash />}>
            Delete project
          </MenuItem>
        </MenuSection>
      </Menu>
    </MenuContainer>
  ),
};
