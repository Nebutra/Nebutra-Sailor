import { AgentPlan, type AgentTask } from "@nebutra/ui/primitives";

export function AgentPlanDemo() {
  const tasks: AgentTask[] = [
    {
      id: "1",
      title: "Research Phase",
      description: "Gather necessary materials and set goals",
      status: "completed",
      subtasks: [
        {
          id: "1.1",
          title: "Define scope",
          description: "Identify key features and requirements",
          status: "completed",
        },
      ],
    },
    {
      id: "2",
      title: "Implement UI",
      description: "Build the foundational components",
      status: "in-progress",
      dependencies: ["1"],
      subtasks: [
        {
          id: "2.1",
          title: "Design System setup",
          description: "Initialize variables and tokens",
          status: "completed",
          tools: ["css", "tailwind"],
        },
        {
          id: "2.2",
          title: "Build AgentPlan component",
          description: "Structure the tree view with framer-motion",
          status: "in-progress",
          tools: ["react", "framer-motion"],
        },
      ],
    },
    {
      id: "3",
      title: "Testing & QA",
      description: "Ensure no bugs in production",
      status: "pending",
      subtasks: [
        {
          id: "3.1",
          title: "Write unit tests",
          description: "Hit at least 80% coverage",
          status: "pending",
        },
      ],
    },
  ];

  return (
    <div className="max-w-lg py-8 mx-auto h-[400px] w-full">
      <AgentPlan tasks={tasks} defaultExpandedTasks={["2"]} />
    </div>
  );
}
