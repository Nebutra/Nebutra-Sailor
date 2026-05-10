import type { Meta, StoryObj } from "@storybook/react";
import {
  BarChart,
  Bell,
  Bookmark,
  Home,
  MessageCircle,
  Search,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";
import { ExpandableTabs } from "./expandable-tabs";

const meta = {
  title: "Primitives/ExpandableTabs",
  component: ExpandableTabs,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Animated tab bar where selected tabs expand to reveal their label. Clicking outside deselects the active tab. Supports optional separators.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    activeColor: { control: "text" },
  },
} satisfies Meta<typeof ExpandableTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tabs: [
      { title: "Home", icon: Home },
      { title: "Search", icon: Search },
      { title: "Notifications", icon: Bell },
      { title: "Profile", icon: User },
    ],
  },
};

export const WithSeparators: Story = {
  args: {
    tabs: [
      { title: "Home", icon: Home },
      { title: "Analytics", icon: BarChart },
      { type: "separator" },
      { title: "Messages", icon: MessageCircle },
      { title: "Bookmarks", icon: Bookmark },
      { type: "separator" },
      { title: "Settings", icon: Settings },
    ],
  },
};

export const CustomActiveColor: Story = {
  args: {
    tabs: [
      { title: "Home", icon: Home },
      { title: "Analytics", icon: BarChart },
      { title: "Notifications", icon: Bell },
      { title: "Settings", icon: Settings },
    ],
    activeColor: "text-blue-500",
  },
};

export const Controlled: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState<number | null>(null);
    const tabs = [
      { title: "Home", icon: Home },
      { title: "Search", icon: Search },
      { title: "Notifications", icon: Bell },
      { title: "Profile", icon: User },
      { title: "Settings", icon: Settings },
    ];
    const activeTitle = activeTab !== null ? tabs[activeTab]?.title : "None";

    return (
      <div className="flex flex-col items-center gap-6">
        <ExpandableTabs tabs={tabs} onChange={setActiveTab} />
        <p className="text-sm text-muted-foreground">
          Active tab: <strong>{activeTitle}</strong>
        </p>
      </div>
    );
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: [
      { title: "Home", icon: Home },
      { title: "Search", icon: Search },
      { type: "separator" },
      { title: "Messages", icon: MessageCircle },
      { title: "Bookmarks", icon: Bookmark },
      { title: "Notifications", icon: Bell },
      { type: "separator" },
      { title: "Profile", icon: User },
      { title: "Settings", icon: Settings },
    ],
  },
};
