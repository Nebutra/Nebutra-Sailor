"use client";

import { CheckCircle2, Circle, CircleAlert, CircleDotDashed, CircleX } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type React from "react";
import { useMemo, useState } from "react";
import { cn } from "../utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Task status types
 */
export type TaskStatus = "pending" | "in-progress" | "completed" | "need-help" | "failed";

/**
 * Task priority levels
 */
export type TaskPriority = "low" | "medium" | "high";

/**
 * Subtask item
 */
export interface AgentSubtask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  /** Optional array of MCP server tools */
  tools?: string[];
}

/**
 * Task item with subtasks
 */
export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  /** Nesting level (0 = root) */
  level?: number;
  /** IDs of tasks this depends on */
  dependencies?: string[];
  subtasks: AgentSubtask[];
}

/**
 * Props for AgentPlan component
 *
 * @description
 * A hierarchical task planning UI for AI agents with expandable tasks,
 * subtasks, status indicators, and dependency visualization.
 *
 * **UX Scenarios:**
 * - AI agent task execution visualization
 * - Project planning interfaces
 * - Workflow management dashboards
 * - Multi-step process trackers
 * - MCP server tool execution plans
 *
 * **Features:**
 * - Expandable task/subtask hierarchy
 * - Status icons with animations
 * - Dependency badges
 * - Tool/MCP server tags
 * - Reduced motion support
 */
export interface AgentPlanProps {
  /** Array of tasks to display */
  tasks: AgentTask[];
  /** Callback when task status changes */
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  /** Callback when subtask status changes */
  onSubtaskStatusChange?: (taskId: string, subtaskId: string, newStatus: TaskStatus) => void;
  /** Initially expanded task IDs */
  defaultExpandedTasks?: string[];
  /** Whether to allow status toggling */
  allowStatusToggle?: boolean;
  /** Container className */
  className?: string;
  /** Label for tools section */
  toolsLabel?: string;
}

// =============================================================================
// Status Icon Component
// =============================================================================

const StatusIcon: React.FC<{ status: TaskStatus; size?: "sm" | "md" }> = ({
  status,
  size = "md",
}) => {
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";

  switch (status) {
    case "completed":
      return <CheckCircle2 className={cn(sizeClass, "text-green-500")} />;
    case "in-progress":
      return <CircleDotDashed className={cn(sizeClass, "text-blue-500")} />;
    case "need-help":
      return <CircleAlert className={cn(sizeClass, "text-yellow-500")} />;
    case "failed":
      return <CircleX className={cn(sizeClass, "text-red-500")} />;
    default:
      return <Circle className={cn(sizeClass, "text-muted-foreground")} />;
  }
};

// =============================================================================
// Status Badge Component
// =============================================================================

const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const colorClasses = {
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "need-help": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    pending: "bg-muted text-muted-foreground",
  };

  return (
    <motion.span
      className={cn("rounded px-1.5 py-0.5 text-xs", colorClasses[status])}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      key={status}
    >
      {status}
    </motion.span>
  );
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * AgentPlan - Hierarchical task planning UI
 *
 * @example
 * ```tsx
 * const tasks = [
 *   {
 *     id: "1",
 *     title: "Research Requirements",
 *     description: "Gather project requirements",
 *     status: "in-progress",
 *     subtasks: [
 *       { id: "1.1", title: "Interview stakeholders", status: "completed", tools: ["meeting-scheduler"] },
 *       { id: "1.2", title: "Review docs", status: "in-progress", tools: ["file-system"] },
 *     ],
 *   },
 * ];
 *
 * <AgentPlan
 *   tasks={tasks}
 *   onTaskStatusChange={(id, status) => console.log(id, status)}
 *   defaultExpandedTasks={["1"]}
 * />
 * ```
 */
