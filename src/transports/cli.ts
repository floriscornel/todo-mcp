import type { ApplicationConfig } from "../utils/config.js";
import { logger } from "../utils/config.js";
import type { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

/**
 * Start CLI mode for direct tool execution
 * This is useful for development, testing, and scripting
 */
export async function startCliMode(
	server: ExtendedMcpServer,
	config: ApplicationConfig,
) {
	const { tool, parameters, list, interactive } = config.cli;

	logger.info("Starting MCP server in CLI mode", {
		serverName: config.server.name,
		version: config.server.version,
		service: "todo", // Hardcoded since service is always todo
	});

	console.log("🛠️  Todo MCP CLI Mode");
	console.log("===================");

	// List available tools
	if (list || (!tool && !interactive)) {
		console.log("📋 Available Tools:");
		const toolsMetadata = server.getToolsMetadata();

		for (const toolMeta of toolsMetadata) {
			console.log(`  • ${toolMeta.name} - ${toolMeta.description}`);
		}

		console.log("\n💡 Usage Examples:");
		console.log("  # List tools");
		console.log("  npm start -- --mode cli --list");
		console.log("");
		console.log("  # Execute a tool");
		console.log("  npm start -- --mode cli --tool getLists");
		console.log(
			'  npm start -- --mode cli --tool createList --parameters \'{"name":"My List"}\'',
		);
		console.log(
			'  npm start -- --mode cli --tool getTasks --parameters \'{"list":"My List"}\'',
		);
		console.log("");
		return;
	}

	// Execute a specific tool
	if (tool) {
		console.log(`🔧 Executing tool: ${tool}`);

		try {
			// Parse parameters if provided
			let parsedParams = {};
			if (parameters) {
				try {
					parsedParams = JSON.parse(parameters);
					console.log("📥 Parameters:", JSON.stringify(parsedParams, null, 2));
				} catch (error) {
					console.error(
						"❌ Invalid JSON parameters:",
						error instanceof Error ? error.message : error,
					);
					process.exit(1);
				}
			}

			// Execute the tool
			const startTime = Date.now();
			const result = await server.callTool(tool, parsedParams);
			const duration = Date.now() - startTime;

			console.log(`✅ Result (${duration}ms):`);
			console.log(JSON.stringify(result, null, 2));

			logger.info("CLI tool executed successfully", {
				tool,
				duration,
				parametersProvided: !!parameters,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error("❌ Tool execution failed:");
			console.error(errorMessage);
			logger.error("CLI tool execution failed", {
				tool,
				error: errorMessage,
			});
			process.exit(1);
		}
		return;
	}

	// Interactive mode (future enhancement)
	if (interactive) {
		console.log("🚧 Interactive mode is not yet implemented");
		console.log("💡 For now, use --tool and --parameters for direct execution");
		return;
	}
}
