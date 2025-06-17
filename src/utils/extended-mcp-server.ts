import {
	McpServer,
	type RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Extended MCP Server that provides access to registered tools for auto-generating OpenAPI specs.
 * This class extends the standard McpServer to expose the private _registeredTools property
 * through a public method, enabling automatic OpenAPI generation from MCP tool definitions.
 */
export class ExtendedMcpServer extends McpServer {
	/**
	 * Get all registered tools with their metadata for OpenAPI generation.
	 * This exposes the private _registeredTools property in a controlled way.
	 */
	getRegisteredTools(): Map<string, RegisteredTool> {
		// Access the private property through type assertion
		// This is safe because we control both the usage and the MCP server lifecycle
		// biome-ignore lint/suspicious/noExplicitAny: Accessing private MCP server properties
		const privateServer = this as any;

		const tools = privateServer._registeredTools;
		if (!tools) {
			return new Map();
		}

		// Check if it's actually a Map
		if (tools instanceof Map) {
			return tools;
		}

		// If it's an object, convert to Map (MCP SDK stores tools as objects, not Maps)
		if (typeof tools === "object") {
			const map = new Map();
			for (const [key, value] of Object.entries(tools)) {
				map.set(key, value as RegisteredTool);
			}
			return map;
		}

		return new Map();
	}

	/**
	 * Get metadata for all registered tools
	 */
	getToolsMetadata() {
		const tools = this.getRegisteredTools();
		return Array.from(tools.entries()).map(([name, tool]) => ({
			name,
			description: tool.description,
			inputSchema: tool.inputSchema,
			outputSchema: tool.outputSchema,
			enabled: true,
		}));
	}

	/**
	 * Get a specific tool by name
	 */
	getTool(name: string): RegisteredTool | undefined {
		const tools = this.getRegisteredTools();
		return tools.get(name);
	}

	/**
	 * Get list of available tool names
	 */
	getToolNames(): string[] {
		return this.getToolsMetadata().map((tool) => tool.name);
	}

	/**
	 * Check if a tool exists
	 */
	hasTool(name: string): boolean {
		return this.getTool(name) !== undefined;
	}

	/**
	 * Get tool information including schema
	 */
	getToolInfo(name: string) {
		const tool = this.getTool(name);
		if (!tool) {
			throw new Error(`Tool "${name}" not found`);
		}

		const metadata = this.getToolsMetadata().find((t) => t.name === name);
		return {
			name,
			description: tool.description,
			inputSchema: tool.inputSchema,
			outputSchema: tool.outputSchema,
			callback: tool.callback,
			metadata,
		};
	}

	/**
	 * Call multiple tools in sequence (useful for integration testing)
	 */
	async callTools(
		calls: Array<{ tool: string; parameters?: Record<string, unknown> }>,
	): Promise<
		// biome-ignore lint/suspicious/noExplicitAny: Tool results can be any type
		Array<{ tool: string; result: any; success: boolean; error?: string }>
	> {
		const results = [];

		for (const call of calls) {
			try {
				const result = await this.callTool(call.tool, call.parameters);
				results.push({
					tool: call.tool,
					result,
					success: true,
				});
			} catch (error) {
				results.push({
					tool: call.tool,
					result: null,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return results;
	}

	/**
	 * Call a tool directly without transport (useful for testing)
	 */
	async callTool(
		toolName: string,
		parameters: Record<string, unknown> = {},
		// biome-ignore lint/suspicious/noExplicitAny: Tool results can be any type
	): Promise<any> {
		const tool = this.getTool(toolName);
		if (!tool) {
			throw new Error(
				`Tool "${toolName}" not found. Available tools: ${this.getToolNames().join(", ")}`,
			);
		}

		// Validate parameters against input schema if available
		if (tool.inputSchema) {
			try {
				// Use Zod's parse method to validate the parameters
				tool.inputSchema.parse(parameters);
			} catch (error) {
				throw new Error(
					`Invalid parameters for tool "${toolName}": ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		// Create a mock extra parameter that MCP tools expect
		const extra = {
			requestId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			signal: new AbortController().signal,
			sendNotification: async () => {},
			sendRequest: async () => ({ result: null }),
		};

		try {
			// Call the tool callback directly
			// biome-ignore lint/suspicious/noExplicitAny: MCP tool callback signature requires any
			const result = await tool.callback(parameters as any, extra as any);
			return result;
		} catch (error) {
			throw new Error(
				`Tool "${toolName}" execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
