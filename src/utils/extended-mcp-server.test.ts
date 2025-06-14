import { beforeAll, describe, expect, test } from "vitest";
import { initializeDatabase } from "../db/index.js";
import { loadTodoService } from "../service/todo.js";
import { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

describe("Tool Testing with ExtendedMcpServer", () => {
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

	test("should list all available tools", () => {
		const toolNames = server.getToolNames();
		expect(toolNames).toContain("getLists");
		expect(toolNames).toContain("createList");
		expect(toolNames).toContain("getTasks");
		expect(toolNames).toContain("createTask");
		expect(toolNames).toContain("completeTask");
		expect(toolNames).toContain("archiveTask");
	});

	test("should get tool metadata", () => {
		const metadata = server.getToolsMetadata();
		expect(metadata).toHaveLength(6);

		const getListsTool = metadata.find((tool) => tool.name === "getLists");
		expect(getListsTool).toBeDefined();
		expect(getListsTool?.description).toContain("lists");
	});

	test("should check if tool exists", () => {
		expect(server.hasTool("getLists")).toBe(true);
		expect(server.hasTool("nonExistentTool")).toBe(false);
	});

	test("should get tool information", () => {
		const toolInfo = server.getToolInfo("createList");
		expect(toolInfo.name).toBe("createList");
		expect(toolInfo.description).toContain("Create");
		expect(toolInfo.inputSchema).toBeDefined();
		expect(toolInfo.callback).toBeTypeOf("function");
	});

	test("should call getLists tool directly", async () => {
		const result = await server.callTool("getLists", { random_string: "test" });
		expect(result).toBeDefined();
		expect(result.content).toBeDefined();
		expect(Array.isArray(result.content)).toBe(true);
	});

	test("should create and get a list using direct tool calls", async () => {
		// Create a test list
		const createResult = await server.callTool("createList", {
			name: "Test List for Tool Testing",
			description: "A list created during tool testing",
		});

		expect(createResult).toBeDefined();
		expect(createResult.content).toBeDefined();

		// Verify the list was created by getting all lists
		const getResult = await server.callTool("getLists", {
			random_string: "test",
		});
		expect(getResult.content).toBeDefined();

		const lists = JSON.parse(getResult.content[0].text);
		const testList = lists.find(
			// biome-ignore lint/suspicious/noExplicitAny: Dynamic JSON parsing in tests requires any
			(list: any) => list.name === "Test List for Tool Testing",
		);
		expect(testList).toBeDefined();
		expect(testList.description).toBe("A list created during tool testing");
	});

	test("should validate tool parameters", async () => {
		// Test with invalid parameters (missing required name field)
		await expect(
			server.callTool("createList", { description: "Missing name" }),
		).rejects.toThrow("Invalid parameters");

		// Test with invalid parameter type
		await expect(server.callTool("createList", { name: 123 })).rejects.toThrow(
			"Invalid parameters",
		);
	});

	test("should handle non-existent tool", async () => {
		await expect(server.callTool("nonExistentTool", {})).rejects.toThrow(
			'Tool "nonExistentTool" not found',
		);
	});

	test("should call multiple tools in sequence", async () => {
		const calls = [
			{
				tool: "createList",
				parameters: {
					name: "Batch Test List",
					description: "Created in batch",
				},
			},
			{
				tool: "getLists",
				parameters: { random_string: "test" },
			},
			{
				tool: "nonExistentTool", // This should fail
				parameters: {},
			},
		];

		const results = await server.callTools(calls);
		expect(results).toHaveLength(3);

		// First call should succeed
		expect(results[0].success).toBe(true);
		expect(results[0].tool).toBe("createList");
		expect(results[0].result).toBeDefined();

		// Second call should succeed
		expect(results[1].success).toBe(true);
		expect(results[1].tool).toBe("getLists");

		// Third call should fail
		expect(results[2].success).toBe(false);
		expect(results[2].tool).toBe("nonExistentTool");
		expect(results[2].error).toContain("not found");
	});

	test("should work with task operations", async () => {
		// First create a list for tasks
		const listResult = await server.callTool("createList", {
			name: "Task Test List",
			description: "For testing task operations",
		});

		// Create a task
		const taskResult = await server.callTool("createTask", {
			list: "Task Test List",
			name: "Test task creation via direct tool call",
			description: "This task was created directly",
			priority: "high",
		});

		expect(taskResult).toBeDefined();
		expect(taskResult.content).toBeDefined();

		// Get tasks to verify
		const getTasksResult = await server.callTool("getTasks", {
			list: "Task Test List",
			includeCompleted: false,
		});

		expect(getTasksResult.content).toBeDefined();
		const tasks = JSON.parse(getTasksResult.content[0].text);
		expect(tasks.tasks.length).toBeGreaterThanOrEqual(1);

		// Find the task we just created
		const createdTask = tasks.tasks.find(
			// biome-ignore lint/suspicious/noExplicitAny: Dynamic JSON parsing in tests requires any
			(task: any) => task.name === "Test task creation via direct tool call",
		);
		expect(createdTask).toBeDefined();
		expect(createdTask.priority).toBe("high");
	});
});
