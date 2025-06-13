#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initializeDatabase, priorityEnum, todoDb } from "./db/index.js";

// Utility function to format relative timestamps
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
}

async function startMcpServer() {
  // Initialize database
  await initializeDatabase();

  // Create MCP server
  const server = new McpServer({
    name: "todo-mcp",
    version: "0.1.1",
  });

  // Tool: Get all lists
  server.tool(
    "getLists",
    "Retrieve all todo lists with their details. Use this as a starting point to see what lists exist before working with tasks. Returns list names, IDs, descriptions, and creation timestamps.",
    {},
    async () => {
      const lists = await todoDb.getAllLists();

      // Add task counts to each list
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          const taskCounts = await todoDb.getTaskCountsByList(list.id);
          return {
            ...list,
            taskCounts,
            createdAtRelative: formatRelativeTime(new Date(list.createdAt)),
          };
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(listsWithCounts, null, 2),
          },
        ],
        metadata: getMetadata(),
      };
    }
  );

  // Tool: Create a new list
  server.tool(
    "createList",
    "Create a new todo list to organize tasks. Lists group related tasks together (e.g., 'Work Projects', 'Personal', 'Bug Fixes'). Use descriptive names that indicate the list's purpose.",
    {
      name: z
        .string()
        .min(1, "List name is required")
        .max(255, "List name too long")
        .describe(
          "A descriptive name for the list (e.g., 'Work Projects', 'Personal Tasks', 'Bug Fixes')"
        ),
      description: z
        .string()
        .max(500, "Description too long")
        .optional()
        .describe("Optional detailed description explaining the purpose or scope of this list"),
    },
    async ({ name, description }) => {
      const list = await todoDb.createList({ name, description });
      return {
        content: [
          {
            type: "text",
            text: `✅ Created list: ${list.name} (ID: ${list.id})`,
          },
        ],
      };
    }
  );

  // Tool: Get tasks by list name
  server.tool(
    "getTasks",
    "Retrieve tasks from a specific list. Returns tasks sorted by priority (urgent → high → medium → low) then by creation date. Use this to see what tasks exist before completing or archiving them. Task IDs in the response can be used with completeTask and archiveTask.",
    {
      list: z
        .string()
        .min(1, "List name is required")
        .describe(
          "Name of the list to get tasks from (case-insensitive). Use getLists first to see available lists."
        ),
      includeCompleted: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Whether to include completed and archived tasks in the results. Default is false (only active tasks)."
        ),
    },
    async ({ list, includeCompleted }) => {
      // Find list by name
      const lists = await todoDb.getAllLists();
      const targetList = lists.find((l) => l.name.toLowerCase() === list.toLowerCase());

      if (!targetList) {
        throw new Error(
          `List "${list}" not found. Available lists: ${lists.map((l) => l.name).join(", ")}`
        );
      }

      const allTasks = await todoDb.getTasksByList(targetList.id);
      const tasks = includeCompleted
        ? allTasks
        : allTasks.filter((t) => !t.completedAt && !t.archivedAt);

      // Sort by priority (urgent -> high -> medium -> low) and then by creation date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      tasks.sort((a, b) => {
        const priorityDiff =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Add relative timestamps to tasks
      const tasksWithRelativeTime = tasks.map((task) => ({
        ...task,
        createdAtRelative: formatRelativeTime(new Date(task.createdAt)),
        completedAtRelative: task.completedAt
          ? formatRelativeTime(new Date(task.completedAt))
          : null,
        archivedAtRelative: task.archivedAt ? formatRelativeTime(new Date(task.archivedAt)) : null,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ list: targetList.name, tasks: tasksWithRelativeTime }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: Create a new task
  server.tool(
    "createTask",
    "Create a new task in a specific list. Tasks should be specific, actionable items. The task will be assigned an ID that can be used later to complete or archive it. Use descriptive names that clearly indicate what needs to be done.",
    {
      list: z
        .string()
        .min(1, "List name is required")
        .describe(
          "Name of the list to add the task to (case-insensitive). The list must already exist."
        ),
      name: z
        .string()
        .min(5, "Task name too short - be specific about what needs to be done")
        .max(120, "Task name too long - consider breaking this into smaller, actionable tasks")
        .describe("Clear, specific task name describing what needs to be done (5-120 characters)"),
      description: z
        .string()
        .max(
          500,
          "Description too long - focus on the core requirement. Large tasks should be split into multiple smaller ones"
        )
        .optional()
        .describe("Optional detailed description with additional context, requirements, or notes"),
      priority: priorityEnum
        .default("medium")
        .describe(
          "Task priority level: 'low' (🟢), 'medium' (🟡), 'high' (🔴), or 'urgent' (🔥). Defaults to 'medium'. Use 'urgent' for critical issues, 'high' for important deadlines, 'medium' for regular work, 'low' for nice-to-have items."
        ),
    },
    async ({ list, name, description, priority }) => {
      // Find list by name
      const lists = await todoDb.getAllLists();
      const targetList = lists.find((l) => l.name.toLowerCase() === list.toLowerCase());

      if (!targetList) {
        throw new Error(
          `List "${list}" not found. Available lists: ${lists.map((l) => l.name).join(", ")}`
        );
      }

      const task = await todoDb.createTask({
        name,
        description,
        priority,
        listId: targetList.id,
      });

      const priorityEmoji: Record<string, string> = {
        urgent: "🔥",
        high: "🔴",
        medium: "🟡",
        low: "🟢",
      };
      return {
        content: [
          {
            type: "text",
            text: `✅ Created task: ${task.name} ${priorityEmoji[priority]} (ID: ${task.id}) in list "${targetList.name}"`,
          },
        ],
      };
    }
  );

  // Tool: Complete a task
  server.tool(
    "completeTask",
    "Mark a task as completed. The task will be timestamped with completion time but remain in the system. Use getTasks first to find the task ID. Completed tasks can be included in getTasks results by setting includeCompleted=true.",
    {
      taskId: z
        .number()
        .int()
        .positive()
        .describe("The numeric ID of the task to complete. Use getTasks to find task IDs."),
    },
    async ({ taskId }) => {
      const task = await todoDb.getTask(taskId);
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      if (task.completedAt) {
        throw new Error(`Task "${task.name}" is already completed`);
      }

      const completedTask = await todoDb.completeTask(taskId);
      return {
        content: [
          {
            type: "text",
            text: `✅ Completed task: ${completedTask?.name} (ID: ${taskId})`,
          },
        ],
      };
    }
  );

  // Tool: Archive a task
  server.tool(
    "archiveTask",
    "Archive a task to hide it from regular task lists while keeping it in the system for records. Archived tasks can be included in getTasks results by setting includeCompleted=true. Use this for tasks that are no longer relevant but shouldn't be permanently deleted.",
    {
      taskId: z
        .number()
        .int()
        .positive()
        .describe("The numeric ID of the task to archive. Use getTasks to find task IDs."),
    },
    async ({ taskId }) => {
      const task = await todoDb.getTask(taskId);
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      if (task.archivedAt) {
        throw new Error(`Task "${task.name}" is already archived`);
      }

      const archivedTask = await todoDb.archiveTask(taskId);
      return {
        content: [
          {
            type: "text",
            text: `🗄️ Archived task: ${archivedTask?.name} (ID: ${taskId})`,
          },
        ],
      };
    }
  );

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Main function to handle both CLI and MCP server modes
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // CLI commands
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      console.log("Todo MCP Server");
      console.log("Usage:");
      console.log("  npx @floriscornel/todo-mcp@latest help       # Show help");
      console.log("  npx @floriscornel/todo-mcp@latest            # Start MCP server (default)");
      return;
    case undefined:
      // No command = start MCP server
      await startMcpServer();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help to see available commands");
      process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});

function getMetadata() {
  return {
    "current-date": new Date().toISOString(),
    "current-time": new Date().toLocaleTimeString(),
    "current-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
