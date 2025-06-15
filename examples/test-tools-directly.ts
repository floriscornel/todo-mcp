#!/usr/bin/env ts-node

/**
 * Example: Testing MCP Tools Directly Without Transports
 *
 * This example demonstrates how to use the ExtendedMcpServer to test
 * MCP tools directly without setting up stdio, HTTP, or other transports.
 * This is particularly useful for:
 * - Unit testing individual tools
 * - Integration testing workflows
 * - Development and debugging
 * - API exploration
 */

import { initializeDatabase } from "../src/db/index.js";
import { loadTodoService } from "../src/service/todo.js";
import { ExtendedMcpServer } from "../src/utils/extended-mcp-server.js";

async function main() {
	console.log("🧪 Testing MCP Tools Directly\n");

	// Initialize database
	await initializeDatabase();

	// Create extended MCP server
	const server = new ExtendedMcpServer({
		name: "todo-mcp-test",
		version: "0.2.0",
	});

	// Load todo service tools
	await loadTodoService(server);

	// 1. Explore available tools
	console.log("📋 Available Tools:");
	const toolNames = server.getToolNames();
	for (const toolName of toolNames) {
		const toolInfo = server.getToolInfo(toolName);
		console.log(`  • ${toolName} - ${toolInfo.description}`);
	}
	console.log("");

	// 2. Get all current lists
	console.log("📂 Current Lists:");
	const listsResult = await server.callTool("getLists", {
		random_string: "test",
	});
	const lists = JSON.parse(listsResult.content[0].text);
	console.log(`  Found ${lists.length} lists:`);
	for (const list of lists) {
		console.log(`  • ${list.name} (${list.taskCounts.active} active tasks)`);
	}
	console.log("");

	// 3. Create a new list for testing
	console.log("✨ Creating Test List:");
	const createListResult = await server.callTool("createList", {
		name: "Direct Tool Testing",
		description: "A list created by calling tools directly",
	});
	console.log(`  ${createListResult.content[0].text}`);
	console.log("");

	// 4. Create some tasks
	console.log("📝 Creating Test Tasks:");
	const taskNames = [
		"Write unit tests for MCP tools",
		"Set up integration testing workflow",
		"Document the ExtendedMcpServer API",
	];

	for (const [index, taskName] of taskNames.entries()) {
		const priority = ["urgent", "high", "medium"][index] as
			| "urgent"
			| "high"
			| "medium";
		const result = await server.callTool("createTask", {
			list: "Direct Tool Testing",
			name: taskName,
			priority,
			description: `Task ${index + 1} created via direct tool call`,
		});
		console.log(`  ${result.content[0].text}`);
	}
	console.log("");

	// 5. Get tasks to see what we created
	console.log("📋 Tasks in Test List:");
	const tasksResult = await server.callTool("getTasks", {
		list: "Direct Tool Testing",
		includeCompleted: false,
	});
	const taskData = JSON.parse(tasksResult.content[0].text);
	console.log(`  List: ${taskData.list}`);
	for (const task of taskData.tasks) {
		const priorityEmoji = {
			urgent: "🔥",
			high: "🔴",
			medium: "🟡",
			low: "🟢",
		}[task.priority];
		console.log(`  • ${task.name} ${priorityEmoji} (ID: ${task.id})`);
	}
	console.log("");

	// 6. Complete a task
	if (taskData.tasks.length > 0) {
		const firstTask = taskData.tasks[0];
		console.log("✅ Completing First Task:");
		const completeResult = await server.callTool("completeTask", {
			taskId: firstTask.id,
		});
		console.log(`  ${completeResult.content[0].text}`);
		console.log("");
	}

	// 7. Test batch operations
	console.log("🔄 Testing Batch Operations:");
	const batchResults = await server.callTools([
		{
			tool: "createTask",
			parameters: {
				list: "Direct Tool Testing",
				name: "Batch created task 1",
				priority: "low",
			},
		},
		{
			tool: "createTask",
			parameters: {
				list: "Direct Tool Testing",
				name: "Batch created task 2",
				priority: "low",
			},
		},
		{
			tool: "getTasks",
			parameters: {
				list: "Direct Tool Testing",
				includeCompleted: true,
			},
		},
	]);

	for (const result of batchResults) {
		if (result.success) {
			console.log(`  ✅ ${result.tool}: Success`);
		} else {
			console.log(`  ❌ ${result.tool}: ${result.error}`);
		}
	}
	console.log("");

	// 8. Test error handling
	console.log("🚨 Testing Error Handling:");
	try {
		await server.callTool("createTask", {
			list: "Non-existent List",
			name: "This should fail",
		});
	} catch (error) {
		console.log(
			`  ✅ Caught expected error: ${error instanceof Error ? error.message : error}`,
		);
	}

	try {
		await server.callTool("nonExistentTool", {});
	} catch (error) {
		console.log(
			`  ✅ Caught expected error: ${error instanceof Error ? error.message : error}`,
		);
	}
	console.log("");

	// 9. Tool introspection
	console.log("🔍 Tool Introspection:");
	const metadata = server.getToolsMetadata();
	for (const tool of metadata.slice(0, 2)) {
		// Show first 2 tools as examples
		console.log(`  📋 ${tool.name}:`);
		console.log(`    Description: ${tool.description}`);
		console.log(
			`    Input Schema: ${tool.inputSchema ? "✅ Available" : "❌ None"}`,
		);
		console.log(
			`    Output Schema: ${tool.outputSchema ? "✅ Available" : "❌ None"}`,
		);
	}
	console.log("");

	console.log("🎉 Direct tool testing completed!");
	console.log("\n💡 This demonstrates how you can:");
	console.log("  • Test MCP tools without setting up transports");
	console.log("  • Build integration tests for tool workflows");
	console.log("  • Debug tool behavior during development");
	console.log("  • Explore tool capabilities programmatically");
	console.log("  • Validate tool parameters and error handling");
}

// Run the example
main().catch((error) => {
	console.error("❌ Example failed:", error);
	process.exit(1);
});
