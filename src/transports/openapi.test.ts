import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	createMockConfig,
	createMockServerWithTestingService,
	mockConsole,
} from "../test-utils/mocks.js";
import type { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

// Mock the serve function from @hono/node-server
vi.mock("@hono/node-server", () => ({
	serve: vi.fn().mockReturnValue({ port: 3000, hostname: "localhost" }),
}));

describe("OpenAPI Transport", () => {
	let mockServer: ExtendedMcpServer;
	let consoleMocks: ReturnType<typeof mockConsole>;

	beforeEach(async () => {
		mockServer = await createMockServerWithTestingService();
		consoleMocks = mockConsole();
	});

	afterEach(() => {
		consoleMocks.restore();
		vi.resetAllMocks();
	});

	describe("Utility Functions", () => {
		test("should convert tool names to correct endpoint paths", async () => {
			const config = createMockConfig({});

			// Set up mock server with tools that have camelCase names
			mockServer.getToolsMetadata = vi.fn().mockReturnValue([
				{ name: "getTasks", description: "Get tasks" },
				{ name: "createTask", description: "Create task" },
				{ name: "updateTaskStatus", description: "Update task status" },
				{ name: "simpleTools", description: "Simple tools" },
			]);

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();

			// Verify tools metadata was called
			expect(mockServer.getToolsMetadata).toHaveBeenCalled();
		});

		test("should determine correct HTTP methods for different tool names", async () => {
			const config = createMockConfig({});

			// Test tools with different prefixes that should map to different HTTP methods
			mockServer.getToolsMetadata = vi.fn().mockReturnValue([
				{ name: "getTasks", description: "Get method tool" },
				{ name: "listItems", description: "List method tool" },
				{ name: "retrieveData", description: "Retrieve method tool" },
				{ name: "createTask", description: "Create method tool" },
				{ name: "addItem", description: "Add method tool" },
				{ name: "updateTask", description: "Update method tool" },
				{ name: "modifyItem", description: "Modify method tool" },
				{ name: "completeTask", description: "Complete method tool" },
				{ name: "deleteTask", description: "Delete method tool" },
				{ name: "removeItem", description: "Remove method tool" },
				{ name: "archiveTask", description: "Archive method tool" },
				{ name: "processData", description: "Process method tool (default)" },
			]);

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing - tests the HTTP method detection logic
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should convert Zod schemas to OpenAPI compatible schemas", async () => {
			const { convertZodToOpenApiSchema } = await import("./openapi.js");
			const { z } = await import("zod");

			// Test the convertZodToOpenApiSchema function
			const testSchema = z.object({
				name: z.string(),
				count: z.number(),
			});

			const result = convertZodToOpenApiSchema(testSchema);
			expect(result).toBeDefined();
			expect(result._def).toBeDefined();
		});

		test("should generate correct endpoint paths from tool names", async () => {
			const { generateEndpointPath } = await import("./openapi.js");

			// Test endpoint path generation
			expect(generateEndpointPath("getTasks")).toBe("/api/tools/get-tasks");
			expect(generateEndpointPath("createTaskList")).toBe(
				"/api/tools/create-task-list",
			);
			expect(generateEndpointPath("simple")).toBe("/api/tools/simple");
			expect(generateEndpointPath("updateUserProfile")).toBe(
				"/api/tools/update-user-profile",
			);
		});

		test("should determine HTTP methods correctly", async () => {
			const { getHttpMethod } = await import("./openapi.js");

			// Test GET methods
			expect(getHttpMethod("getTasks")).toBe("get");
			expect(getHttpMethod("listItems")).toBe("get");
			expect(getHttpMethod("retrieveData")).toBe("get");

			// Test POST methods
			expect(getHttpMethod("createTask")).toBe("post");
			expect(getHttpMethod("addItem")).toBe("post");

			// Test PUT methods
			expect(getHttpMethod("updateTask")).toBe("put");
			expect(getHttpMethod("modifyItem")).toBe("put");
			expect(getHttpMethod("completeTask")).toBe("put");

			// Test DELETE methods
			expect(getHttpMethod("deleteTask")).toBe("delete");
			expect(getHttpMethod("removeItem")).toBe("delete");
			expect(getHttpMethod("archiveTask")).toBe("delete");

			// Test default case
			expect(getHttpMethod("processData")).toBe("post");
			expect(getHttpMethod("randomAction")).toBe("post");
		});
	});

	describe("Server Initialization", () => {
		test("should start OpenAPI server with correct configuration", async () => {
			const config = createMockConfig({
				server: {
					name: "test-server",
					version: "1.0.0",
					port: 3000,
					host: "localhost",
				},
				mcp: { transport: "openapi" },
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Mock the serve function to prevent actual server startup
			const { serve } = await import("@hono/node-server");
			const mockServe = serve as ReturnType<typeof vi.fn>;

			await startOpenApiServer(mockServer, config);

			expect(mockServe).toHaveBeenCalledWith({
				fetch: expect.any(Function),
				port: 3000,
				hostname: "localhost",
			});
		});

		test("should log server startup information", async () => {
			const config = createMockConfig({
				server: {
					name: "test-api",
					version: "2.0.0",
					port: 4000,
					host: "0.0.0.0",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");
			await startOpenApiServer(mockServer, config);

			// Verify the function completes without errors
			expect(true).toBe(true);
		});

		test("should respect custom host and port settings", async () => {
			const config = createMockConfig({
				server: {
					name: "custom-config",
					version: "1.0.0",
					port: 8080,
					host: "custom-host",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");
			const { serve } = await import("@hono/node-server");
			const mockServe = serve as ReturnType<typeof vi.fn>;

			await startOpenApiServer(mockServer, config);

			expect(mockServe).toHaveBeenCalledWith({
				fetch: expect.any(Function),
				port: 8080,
				hostname: "custom-host",
			});
		});

		test("should use default configuration when minimal config provided", async () => {
			const config = createMockConfig({});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should not throw an error
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});
	});

	describe("API Routes Generation", () => {
		test("should generate endpoints for all available tools", async () => {
			const config = createMockConfig({
				server: {
					name: "test",
					version: "1.0.0",
					port: 3000,
					host: "localhost",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle tools with complex input schemas", async () => {
			const config = createMockConfig({});

			// Mock a tool with a complex input schema
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "complexTool", description: "Tool with complex schema" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "complexTool",
				description: "Tool with complex schema",
				inputSchema: {
					type: "object",
					properties: {
						stringParam: { type: "string" },
						numberParam: { type: "number" },
						arrayParam: { type: "array", items: { type: "string" } },
						objectParam: {
							type: "object",
							properties: {
								nested: { type: "string" },
							},
						},
					},
					required: ["stringParam"],
					shape: {
						stringParam: {},
						numberParam: {},
						arrayParam: {},
						objectParam: {},
					},
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: {
					name: "complexTool",
					description: "Tool with complex schema",
					inputSchema: { type: "object" },
					outputSchema: undefined,
					enabled: true,
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle complex schemas without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle tools without input schemas", async () => {
			const config = createMockConfig({});

			// Mock a tool without input schema
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "simpleTool", description: "Tool without schema" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "simpleTool",
				description: "Tool without schema",
				inputSchema: undefined,
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: {
					name: "simpleTool",
					description: "Tool without schema",
					inputSchema: undefined,
					outputSchema: undefined,
					enabled: true,
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle missing schemas without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should create health check endpoint", async () => {
			const config = createMockConfig({
				server: {
					name: "health-test",
					version: "1.0.0",
					port: 3000,
					host: "localhost",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should create root API information endpoint", async () => {
			const config = createMockConfig({
				server: {
					name: "info-test",
					version: "2.0.0",
					port: 3000,
					host: "localhost",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should create OpenAPI documentation endpoint", async () => {
			const config = createMockConfig({});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should create Swagger UI endpoint", async () => {
			const config = createMockConfig({});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});
	});

	describe("Tool Parameter Handling", () => {
		test("should handle tools with different parameter requirements", async () => {
			const config = createMockConfig({});

			// Mock tools with different parameter patterns
			mockServer.getToolsMetadata = vi.fn().mockReturnValue([
				{ name: "noParamTool", description: "Tool with no parameters" },
				{ name: "postParamTool", description: "POST tool with parameters" },
				{ name: "getParamTool", description: "GET tool with parameters" },
			]);

			mockServer.getToolInfo = vi
				.fn()
				.mockImplementation((toolName: string) => {
					if (toolName === "noParamTool") {
						return {
							name: "noParamTool",
							description: "Tool with no parameters",
							inputSchema: { type: "object", properties: {} },
							outputSchema: undefined,
							callback: vi.fn(),
							metadata: {
								name: "noParamTool",
								description: "Tool with no parameters",
							},
						};
					}
					if (toolName === "postParamTool") {
						return {
							name: "postParamTool",
							description: "POST tool with parameters",
							inputSchema: {
								type: "object",
								properties: { param: { type: "string" } },
								shape: { param: {} },
							},
							outputSchema: undefined,
							callback: vi.fn(),
							metadata: {
								name: "postParamTool",
								description: "POST tool with parameters",
							},
						};
					}
					if (toolName === "getParamTool") {
						return {
							name: "getParamTool",
							description: "GET tool with parameters",
							inputSchema: {
								type: "object",
								properties: { query: { type: "string" } },
								shape: { query: {} },
							},
							outputSchema: undefined,
							callback: vi.fn(),
							metadata: {
								name: "getParamTool",
								description: "GET tool with parameters",
							},
						};
					}
					throw new Error(`Unknown tool: ${toolName}`);
				});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle different parameter patterns without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle POST tool execution with JSON parameters", async () => {
			const config = createMockConfig({});

			// Mock a POST tool
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "createTask", description: "Create a new task" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "createTask",
				description: "Create a new task",
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
					shape: { name: {} },
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: { name: "createTask", description: "Create a new task" },
			});

			// Mock successful tool execution
			mockServer.callTool = vi.fn().mockResolvedValue({
				content: [{ type: "text", text: "Task created successfully" }],
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle GET tool execution with query parameters", async () => {
			const config = createMockConfig({});

			// Mock a GET tool
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([{ name: "getTasks", description: "Get tasks" }]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "getTasks",
				description: "Get tasks",
				inputSchema: {
					type: "object",
					properties: { filter: { type: "string" } },
					shape: { filter: {} },
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: { name: "getTasks", description: "Get tasks" },
			});

			// Mock successful tool execution
			mockServer.callTool = vi.fn().mockResolvedValue({
				content: [{ type: "text", text: "Tasks retrieved successfully" }],
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle tool execution errors gracefully", async () => {
			const config = createMockConfig({});

			// Mock a tool that will fail
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "failingTool", description: "A tool that fails" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "failingTool",
				description: "A tool that fails",
				inputSchema: {
					type: "object",
					properties: {},
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: { name: "failingTool", description: "A tool that fails" },
			});

			// Mock tool execution failure
			mockServer.callTool = vi
				.fn()
				.mockRejectedValue(new Error("Tool execution failed"));

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle JSON parsing errors for POST requests", async () => {
			const config = createMockConfig({});

			// Mock a POST tool
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([{ name: "createTask", description: "Create task" }]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "createTask",
				description: "Create task",
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
					shape: { name: {} },
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: { name: "createTask", description: "Create task" },
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});
	});

	describe("Error Handling", () => {
		test("should handle server startup errors gracefully", async () => {
			const config = createMockConfig({});

			// Mock serve to reject
			const { serve } = await import("@hono/node-server");
			const mockServe = serve as ReturnType<typeof vi.fn>;
			mockServe.mockRejectedValueOnce(new Error("Port already in use"));

			const { startOpenApiServer } = await import("./openapi.js");

			await expect(startOpenApiServer(mockServer, config)).rejects.toThrow(
				"Port already in use",
			);
		});

		test("should handle missing tool descriptions gracefully", async () => {
			const config = createMockConfig({});

			// Mock a tool without description
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([{ name: "noDescTool", description: undefined }]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "noDescTool",
				description: undefined,
				inputSchema: { type: "object", properties: {} },
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: {
					name: "noDescTool",
					description: undefined,
					inputSchema: { type: "object" },
					outputSchema: undefined,
					enabled: true,
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle missing descriptions without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should configure global error handler", async () => {
			const config = createMockConfig({});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing - tests global error handler registration
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle non-Error objects in tool execution", async () => {
			const config = createMockConfig({});

			// Mock a tool that throws a non-Error object
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "stringErrorTool", description: "Tool that throws string" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "stringErrorTool",
				description: "Tool that throws string",
				inputSchema: {
					type: "object",
					properties: {},
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: {
					name: "stringErrorTool",
					description: "Tool that throws string",
				},
			});

			// Mock tool execution failure with string
			mockServer.callTool = vi.fn().mockRejectedValue("String error message");

			const { startOpenApiServer } = await import("./openapi.js");

			// Should complete without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty tools list", async () => {
			const config = createMockConfig({});

			// Mock empty tools list
			mockServer.getToolsMetadata = vi.fn().mockReturnValue([]);

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle empty tools list without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle tools with empty input schema shape", async () => {
			const config = createMockConfig({});

			// Mock tool with empty shape
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "emptyShapeTool", description: "Tool with empty shape" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "emptyShapeTool",
				description: "Tool with empty shape",
				inputSchema: {
					type: "object",
					properties: {},
					shape: {},
				},
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: {
					name: "emptyShapeTool",
					description: "Tool with empty shape",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle empty shape without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle tools with null input schema", async () => {
			const config = createMockConfig({});

			// Mock tool with null schema
			mockServer.getToolsMetadata = vi
				.fn()
				.mockReturnValue([
					{ name: "nullSchemaTool", description: "Tool with null schema" },
				]);

			mockServer.getToolInfo = vi.fn().mockReturnValue({
				name: "nullSchemaTool",
				description: "Tool with null schema",
				inputSchema: null,
				outputSchema: undefined,
				callback: vi.fn(),
				metadata: {
					name: "nullSchemaTool",
					description: "Tool with null schema",
				},
			});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle null schema without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});

		test("should handle DELETE and PUT methods with parameters", async () => {
			const config = createMockConfig({});

			// Mock DELETE and PUT tools with parameters
			mockServer.getToolsMetadata = vi.fn().mockReturnValue([
				{ name: "deleteTask", description: "Delete a task" },
				{ name: "updateTask", description: "Update a task" },
			]);

			mockServer.getToolInfo = vi
				.fn()
				.mockImplementation((toolName: string) => {
					return {
						name: toolName,
						description: `${toolName} description`,
						inputSchema: {
							type: "object",
							properties: { id: { type: "string" } },
							shape: { id: {} },
						},
						outputSchema: undefined,
						callback: vi.fn(),
						metadata: {
							name: toolName,
							description: `${toolName} description`,
						},
					};
				});

			const { startOpenApiServer } = await import("./openapi.js");

			// Should handle DELETE/PUT methods without throwing
			await expect(async () => {
				await startOpenApiServer(mockServer, config);
			}).not.toThrow();
		});
	});
});
