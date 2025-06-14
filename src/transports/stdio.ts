import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ApplicationConfig } from "../utils/config.js";
import { logger } from "../utils/config.js";

export async function startStdioServer(
	server: McpServer,
	config: ApplicationConfig,
) {
	logger.info("Starting MCP server with stdio transport", {
		serverName: config.server.name,
		version: config.server.version,
		service: "todo",
	});

	// Start server with stdio transport
	const transport = new StdioServerTransport();
	await server.connect(transport);

	logger.info("MCP server connected via stdio transport");
}
