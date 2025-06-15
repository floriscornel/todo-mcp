#!/usr/bin/env node

import { Command } from "commander";
import {
	type ApplicationConfig,
	createConfig,
	logger,
} from "./utils/config.js";
import type { ExtendedMcpServer } from "./utils/extended-mcp-server.js";

/**
 * Create and configure the MCP server with the todo service
 */
async function createMcpServer(config: ApplicationConfig) {
	const { initializeDatabase } = await import("./db/index.js");
	const { loadTodoService } = await import("./service/todo.js");
	const { ExtendedMcpServer } = await import("./utils/extended-mcp-server.js");

	// Initialize database if required
	if (config.database.requireConnection) {
		await initializeDatabase();
	}

	// Create server
	const server = new ExtendedMcpServer(
		{
			name: config.server.name,
			version: config.server.version,
		},
		{
			capabilities: {
				tools: {},
			},
		},
	);

	// Load todo service
	await loadTodoService(server);

	return server;
}

/**
 * Start the appropriate transport based on configuration
 */
async function startTransport(
	server: ExtendedMcpServer,
	config: ApplicationConfig,
) {
	switch (config.mcp.transport) {
		case "stdio":
			{
				const { startStdioServer } = await import("./transports/stdio.js");
				await startStdioServer(server, config);
			}
			break;

		case "http":
			{
				const { startHttpServer } = await import("./transports/http.js");
				await startHttpServer(server, config);
			}
			break;

		case "openapi":
			{
				const { startOpenApiServer } = await import("./transports/openapi.js");
				await startOpenApiServer(server, config);
			}
			break;

		case "cli":
			{
				const { startCliMode } = await import("./transports/cli.js");
				await startCliMode(server, config);
			}
			break;

		default:
			throw new Error(`Unknown transport: ${config.mcp.transport}`);
	}
}

/**
 * Main CLI entry point with commander
 */
async function main() {
	const program = new Command();

	program
		.name("todo-mcp")
		.description("Todo MCP (Model Context Protocol) Server")
		.version("0.2.0")
		.addHelpText(
			"after",
			`
Examples:
  $ todo-mcp                           # Start server with stdio transport (default)
  $ todo-mcp --transport http --port 3001  # Start HTTP server on port 3001
  $ todo-mcp --transport cli --tool getTasks --parameters '{"list":"work"}'  # CLI mode`,
		);

	// Global options
	program
		.option("--host <host>", "server host", "localhost")
		.option("--port <port>", "server port", "3000")
		.option("--transport <type>", "transport type", "stdio")
		.option("--log-level <level>", "log level", "info")
		.option("--no-db", "disable database requirement");

	// CLI-specific options
	program
		.option("--tool <name>", "tool to execute in CLI mode")
		.option("--parameters <json>", "tool parameters as JSON string")
		.option("--list", "list available tools")
		.option("--interactive", "start interactive CLI mode");

	// Parse arguments
	program.parse();
	const options = program.opts();

	try {
		// Create configuration
		const config = createConfig({
			server: {
				name: "todo-mcp",
				version: "0.2.0",
				host: options.host,
				port: Number.parseInt(options.port, 10),
			},
			database: {
				url: process.env.DATABASE_URL || "postgres://localhost:5432/todo_mcp",
				requireConnection: options.db !== false,
			},
			mcp: {
				transport: options.transport,
			},
			cli: {
				tool: options.tool,
				parameters: options.parameters,
				list: options.list,
				interactive: options.interactive,
			},
			log: {
				level: options.logLevel,
			},
		});

		// If CLI options are provided, set transport to CLI mode
		if (config.cli.tool || config.cli.list || config.cli.interactive) {
			config.mcp.transport = "cli";
		}

		// Create server and start transport
		const server = await createMcpServer(config);
		await startTransport(server, config);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error(`Failed to start server: ${errorMessage}`);
		process.exit(1);
	}
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
	logger.error("Uncaught exception:", { error: error.message });
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	logger.error("Unhandled rejection:", {
		reason: reason instanceof Error ? reason.message : String(reason),
	});
	process.exit(1);
});

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		logger.error("Application failed to start:", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}

export { createMcpServer, startTransport };
