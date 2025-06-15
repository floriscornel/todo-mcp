import { vi } from "vitest";
import type { ApplicationConfig } from "../utils/config.js";
import type { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

/**
 * Mock utilities for testing
 */

/**
 * Mock ApplicationConfig for testing
 */
export const createMockConfig = (
	overrides: Partial<ApplicationConfig> = {},
): ApplicationConfig => ({
	server: {
		name: "test-mcp",
		version: "1.0.0",
		port: 3000,
		host: "localhost",
		...overrides.server,
	},
	database: {
		url: "postgres://localhost:5432/test_mcp",
		requireConnection: false,
		...overrides.database,
	},
	mcp: {
		transport: "stdio",
		...overrides.mcp,
	},
	cli: {
		...overrides.cli,
	},
	log: {
		level: "error", // Keep tests quiet by default
		...overrides.log,
	},
});

/**
 * Mock ExtendedMcpServer for testing
 */
export const createMockServer = (): ExtendedMcpServer => {
	const mockServer = {
		connect: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		tool: vi.fn(),
		callTool: vi.fn().mockResolvedValue({
			content: [{ type: "text", text: "Test result" }],
		}),
		getToolsMetadata: vi.fn().mockReturnValue([
			{
				name: "testTool",
				description: "A test tool",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
		]),
		getToolInfo: vi.fn().mockReturnValue({
			name: "testTool",
			description: "A test tool",
			inputSchema: { type: "object", properties: {} },
			outputSchema: undefined,
			callback: vi.fn(),
			metadata: {
				name: "testTool",
				description: "A test tool",
				inputSchema: { type: "object", properties: {} },
				outputSchema: undefined,
				enabled: true,
			},
		}),
		// Add other methods as needed for tests
	} as unknown as ExtendedMcpServer;

	return mockServer;
};

/**
 * Create a mock server with testing service tools loaded
 * Use this when you need actual tool definitions for testing
 */
export const createMockServerWithTestingService =
	async (): Promise<ExtendedMcpServer> => {
		const mockServer = createMockServer();

		// Mock the testing service tools
		mockServer.getToolsMetadata = vi.fn().mockReturnValue([
			{
				name: "echo",
				description:
					"Echo the input parameters back. Useful for testing parameter passing and JSON serialization.",
				inputSchema: {
					type: "object",
					properties: {
						message: { type: "string", description: "Message to echo back" },
						metadata: {
							type: "object",
							description: "Optional metadata object",
						},
					},
				},
			},
			{
				name: "math",
				description:
					"Perform basic arithmetic operations. Useful for testing parameter validation and error handling.",
				inputSchema: {
					type: "object",
					properties: {
						operation: {
							type: "string",
							enum: ["add", "subtract", "multiply", "divide"],
						},
						a: { type: "number" },
						b: { type: "number" },
					},
					required: ["operation", "a", "b"],
				},
			},
			{
				name: "status",
				description:
					"Get server status and information. Useful for testing tool discovery and introspection.",
				inputSchema: {
					type: "object",
					properties: {
						includeTimestamp: { type: "boolean" },
						format: { type: "string", enum: ["json", "text"] },
					},
				},
			},
			{
				name: "validate",
				description:
					"Test parameter validation with various constraints. Useful for testing error handling.",
				inputSchema: {
					type: "object",
					properties: {
						value: { type: "string" },
						type: { type: "string", enum: ["email", "url", "uuid", "number"] },
						strict: { type: "boolean" },
					},
					required: ["value", "type"],
				},
			},
		]);

		// Mock getToolInfo for testing service tools
		mockServer.getToolInfo = vi.fn().mockImplementation((toolName: string) => {
			const tools = {
				echo: {
					name: "echo",
					description:
						"Echo the input parameters back. Useful for testing parameter passing and JSON serialization.",
					inputSchema: {
						type: "object",
						properties: {
							message: { type: "string", description: "Message to echo back" },
							metadata: {
								type: "object",
								description: "Optional metadata object",
							},
						},
						shape: {
							message: {},
							metadata: {},
						},
					},
					outputSchema: undefined,
					callback: vi.fn(),
					metadata: {
						name: "echo",
						description: "Echo the input parameters back",
						enabled: true,
					},
				},
				math: {
					name: "math",
					description:
						"Perform basic arithmetic operations. Useful for testing parameter validation and error handling.",
					inputSchema: {
						type: "object",
						properties: {
							operation: {
								type: "string",
								enum: ["add", "subtract", "multiply", "divide"],
							},
							a: { type: "number" },
							b: { type: "number" },
						},
						required: ["operation", "a", "b"],
						shape: {
							operation: {},
							a: {},
							b: {},
						},
					},
					outputSchema: undefined,
					callback: vi.fn(),
					metadata: {
						name: "math",
						description: "Perform basic arithmetic operations",
						enabled: true,
					},
				},
				status: {
					name: "status",
					description:
						"Get server status and information. Useful for testing tool discovery and introspection.",
					inputSchema: {
						type: "object",
						properties: {
							includeTimestamp: { type: "boolean" },
							format: { type: "string", enum: ["json", "text"] },
						},
						shape: {
							includeTimestamp: {},
							format: {},
						},
					},
					outputSchema: undefined,
					callback: vi.fn(),
					metadata: {
						name: "status",
						description: "Get server status and information",
						enabled: true,
					},
				},
				validate: {
					name: "validate",
					description:
						"Test parameter validation with various constraints. Useful for testing error handling.",
					inputSchema: {
						type: "object",
						properties: {
							value: { type: "string" },
							type: {
								type: "string",
								enum: ["email", "url", "uuid", "number"],
							},
							strict: { type: "boolean" },
						},
						required: ["value", "type"],
						shape: {
							value: {},
							type: {},
							strict: {},
						},
					},
					outputSchema: undefined,
					callback: vi.fn(),
					metadata: {
						name: "validate",
						description: "Test parameter validation with various constraints",
						enabled: true,
					},
				},
			};
			return tools[toolName as keyof typeof tools] || tools.echo;
		});

		// Mock tool execution for testing service tools
		mockServer.callTool = vi
			.fn()
			.mockImplementation(
				async (toolName: string, params: Record<string, unknown>) => {
					switch (toolName) {
						case "echo":
							return {
								content: [
									{
										type: "text",
										text: JSON.stringify({
											echo: params.message || "Hello from testing service!",
											timestamp: new Date().toISOString(),
											metadata: params.metadata || null,
										}),
									},
								],
							};

						case "math": {
							const operation = params.operation as string;
							const a = params.a as number;
							const b = params.b as number;
							let result: number;
							switch (operation) {
								case "add":
									result = a + b;
									break;
								case "subtract":
									result = a - b;
									break;
								case "multiply":
									result = a * b;
									break;
								case "divide":
									if (b === 0)
										throw new Error("Division by zero is not allowed");
									result = a / b;
									break;
								default:
									throw new Error(`Unknown operation: ${operation}`);
							}
							return {
								content: [
									{
										type: "text",
										text: JSON.stringify({
											operation,
											a,
											b,
											result,
											timestamp: new Date().toISOString(),
										}),
									},
								],
							};
						}

						case "status":
							return {
								content: [
									{
										type: "text",
										text: JSON.stringify({
											service: "testing",
											version: "1.0.0",
											status: "healthy",
											tools: ["echo", "math", "status", "validate"],
											...(params.includeTimestamp !== false && {
												timestamp: new Date().toISOString(),
											}),
										}),
									},
								],
							};

						case "validate":
							return {
								content: [
									{
										type: "text",
										text: JSON.stringify({
											value: params.value,
											type: params.type,
											strict: params.strict || false,
											isValid: true, // Simplified for testing
											reason: "Mock validation passed",
											timestamp: new Date().toISOString(),
										}),
									},
								],
							};

						default:
							throw new Error(`Unknown tool: ${toolName}`);
					}
				},
			);

		// Mock getToolInfo for testing service tools
		mockServer.getToolInfo = vi.fn().mockImplementation((toolName: string) => {
			const metadata = mockServer
				.getToolsMetadata()
				.find((tool) => tool.name === toolName);
			if (!metadata) {
				throw new Error(`Tool "${toolName}" not found`);
			}
			return {
				name: toolName,
				description: metadata.description,
				inputSchema: metadata.inputSchema,
				outputSchema: metadata.outputSchema,
				callback: vi.fn(),
				metadata,
			};
		});

		return mockServer;
	};

/**
 * Mock HTTP request/response for testing
 */
export const createMockHttpContext = () => ({
	request: {
		method: "POST",
		url: "/mcp",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			method: "tools/list",
			id: 1,
		}),
		raw: {
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "tools/list",
				id: 1,
			}),
		},
	},
	response: {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
		setHeader: vi.fn().mockReturnThis(),
	},
});

/**
 * Mock console methods for testing
 */
export const mockConsole = () => {
	const mocks = {
		log: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	};

	const originalConsole = { ...console };

	// Replace console methods
	console.log = mocks.log;
	console.error = mocks.error;
	console.warn = mocks.warn;
	console.info = mocks.info;
	console.debug = mocks.debug;

	return {
		mocks,
		restore: () => {
			Object.assign(console, originalConsole);
		},
	};
};

/**
 * Mock process.exit for testing
 */
export const mockProcessExit = () => {
	const mockExit = vi.fn();
	const originalExit = process.exit;

	// Replace process.exit
	process.exit = mockExit as never;

	return {
		mockExit,
		restore: () => {
			process.exit = originalExit;
		},
	};
};

/**
 * Create a mock database connection that can be used in tests
 */
export const createMockDatabase = () => {
	return {
		// Mock database operations
		query: vi.fn().mockResolvedValue({ rows: [] }),
		end: vi.fn().mockResolvedValue(undefined),
		connect: vi.fn().mockResolvedValue(undefined),
	};
};
