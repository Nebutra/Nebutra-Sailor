import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Tabbed navigation surface with default, button, and line variants.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[28rem]">
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="text-sm text-muted-foreground">
          Overview metrics for the selected tenant.
        </TabsContent>
        <TabsContent value="usage" className="text-sm text-muted-foreground">
          Daily usage and quota trends.
        </TabsContent>
        <TabsContent value="logs" className="text-sm text-muted-foreground">
          Recent system events.
        </TabsContent>
      </Tabs>
    </div>
  ),
};
