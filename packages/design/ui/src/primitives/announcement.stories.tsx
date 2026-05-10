import type { Meta, StoryObj } from "@storybook/react";
import { ArrowUpRight } from "lucide-react";
import { Announcement, AnnouncementTag, AnnouncementTitle } from "./announcement";

const meta = {
  title: "Primitives/Announcement",
  component: Announcement,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Pill-shaped announcement badge compound component. Composed of Announcement (container), AnnouncementTag (left label), and AnnouncementTitle (main text). Built on Badge.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    themed: { control: "boolean" },
  },
} satisfies Meta<typeof Announcement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Announcement>
      <AnnouncementTag>New</AnnouncementTag>
      <AnnouncementTitle>
        Introducing AI-powered workflows
        <ArrowUpRight size={14} />
      </AnnouncementTitle>
    </Announcement>
  ),
};

export const WithArrowLink: Story = {
  render: () => (
    <a href="/" className="inline-block cursor-pointer">
      <Announcement>
        <AnnouncementTag>v2.0</AnnouncementTag>
        <AnnouncementTitle>
          Read the release notes
          <ArrowUpRight size={14} />
        </AnnouncementTitle>
      </Announcement>
    </a>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <Announcement>
      <AnnouncementTitle>
        Free for open-source — get started today
        <ArrowUpRight size={14} />
      </AnnouncementTitle>
    </Announcement>
  ),
};

export const Success: Story = {
  render: () => (
    <Announcement
      themed
      className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    >
      <AnnouncementTag>Success</AnnouncementTag>
      <AnnouncementTitle>Deployment completed successfully</AnnouncementTitle>
    </Announcement>
  ),
};

export const Error: Story = {
  render: () => (
    <Announcement
      themed
      className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    >
      <AnnouncementTag>Error</AnnouncementTag>
      <AnnouncementTitle>Build failed — check logs</AnnouncementTitle>
    </Announcement>
  ),
};

export const Warning: Story = {
  render: () => (
    <Announcement
      themed
      className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    >
      <AnnouncementTag>Warning</AnnouncementTag>
      <AnnouncementTitle>Deprecated API detected in dependencies</AnnouncementTitle>
    </Announcement>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Announcement>
        <AnnouncementTag>Beta</AnnouncementTag>
        <AnnouncementTitle>
          Multi-agent workflows now available
          <ArrowUpRight size={14} />
        </AnnouncementTitle>
      </Announcement>
      <Announcement themed className="bg-green-100 text-green-700">
        <AnnouncementTag>Done</AnnouncementTag>
        <AnnouncementTitle>All systems operational</AnnouncementTitle>
      </Announcement>
      <Announcement themed className="bg-amber-100 text-amber-700">
        <AnnouncementTag>Notice</AnnouncementTag>
        <AnnouncementTitle>Scheduled maintenance on Sunday</AnnouncementTitle>
      </Announcement>
      <Announcement themed className="bg-rose-100 text-rose-700">
        <AnnouncementTag>Outage</AnnouncementTag>
        <AnnouncementTitle>API degraded — investigating</AnnouncementTitle>
      </Announcement>
    </div>
  ),
};
