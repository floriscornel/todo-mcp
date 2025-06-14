#!/usr/bin/env node

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeDatabase } from "./db/index.js";
import { loadTodoService } from "./service/todo.js";

async function startMcpServer() {
	// Initialize database
	await initializeDatabase();

	// Create MCP server
	const server = new McpServer({
		name: "todo-mcp",
		version: "0.2.0",
	});

	// Load todo service tools
	await loadTodoService(server);

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
			console.log(
				"  npx @floriscornel/todo-mcp@latest            # Start MCP server (default)",
			);
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
