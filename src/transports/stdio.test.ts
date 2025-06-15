import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createMockConfig, createMockServer } from "../test-utils/mocks.js";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
	StdioServerTransport: vi.fn().mockImplementation(() => ({
		start: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
	})),
}));

// Use vi.hoisted to declare the mock logger before it's used in the mock factory
const mockLogger = vi.hoisted(() => ({
	info: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(),
}));

vi.mock("../utils/config.js", async () => {
	const actual = await vi.importActual("../utils/config.js");
	return {
		...actual,
		logger: mockLogger,
	};
});

// Import after mocking
import { startStdioServer } from "./stdio.js";

describe("Stdio Transport", () => {
	let mockServer: ReturnType<typeof createMockServer>;

	beforeEach(() => {
		mockServer = createMockServer();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("Server Connection", () => {
		test("should connect server to stdio transport", async () => {
			const config = createMockConfig({
				server: {
					name: "test-server",
					version: "1.0.0",
					port: 3000,
					host: "localhost",
				},
				log: {
					level: "debug",
				},
			});

			await startStdioServer(mockServer, config);

			expect(mockServer.connect).toHaveBeenCalled();
		});

		test("should log server startup information", async () => {
			const config = createMockConfig({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					port: 3000,
					host: "localhost",
				},
				log: {
					level: "debug",
				},
			});

			await startStdioServer(mockServer, config);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"Starting MCP server with stdio transport",
				{
					serverName: "todo-mcp",
					version: "0.2.0",
					service: "todo",
				},
			);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"MCP server connected via stdio transport",
			);
		});

		test("should handle connection errors", async () => {
			const config = createMockConfig();

			// Mock server connect to throw an error
			mockServer.connect = vi
				.fn()
				.mockRejectedValue(new Error("Connection failed"));

			await expect(startStdioServer(mockServer, config)).rejects.toThrow(
				"Connection failed",
			);
		});
	});

	describe("Transport Creation", () => {
		test("should create StdioServerTransport with correct parameters", async () => {
			const config = createMockConfig();

			const { StdioServerTransport } = await import(
				"@modelcontextprotocol/sdk/server/stdio.js"
			);

			await startStdioServer(mockServer, config);

			expect(StdioServerTransport).toHaveBeenCalledWith();
		});

		test("should pass server config to logger", async () => {
			const config = createMockConfig({
				server: {
					name: "custom-server",
					version: "1.2.3",
					port: 8080,
					host: "0.0.0.0",
				},
			});

			await startStdioServer(mockServer, config);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				"Starting MCP server with stdio transport",
				{
					serverName: "custom-server",
					version: "1.2.3",
					service: "todo",
				},
			);
		});
	});
});
