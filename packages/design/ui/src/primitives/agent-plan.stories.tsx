import type { Meta, StoryObj } from "@storybook/react";
import type { AgentTask } from "./agent-plan";
import { AgentPlan } from "./agent-plan";

const meta = {
  title: "Primitives/AgentPlan",
  component: AgentPlan,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Hierarchical task planning UI for AI agents. Features expandable tasks with subtasks, animated status icons (pending/in-progress/completed/need-help/failed), dependency badges, and MCP server tool tags.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    allowStatusToggle: { control: "boolean" },
    toolsLabel: { control: "text" },
  },
} satisfies Meta<typeof AgentPlan>;

export default meta;
type Story = StoryObj<typeof meta>;

const simpleTasks: AgentTask[] = [
  {
    id: "1",
    title: "Research Requirements",
    description: "Gather and analyze project requirements from stakeholders",
    status: "completed",
    subtasks: [
      {
        id: "1.1",
        title: "Interview stakeholders",
        description: "Schedule and conduct 30-minute discovery calls",
        status: "completed",
        tools: ["meeting-scheduler", "notes"],
      },
      {
        id: "1.2",
        title: "Review existing documentation",
        description: "Read through all design specs and previous reports",
        status: "completed",
        tools: ["file-system", "browser"],
      },
    ],
  },
  {
    id: "2",
    title: "Design Architecture",
    description: "Plan the technical architecture and API contracts",
    status: "in-progress",
    dependencies: ["1"],
    subtasks: [
      {
        id: "2.1",
        title: "Define API contracts",
        description: "Draft OpenAPI 3.0 specification for all endpoints",
        status: "completed",
        tools: ["openapi", "editor"],
      },
      {
        id: "2.2",
        title: "Design database schema",
        description: "Create entity-relationship diagram and migration plan",
        status: "in-progress",
        tools: ["postgres", "dbml"],
      },
    ],
  },
  {
    id: "3",
    title: "Implement Backend",
    description: "Build API endpoints following the agreed contracts",
    status: "pending",
    dependencies: ["2"],
    subtasks: [
      {
        id: "3.1",
        title: "Set up project scaffold",
        description: "Initialize repo, CI/CD, and dev environment",
        status: "pending",
        tools: ["github", "docker"],
      },
      {
        id: "3.2",
        title: "Implement authentication",
        description: "JWT-based auth with refresh token rotation",
        status: "pending",
        tools: ["node", "jwt"],
      },
    ],
  },
];

export const Default: Story = {
  render: () => (
    <div className="w-[480px]">
      <AgentPlan tasks={simpleTasks} defaultExpandedTasks={["1", "2"]} />
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <div className="w-[480px]">
      <p className="text-xs text-muted-foreground mb-3 px-2">
        Click the status icon to cycle statuses. Click a task row to expand subtasks. Click a
        subtask to expand its description.
      </p>
      <AgentPlan tasks={simpleTasks} defaultExpandedTasks={["2"]} allowStatusToggle />
    </div>
  ),
};

export const ReadOnly: Story = {
  render: () => (
    <div className="w-[480px]">
      <AgentPlan
        tasks={simpleTasks}
        defaultExpandedTasks={simpleTasks.map((t) => t.id)}
        allowStatusToggle={false}
      />
    </div>
  ),
};

const mixedStatusTasks: AgentTask[] = [
  {
    id: "a",
    title: "Data Collection",
    description: "Gather training data from multiple sources",
    status: "completed",
    subtasks: [
      {
        id: "a.1",
        title: "Scrape public datasets",
        description: "Use web scraper agent",
        status: "completed",
        tools: ["playwright", "storage"],
      },
    ],
  },
  {
    id: "b",
    title: "Model Training",
    description: "Fine-tune the base model on collected data",
    status: "in-progress",
    dependencies: ["a"],
    subtasks: [
      {
        id: "b.1",
        title: "Data preprocessing",
        description: "Clean and tokenize dataset",
        status: "completed",
        tools: ["python", "pandas"],
      },
      {
        id: "b.2",
        title: "Training loop",
        description: "Execute fine-tuning with LoRA",
        status: "in-progress",
        tools: ["torch", "cuda"],
      },
    ],
  },
  {
    id: "c",
    title: "Evaluation",
    description: "Benchmark model performance on test set",
    status: "need-help",
    dependencies: ["b"],
    subtasks: [
      {
        id: "c.1",
        title: "Run benchmarks",
        description: "MMLU, HumanEval, GSM8K",
        status: "need-help",
        tools: ["eval-harness"],
      },
    ],
  },
  {
    id: "d",
    title: "Deployment",
    description: "Deploy model to production serving infrastructure",
    status: "failed",
    dependencies: ["c"],
    subtasks: [
      {
        id: "d.1",
        title: "Container build",
        description: "Build Docker image with model weights",
        status: "failed",
        tools: ["docker", "ecr"],
      },
    ],
  },
];

export const AllStatuses: Story = {
  render: () => (
    <div className="w-[480px]">
      <AgentPlan tasks={mixedStatusTasks} defaultExpandedTasks={["b", "c", "d"]} />
    </div>
  ),
};

export const CustomToolsLabel: Story = {
  render: () => (
    <div className="w-[480px]">
      <AgentPlan tasks={simpleTasks} defaultExpandedTasks={["1"]} toolsLabel="Tools used:" />
    </div>
  ),
};