export const AgentPlan: React.FC<AgentPlanProps> = ({
  tasks: initialTasks,
  onTaskStatusChange,
  onSubtaskStatusChange,
  defaultExpandedTasks = [],
  allowStatusToggle = true,
  className,
  toolsLabel = "MCP Servers:",
}) => {
  const [tasks, setTasks] = useState<AgentTask[]>(initialTasks);
  const [expandedTasks, setExpandedTasks] = useState<string[]>(defaultExpandedTasks);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});

  // Reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Toggle task expansion
  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  // Toggle subtask expansion
  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Cycle task status
  const cycleTaskStatus = (taskId: string) => {
    if (!allowStatusToggle) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const statuses: TaskStatus[] = [
            "pending",
            "in-progress",
            "completed",
            "need-help",
            "failed",
          ];
          const currentIndex = statuses.indexOf(task.status);
          const nextIndex = (currentIndex + 1) % statuses.length;
          const newStatus = statuses[nextIndex] ?? "pending";

          onTaskStatusChange?.(taskId, newStatus);

          return {
            ...task,
            status: newStatus,
            subtasks:
              newStatus === "completed"
                ? task.subtasks.map((s) => ({
                    ...s,
                    status: "completed" as TaskStatus,
                  }))
                : task.subtasks,
          };
        }
        return task;
      }),
    );
  };

  // Toggle subtask status
  const toggleSubtaskStatus = (taskId: string, subtaskId: string) => {
    if (!allowStatusToggle) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === taskId) {
          const updatedSubtasks = task.subtasks.map((subtask) => {
            if (subtask.id === subtaskId) {
              const newStatus: TaskStatus =
                subtask.status === "completed" ? "pending" : "completed";
              onSubtaskStatusChange?.(taskId, subtaskId, newStatus);
              return { ...subtask, status: newStatus };
            }
            return subtask;
          });

          const allCompleted = updatedSubtasks.every((s) => s.status === "completed");

          return {
            ...task,
            subtasks: updatedSubtasks,
            status: allCompleted ? "completed" : task.status,
          };
        }
        return task;
      }),
    );
  };

  // Animation variants
  const taskVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { type: "tween" as const }
        : { type: "spring" as const, stiffness: 500, damping: 30 },
    },
  };

  const subtaskListVariants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" as const },
    visible: {
      height: "auto",
      opacity: 1,
      overflow: "visible" as const,
      transition: {
        duration: 0.25,
        staggerChildren: prefersReducedMotion ? 0 : 0.05,
        ease: [0.2, 0.65, 0.3, 0.9] as const,
      },
    },
  };

  const subtaskVariants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: prefersReducedMotion
        ? { type: "tween" as const }
        : { type: "spring" as const, stiffness: 500, damping: 25 },
    },
  };

  return (
    <div className={cn("h-full overflow-auto bg-background p-2 text-foreground", className)}>
      <motion.div
        className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
      >
        <LayoutGroup>
          <div className="overflow-hidden p-4">
            <ul className="space-y-1 overflow-hidden">
              {tasks.map((task, index) => {
                const isExpanded = expandedTasks.includes(task.id);
                const isCompleted = task.status === "completed";

                return (
                  <motion.li
                    key={task.id}
                    className={index !== 0 ? "mt-1 pt-2" : ""}
                    variants={taskVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* Task row */}
                    <motion.div
                      className="group flex items-center rounded-[var(--radius-md)] px-3 py-1.5"
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                    >
                      <motion.div
                        className="mr-2 flex-shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          cycleTaskStatus(task.id);
                        }}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={task.status}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                          >
                            <StatusIcon status={task.status} />
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>

                      <motion.div
                        className="flex min-w-0 flex-grow cursor-pointer items-center justify-between"
                        onClick={() => toggleTaskExpansion(task.id)}
                      >
                        <span
                          className={cn(
                            "mr-2 flex-1 truncate",
                            isCompleted && "text-muted-foreground line-through",
                          )}
                        >
                          {task.title}
                        </span>

                        <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                          {task.dependencies && task.dependencies.length > 0 && (
                            <div className="mr-2 flex gap-1">
                              {task.dependencies.map((dep, idx) => (
                                <span
                                  key={idx}
                                  className="rounded bg-secondary/40 px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                          <StatusBadge status={task.status} />
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Subtasks */}
                    <AnimatePresence mode="wait">
                      {isExpanded && task.subtasks.length > 0 && (
                        <motion.div
                          className="relative overflow-hidden"
                          variants={subtaskListVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
                          <div className="absolute bottom-0 left-[20px] top-0 border-l-2 border-dashed border-muted-foreground/30" />
                          <ul className="mb-1.5 ml-3 mr-2 mt-1 space-y-0.5">
                            {task.subtasks.map((subtask) => {
                              const subtaskKey = `${task.id}-${subtask.id}`;
                              const isSubtaskExpanded = expandedSubtasks[subtaskKey];

                              return (
                                <motion.li
                                  key={subtask.id}
                                  className="group flex flex-col py-0.5 pl-6"
                                  variants={subtaskVariants}
                                  onClick={() => toggleSubtaskExpansion(task.id, subtask.id)}
                                >
                                  <motion.div
                                    className="flex flex-1 items-center rounded-[var(--radius-md)] p-1"
                                    whileHover={{
                                      backgroundColor: "rgba(0,0,0,0.03)",
                                    }}
                                  >
                                    <motion.div
                                      className="mr-2 flex-shrink-0 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSubtaskStatus(task.id, subtask.id);
                                      }}
                                      whileTap={{ scale: 0.9 }}
                                      whileHover={{ scale: 1.1 }}
                                    >
                                      <AnimatePresence mode="wait">
                                        <motion.div
                                          key={subtask.status}
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.8 }}
                                        >
                                          <StatusIcon status={subtask.status} size="sm" />
                                        </motion.div>
                                      </AnimatePresence>
                                    </motion.div>

                                    <span
                                      className={cn(
                                        "cursor-pointer text-sm",
                                        subtask.status === "completed" &&
                                          "text-muted-foreground line-through",
                                      )}
                                    >
                                      {subtask.title}
                                    </span>
                                  </motion.div>

                                  <AnimatePresence mode="wait">
                                    {isSubtaskExpanded && (
                                      <motion.div
                                        className="ml-1.5 mt-1 overflow-hidden border-l border-dashed border-foreground/20 pl-5 text-xs text-muted-foreground"
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                      >
                                        <p className="py-1">{subtask.description}</p>
                                        {subtask.tools && subtask.tools.length > 0 && (
                                          <div className="mb-1 mt-0.5 flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-muted-foreground">
                                              {toolsLabel}
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                              {subtask.tools.map((tool, idx) => (
                                                <motion.span
                                                  key={idx}
                                                  className="rounded bg-secondary/40 px-1.5 py-0.5 text-xs font-medium text-secondary-foreground shadow-sm"
                                                  initial={{
                                                    opacity: 0,
                                                    y: -5,
                                                  }}
                                                  animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                    transition: {
                                                      delay: idx * 0.05,
                                                    },
                                                  }}
                                                  whileHover={{ y: -1 }}
                                                >
                                                  {tool}
                                                </motion.span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
};

export default AgentPlan;
