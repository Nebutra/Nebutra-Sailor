import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Note, type NoteTone } from "./note";

const tones = [
  "default",
  "secondary",
  "success",
  "warning",
  "error",
  "cyan",
] as const satisfies readonly NoteTone[];

const meta: Meta<typeof Note> = {
  title: "Primitives/Note",
  component: Note,
  tags: ["autodocs"],
  args: {
    children: "Changing this region restarts all functions.",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Persistent inline contextual feedback tied to a field, card, or section. Use ProjectBanner for project-wide states and Alert for assertive interruption.",
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Note>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-3 md:flex-row">
      <Note size="small">A small note.</Note>
      <Note>A default note.</Note>
      <Note size="large">A large note.</Note>
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Note action={<Button size="sm">Upgrade</Button>} tone="secondary">
        This workspace is close to its included usage limit.
      </Note>
      <Note action={<Button size="sm">Review Usage</Button>} tone="warning">
        Current log retention will drop from 30 days to 7 days when the trial ends.
      </Note>
    </div>
  ),
};

export const AllTones: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-3">
      {tones.map((tone) => (
        <Note key={tone} tone={tone}>
          This is a {tone} note tied to the current section.
        </Note>
      ))}
      {tones.map((tone) => (
        <Note fill key={`${tone}-fill`} tone={tone}>
          This is a filled {tone} note tied to the current section.
        </Note>
      ))}
    </div>
  ),
};

export const Labels: Story = {
  render: () => (
    <div className="grid max-w-3xl gap-3">
      <Note label="Region Change" tone="warning">
        Changing this region restarts all functions.
      </Note>
      <Note label={false} tone="success">
        Domain ownership was verified.
      </Note>
      <Note type="error">This Geist-compatible type alias resolves to the error tone.</Note>
    </div>
  ),
};

export const EdgeCases: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-3">
      <Note action={<Button size="sm">Open Logs</Button>} tone="error">
        Build log streaming failed for deployment dpl_8gmXTT1yJRP8UbGfXD7A3sp4RKhW because the
        request expired. Review the latest run before retrying.
      </Note>
      <Note action={<Button size="sm">Upgrade</Button>} disabled fill tone="warning">
        Plan limits are unavailable while billing sync is paused.
      </Note>
      <Note tone="cyan">
        Read the <a href="#usage">usage guide</a> before enabling cross-region replication.
      </Note>
    </div>
  ),
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark grid max-w-3xl gap-3 rounded-lg bg-[var(--neutral-1)] p-6">
      {tones.map((tone) => (
        <Note key={tone} tone={tone}>
          This {tone} note remains legible in dark mode.
        </Note>
      ))}
    </div>
  ),
};
