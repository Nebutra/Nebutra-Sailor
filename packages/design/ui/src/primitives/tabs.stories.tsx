import { GridSquare, ListUnordered, LogoGithub, LogoGitlab } from "@nebutra/icons";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Same-scope tab panels with Base UI roving focus, manual activation, component tokens, and a Geist-compatible tabs array API.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const repositoryTabs = [
  { title: "Apple", value: "apple" },
  { title: "Orange", value: "orange" },
  { title: "Mango", value: "mango" },
] as const;

function ControlledTabsDemo({ disabled = false }: { disabled?: boolean }) {
  const [selected, setSelected] = React.useState("apple");

  return (
    <Tabs
      aria-label="Fruit views"
      disabled={disabled}
      selected={selected}
      setSelected={setSelected}
      tabs={repositoryTabs}
      className="w-[min(24rem,calc(100vw-2rem))]"
    />
  );
}

export const Default: Story = {
  render: () => <ControlledTabsDemo />,
};

export const Disabled: Story = {
  render: () => <ControlledTabsDemo disabled />,
};

export const DisabledSpecificTab: Story = {
  render: () => {
    const [selected, setSelected] = React.useState("apple");

    return (
      <Tabs
        aria-label="Fruit views"
        selected={selected}
        setSelected={setSelected}
        tabs={[
          { title: "Apple", value: "apple" },
          { title: "Orange", value: "orange" },
          {
            title: "Mango",
            value: "mango",
            disabled: true,
            tooltip: "Mango views require owner access.",
          },
        ]}
        className="w-[min(24rem,calc(100vw-2rem))]"
      />
    );
  },
};

export const WithIcons: Story = {
  render: () => {
    const [selected, setSelected] = React.useState("github");

    return (
      <Tabs
        aria-label="Git provider"
        selected={selected}
        setSelected={setSelected}
        tabs={[
          { title: "GitHub", value: "github", icon: <LogoGithub aria-hidden /> },
          { title: "GitLab", value: "gitlab", icon: <LogoGitlab aria-hidden /> },
          { title: "List View", value: "list", icon: <ListUnordered aria-hidden /> },
        ]}
        className="w-[min(28rem,calc(100vw-2rem))]"
      />
    );
  },
};

export const Secondary: Story = {
  render: () => {
    const [selected, setSelected] = React.useState("github");

    return (
      <Tabs
        aria-label="Repository provider"
        selected={selected}
        setSelected={setSelected}
        tabs={[
          { title: "GitHub", value: "github" },
          { title: "GitLab", value: "gitlab" },
          {
            title: "Bitbucket",
            value: "bitbucket",
            disabled: true,
            tooltip: "Bitbucket sync is not enabled for this workspace.",
          },
        ]}
        variant="secondary"
        className="w-[min(28rem,calc(100vw-2rem))]"
      />
    );
  },
};

export const CompoundPanels: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[min(30rem,calc(100vw-2rem))]">
      <TabsList aria-label="Project sections" variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs" badge="12">
          Logs
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Deployment health and current project ownership.</TabsContent>
      <TabsContent value="logs">Recent events, build traces, and audit entries.</TabsContent>
      <TabsContent value="settings">Project-level controls for owners and maintainers.</TabsContent>
    </Tabs>
  ),
};

export const ButtonVariant: Story = {
  render: () => (
    <Tabs defaultValue="grid" className="w-[min(24rem,calc(100vw-2rem))]">
      <TabsList aria-label="View mode" variant="button" className="grid grid-cols-2">
        <TabsTrigger value="grid" icon={<GridSquare aria-hidden />}>
          Grid
        </TabsTrigger>
        <TabsTrigger value="list" icon={<ListUnordered aria-hidden />}>
          List
        </TabsTrigger>
      </TabsList>
    </Tabs>
  ),
};

export const LongTextOverflow: Story = {
  render: () => {
    const [selected, setSelected] = React.useState("production");

    return (
      <Tabs
        aria-label="Environment sections"
        selected={selected}
        setSelected={setSelected}
        tabs={[
          { title: "Production Deployment", value: "production" },
          { title: "Preview Branches", value: "preview" },
          { title: "Audit Log", value: "audit" },
          { title: "Settings", value: "settings" },
        ]}
        className="w-[18rem]"
      />
    );
  },
};

export const DarkMode: Story = {
  parameters: {
    backgrounds: { default: "dark" },
  },
  render: () => (
    <div className="dark rounded-lg bg-background p-4">
      <Tabs defaultValue="source" className="w-[min(24rem,calc(100vw-2rem))]">
        <TabsList aria-label="Code preview" shape="pill">
          <TabsTrigger value="source">Source</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  ),
};

export const TooltipComposition: Story = {
  render: () => (
    <TooltipProvider delayDuration={150}>
      <Tabs defaultValue="source" className="w-[min(24rem,calc(100vw-2rem))]">
        <TabsList aria-label="Code preview">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <TabsTrigger value="source">Source</TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent>View Source</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <TabsTrigger value="output">Output</TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent>View Output</TooltipContent>
          </Tooltip>
        </TabsList>
      </Tabs>
    </TooltipProvider>
  ),
};
