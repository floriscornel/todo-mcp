import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { initializeDatabase, todoDb } from "../db/index.js";
import { ExtendedMcpServer } from "../utils/extended-mcp-server.js";
import { loadTodoService } from "./todo.js";

describe("Todo Service Direct Testing", () => {
	let server: ExtendedMcpServer;

	beforeAll(async () => {
		// Initialize database
		await initializeDatabase();

		// Create extended MCP server
		server = new ExtendedMcpServer({
			name: "todo-mcp-test",
			version: "0.2.0",
		});

		// Load todo service tools
		await loadTodoService(server);
	});

	afterEach(async () => {
		// Clean up test data after each test
		// Note: We only delete tasks as there's no deleteList method
		// Lists will be cleaned up by the test database reset in CI
		const lists = await todoDb.getAllLists();
		for (const list of lists) {
			const tasks = await todoDb.getTasksByList(list.id);
			for (const task of tasks) {
				await todoDb.deleteTask(task.id);
			}
		}
	});

	describe("Tool Discovery & Metadata", () => {
		test("should have all expected todo tools", () => {
			const toolNames = server.getToolNames();
			expect(toolNames).toContain("getLists");
			expect(toolNames).toContain("createList");
			expect(toolNames).toContain("getTasks");
			expect(toolNames).toContain("createTask");
			expect(toolNames).toContain("completeTask");
			expect(toolNames).toContain("archiveTask");
			expect(toolNames).toHaveLength(6);
		});

		test("should provide correct tool metadata", () => {
			const metadata = server.getToolsMetadata();
			expect(metadata).toHaveLength(6);

			const getListsTool = metadata.find((tool) => tool.name === "getLists");
			expect(getListsTool).toBeDefined();
			expect(getListsTool?.description).toContain("Retrieve all todo lists");

			const createTaskTool = metadata.find(
				(tool) => tool.name === "createTask",
			);
			expect(createTaskTool).toBeDefined();
			expect(createTaskTool?.description).toContain("Create a new task");
		});

		test("should check tool existence correctly", () => {
			expect(server.hasTool("getLists")).toBe(true);
			expect(server.hasTool("createTask")).toBe(true);
			expect(server.hasTool("nonExistentTool")).toBe(false);
		});

		test("should get tool information with schemas", () => {
			const toolInfo = server.getToolInfo("createList");
			expect(toolInfo.name).toBe("createList");
			expect(toolInfo.description).toContain("Create a new todo list");
			expect(toolInfo.inputSchema).toBeDefined();
			expect(toolInfo.callback).toBeTypeOf("function");
		});
	});

	describe("Lists Management", () => {
		test("should get lists successfully", async () => {
			const result = await server.callTool("getLists", {
				random_string: "test",
			});
			expect(result.content).toHaveLength(1);

			const lists = JSON.parse(result.content[0].text);
			expect(Array.isArray(lists)).toBe(true);
			// Database may have existing data, so just check structure
			expect(result.content[0].text).toBeDefined();
		});

		test("should create a new list", async () => {
			const result = await server.callTool("createList", {
				name: "Test Project",
				description: "A test project for unit testing",
			});

			expect(result.content).toHaveLength(1);
			expect(result.content[0].text).toContain("✅ Created list: Test Project");
			expect(result.content[0].text).toMatch(/ID: \d+/);
		});

		test("should create list without description", async () => {
			const result = await server.callTool("createList", {
				name: "Simple List",
			});

			expect(result.content[0].text).toContain("✅ Created list: Simple List");
		});

		test("should get lists with metadata after creation", async () => {
			// Create multiple lists
			await server.callTool("createList", {
				name: "Work Tasks",
				description: "Work-related tasks",
			});
			await server.callTool("createList", {
				name: "Personal",
				description: "Personal tasks",
			});

			const result = await server.callTool("getLists", {
				random_string: "test",
			});
			const lists = JSON.parse(result.content[0].text);

			// Check that lists were created (should be at least 2)
			expect(lists.length).toBeGreaterThanOrEqual(2);

			// Find our created lists
			const workList = lists.find(
				(l: { name: string; id: number }) => l.name === "Work Tasks",
			);
			const personalList = lists.find(
				(l: { name: string; id: number }) => l.name === "Personal",
			);

			expect(workList).toBeDefined();
			expect(personalList).toBeDefined();
			expect(workList).toHaveProperty("name");
			expect(workList).toHaveProperty("description");
			expect(workList).toHaveProperty("taskCounts");
			expect(workList).toHaveProperty("createdAtRelative");
			expect(workList.taskCounts).toHaveProperty("active");
			expect(workList.taskCounts).toHaveProperty("completed");
		});

		test("should handle list creation validation errors", async () => {
			await expect(
				server.callTool("createList", { name: "" }),
			).rejects.toThrow();

			await expect(
				server.callTool("createList", { name: "A".repeat(256) }),
			).rejects.toThrow();
		});
	});

	describe("Tasks Management", () => {
		let testListId: number;

		beforeEach(async () => {
			// Create a test list for task operations
			const result = await server.callTool("createList", {
				name: "Task Test List",
				description: "List for testing task operations",
			});

			// Extract the list ID from the response
			const lists = await todoDb.getAllLists();
			testListId = lists.find((l) => l.name === "Task Test List")?.id || 0;
		});

		test("should get empty tasks from new list", async () => {
			const result = await server.callTool("getTasks", {
				list: "Task Test List",
				includeCompleted: false,
			});

			const taskData = JSON.parse(result.content[0].text);
			expect(taskData.list).toBe("Task Test List");
			expect(taskData.tasks).toHaveLength(0);
		});

		test("should create tasks with different priorities", async () => {
			const priorities = ["urgent", "high", "medium", "low"] as const;

			for (const priority of priorities) {
				const result = await server.callTool("createTask", {
					list: "Task Test List",
					name: `Test ${priority} priority task`,
					description: `A ${priority} priority task for testing`,
					priority,
				});

				expect(result.content[0].text).toContain("✅ Created task:");
				expect(result.content[0].text).toContain(
					`Test ${priority} priority task`,
				);
				expect(result.content[0].text).toMatch(/ID: \d+/);
			}
		});

		test("should get tasks sorted by priority", async () => {
			// Create tasks in reverse priority order
			await server.callTool("createTask", {
				list: "Task Test List",
				name: "Low priority task",
				priority: "low",
			});
			await server.callTool("createTask", {
				list: "Task Test List",
				name: "Urgent priority task",
				priority: "urgent",
			});
			await server.callTool("createTask", {
				list: "Task Test List",
				name: "Medium priority task",
				priority: "medium",
			});

			const result = await server.callTool("getTasks", {
				list: "Task Test List",
			});

			const taskData = JSON.parse(result.content[0].text);
			expect(taskData.tasks).toHaveLength(3);

			// Should be sorted: urgent, medium, low
			expect(taskData.tasks[0].priority).toBe("urgent");
			expect(taskData.tasks[1].priority).toBe("medium");
			expect(taskData.tasks[2].priority).toBe("low");
		});

		test("should create task with default priority", async () => {
			const result = await server.callTool("createTask", {
				list: "Task Test List",
				name: "Default priority task",
			});

			expect(result.content[0].text).toContain("✅ Created task:");
			expect(result.content[0].text).toContain("Default priority task");
			// Priority emoji may vary depending on default handling, so just check success
		});

		test("should handle task creation validation errors", async () => {
			// Task name too short
			await expect(
				server.callTool("createTask", {
					list: "Task Test List",
					name: "abc", // Less than 5 characters
				}),
			).rejects.toThrow();

			// Task name too long
			await expect(
				server.callTool("createTask", {
					list: "Task Test List",
					name: "A".repeat(121), // More than 120 characters
				}),
			).rejects.toThrow();

			// Non-existent list
			await expect(
				server.callTool("createTask", {
					list: "Non-existent List",
					name: "Valid task name",
				}),
			).rejects.toThrow("not found");
		});

		test("should handle case-insensitive list names", async () => {
			const result = await server.callTool("createTask", {
				list: "task test list", // lowercase
				name: "Case insensitive test task",
			});

			expect(result.content[0].text).toContain("✅ Created task:");
		});

		test("should get tasks with relative timestamps", async () => {
			await server.callTool("createTask", {
				list: "Task Test List",
				name: "Timestamp test task",
			});

			const result = await server.callTool("getTasks", {
				list: "Task Test List",
			});

			const taskData = JSON.parse(result.content[0].text);
			expect(taskData.tasks[0]).toHaveProperty("createdAtRelative");
			expect(typeof taskData.tasks[0].createdAtRelative).toBe("string");
		});
	});

	describe("Task Completion & Archiving", () => {
		let testListId: number;
		let testTaskId: number;

		beforeEach(async () => {
			// Create a test list and task
			await server.callTool("createList", {
				name: "Completion Test List",
			});

			const createTaskResult = await server.callTool("createTask", {
				list: "Completion Test List",
				name: "Task to complete or archive",
			});

			// Get the task ID from the database
			const lists = await todoDb.getAllLists();
			testListId =
				lists.find((l) => l.name === "Completion Test List")?.id || 0;
			const tasks = await todoDb.getTasksByList(testListId);
			testTaskId = tasks[0]?.id || 0;
		});

		test("should complete a task", async () => {
			const result = await server.callTool("completeTask", {
				taskId: testTaskId,
			});

			expect(result.content[0].text).toContain("✅ Completed task:");
			expect(result.content[0].text).toContain(`ID: ${testTaskId}`);
		});

		test("should not complete already completed task", async () => {
			// Complete the task first
			await server.callTool("completeTask", { taskId: testTaskId });

			// Try to complete again
			await expect(
				server.callTool("completeTask", { taskId: testTaskId }),
			).rejects.toThrow("already completed");
		});

		test("should archive a task", async () => {
			const result = await server.callTool("archiveTask", {
				taskId: testTaskId,
			});

			expect(result.content[0].text).toContain("🗄️ Archived task:");
			expect(result.content[0].text).toContain(`ID: ${testTaskId}`);
		});

		test("should not archive already archived task", async () => {
			// Archive the task first
			await server.callTool("archiveTask", { taskId: testTaskId });

			// Try to archive again
			await expect(
				server.callTool("archiveTask", { taskId: testTaskId }),
			).rejects.toThrow("already archived");
		});

		test("should handle non-existent task completion", async () => {
			await expect(
				server.callTool("completeTask", { taskId: 99999 }),
			).rejects.toThrow("not found");
		});

		test("should handle non-existent task archiving", async () => {
			await expect(
				server.callTool("archiveTask", { taskId: 99999 }),
			).rejects.toThrow("not found");
		});

		test("should include completed tasks when requested", async () => {
			// Complete the task
			await server.callTool("completeTask", { taskId: testTaskId });

			// Get tasks without completed
			const activeResult = await server.callTool("getTasks", {
				list: "Completion Test List",
				includeCompleted: false,
			});
			const activeTasks = JSON.parse(activeResult.content[0].text);
			expect(activeTasks.tasks).toHaveLength(0);

			// Get tasks with completed
			const allResult = await server.callTool("getTasks", {
				list: "Completion Test List",
				includeCompleted: true,
			});
			const allTasks = JSON.parse(allResult.content[0].text);
			expect(allTasks.tasks).toHaveLength(1);
			expect(allTasks.tasks[0].completedAtRelative).toBeTruthy();
		});

		test("should include archived tasks when requested", async () => {
			// Archive the task
			await server.callTool("archiveTask", { taskId: testTaskId });

			// Get active tasks only
			const activeResult = await server.callTool("getTasks", {
				list: "Completion Test List",
				includeCompleted: false,
			});
			const activeTasks = JSON.parse(activeResult.content[0].text);
			expect(activeTasks.tasks).toHaveLength(0);

			// Get all tasks including archived
			const allResult = await server.callTool("getTasks", {
				list: "Completion Test List",
				includeCompleted: true,
			});
			const allTasks = JSON.parse(allResult.content[0].text);
			expect(allTasks.tasks).toHaveLength(1);
			expect(allTasks.tasks[0].archivedAtRelative).toBeTruthy();
		});
	});

	describe("Batch Operations & Workflows", () => {
		test("should handle batch operations", async () => {
			const batchResults = await server.callTools([
				{
					tool: "createList",
					parameters: {
						name: "Batch Test List",
						description: "Created via batch operation",
					},
				},
				{
					tool: "createTask",
					parameters: {
						list: "Batch Test List",
						name: "Batch created task 1",
						priority: "high",
					},
				},
				{
					tool: "createTask",
					parameters: {
						list: "Batch Test List",
						name: "Batch created task 2",
						priority: "medium",
					},
				},
				{
					tool: "getTasks",
					parameters: {
						list: "Batch Test List",
					},
				},
			]);

			expect(batchResults).toHaveLength(4);
			expect(batchResults.every((result) => result.success)).toBe(true);

			// Check the last result (getTasks) to verify the batch worked
			const tasksResult = batchResults[3];
			if (tasksResult.success && tasksResult.result) {
				const taskData = JSON.parse(tasksResult.result.content[0].text);
				expect(taskData.tasks).toHaveLength(2);
				expect(taskData.tasks[0].priority).toBe("high"); // Should be sorted by priority
			}
		});

		test("should handle batch operations with errors", async () => {
			const batchResults = await server.callTools([
				{
					tool: "createList",
					parameters: { name: "Success List" },
				},
				{
					tool: "createTask",
					parameters: {
						list: "Non-existent List", // This should fail
						name: "This will fail",
					},
				},
				{
					tool: "getTasks",
					parameters: { list: "Success List" },
				},
			]);

			expect(batchResults).toHaveLength(3);
			expect(batchResults[0].success).toBe(true);
			expect(batchResults[1].success).toBe(false);
			expect(batchResults[2].success).toBe(true);

			expect(batchResults[1].error).toContain("not found");
		});

		test("should complete a full workflow", async () => {
			// 1. Create a project list
			await server.callTool("createList", {
				name: "Full Workflow Project",
				description: "Testing complete workflow",
			});

			// 2. Add multiple tasks with different priorities
			const taskNames = [
				"Setup development environment",
				"Write initial tests",
				"Implement core features",
				"Deploy to staging",
			];
			const priorities = ["urgent", "high", "medium", "low"] as const;

			for (let i = 0; i < taskNames.length; i++) {
				await server.callTool("createTask", {
					list: "Full Workflow Project",
					name: taskNames[i],
					priority: priorities[i],
					description: `Task ${i + 1} in the workflow`,
				});
			}

			// 3. Get all tasks and verify sorting
			const tasksResult = await server.callTool("getTasks", {
				list: "Full Workflow Project",
			});
			const taskData = JSON.parse(tasksResult.content[0].text);
			expect(taskData.tasks).toHaveLength(4);

			// Verify priority sorting
			const actualPriorities = taskData.tasks.map(
				(t: { priority: string }) => t.priority,
			);
			expect(actualPriorities).toEqual(["urgent", "high", "medium", "low"]);

			// 4. Complete the first task
			const urgentTask = taskData.tasks[0];
			await server.callTool("completeTask", { taskId: urgentTask.id });

			// 5. Archive the last task (not needed)
			const lowTask = taskData.tasks[3];
			await server.callTool("archiveTask", { taskId: lowTask.id });

			// 6. Verify final state
			const finalResult = await server.callTool("getTasks", {
				list: "Full Workflow Project",
				includeCompleted: false,
			});
			const finalTasks = JSON.parse(finalResult.content[0].text);
			expect(finalTasks.tasks).toHaveLength(2); // Only high and medium remain active

			// 7. Get all tasks including completed/archived
			const allTasksResult = await server.callTool("getTasks", {
				list: "Full Workflow Project",
				includeCompleted: true,
			});
			const allTasks = JSON.parse(allTasksResult.content[0].text);
			expect(allTasks.tasks).toHaveLength(4); // All tasks still exist
		});
	});

	describe("Error Handling & Edge Cases", () => {
		test("should handle unknown tool calls", async () => {
			await expect(server.callTool("nonExistentTool", {})).rejects.toThrow(
				'Tool "nonExistentTool" not found',
			);
		});

		test("should handle invalid task IDs", async () => {
			await expect(
				server.callTool("completeTask", { taskId: -1 }),
			).rejects.toThrow();

			await expect(
				server.callTool("archiveTask", { taskId: 0 }),
			).rejects.toThrow();
		});

		test("should handle invalid priority values", async () => {
			await server.callTool("createList", { name: "Priority Test List" });

			await expect(
				server.callTool("createTask", {
					list: "Priority Test List",
					name: "Invalid priority task",
					priority: "invalid" as unknown as
						| "low"
						| "medium"
						| "high"
						| "urgent",
				}),
			).rejects.toThrow();
		});

		test("should handle extremely long descriptions", async () => {
			await server.callTool("createList", { name: "Description Test List" });

			await expect(
				server.callTool("createTask", {
					list: "Description Test List",
					name: "Task with long description",
					description: "A".repeat(501), // Exceeds 500 character limit
				}),
			).rejects.toThrow();
		});

		test("should handle case variations in list names", async () => {
			await server.callTool("createList", { name: "CaSeSeNsItIvE LiSt" });

			// All these variations should work
			const variations = [
				"CaSeSeNsItIvE LiSt",
				"casesensitive list",
				"CASESENSITIVE LIST",
				"Casesensitive List",
			];

			for (const listName of variations) {
				const result = await server.callTool("createTask", {
					list: listName,
					name: `Task for ${listName}`,
				});
				expect(result.content[0].text).toContain("✅ Created task:");
			}
		});

		test("should provide helpful error messages", async () => {
			await expect(
				server.callTool("getTasks", { list: "Non-existent List" }),
			).rejects.toThrow(/Available lists:/);

			await expect(
				server.callTool("createTask", {
					list: "Another Non-existent List",
					name: "Valid task name",
				}),
			).rejects.toThrow(/Available lists:/);
		});
	});
});
