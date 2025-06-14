import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ApplicationConfig } from "../utils/config.js";
import type { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

// Mock the Hono server and related dependencies
const mockApp = {
	use: vi.fn().mockReturnThis(),
	post: vi.fn().mockReturnThis(),
	get: vi.fn().mockReturnThis(),
	on: vi.fn().mockReturnThis(),
	onError: vi.fn().mockReturnThis(),
	fetch: vi.fn(),
};

const mockServe = vi.fn().mockResolvedValue({
	close: vi.fn(),
	port: 3000,
});

const mockLogger = {
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
};

// Mock external dependencies
vi.mock("@hono/node-server", () => ({
	serve: mockServe,
}));

vi.mock("hono", () => ({
	Hono: vi.fn().mockImplementation(() => mockApp),
}));

vi.mock("hono/cors", () => ({
	cors: vi.fn().mockReturnValue("cors-middleware"),
}));

vi.mock("hono/logger", () => ({
	logger: vi.fn().mockReturnValue("logger-middleware"),
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
	StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
		handleRequest: vi.fn().mockResolvedValue(undefined),
		close: vi.fn(),
	})),
}));

vi.mock("../utils/config.js", () => ({
	logger: mockLogger,
}));

describe("HTTP Transport", () => {
	let mockServer: ExtendedMcpServer;
	let mockConfig: ApplicationConfig;

	beforeEach(() => {
		vi.clearAllMocks();

		mockServer = {
			connect: vi.fn().mockResolvedValue(undefined),
		} as unknown as ExtendedMcpServer;

		mockConfig = {
			server: {
				name: "test-server",
				version: "1.0.0",
				host: "localhost",
				port: 3000,
			},
		} as ApplicationConfig;
	});

	test("should start HTTP server with correct configuration", async () => {
		const { startHttpServer } = await import("./http.js");

		const result = await startHttpServer(mockServer, mockConfig);

		expect(mockLogger.info).toHaveBeenCalledWith(
			"Starting MCP server with HTTP transport",
			expect.objectContaining({
				host: "localhost",
				port: 3000,
				serverName: "test-server",
				version: "1.0.0",
				service: "todo",
			}),
		);

		expect(mockServe).toHaveBeenCalledWith({
			fetch: mockApp.fetch,
			port: 3000,
			hostname: "localhost",
		});

		expect(result).toBeDefined();
	});

	test("should configure middleware correctly", async () => {
		const { cors } = await import("hono/cors");
		const { logger } = await import("hono/logger");
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(cors).toHaveBeenCalled();
		expect(logger).toHaveBeenCalled();
		expect(mockApp.use).toHaveBeenCalledWith("*", "cors-middleware");
		expect(mockApp.use).toHaveBeenCalledWith("*", "logger-middleware");
	});

	test("should register POST endpoint for MCP communication", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(mockApp.post).toHaveBeenCalledWith("/", expect.any(Function));
	});

	test("should register health check endpoint", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(mockApp.get).toHaveBeenCalledWith("/health", expect.any(Function));
	});

	test("should register root info endpoint", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(mockApp.get).toHaveBeenCalledWith("/", expect.any(Function));
	});

	test("should register unsupported methods handler", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(mockApp.on).toHaveBeenCalledWith(
			["GET", "DELETE", "PUT", "PATCH"],
			"*",
			expect.any(Function),
		);
	});

	test("should register global error handler", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(mockApp.onError).toHaveBeenCalledWith(expect.any(Function));
	});

	test("should handle MCP POST request successfully", async () => {
		const { startHttpServer } = await import("./http.js");
		const { StreamableHTTPServerTransport } = await import(
			"@modelcontextprotocol/sdk/server/streamableHttp.js"
		);

		await startHttpServer(mockServer, mockConfig);

		// Get the POST handler
		const postCall = mockApp.post.mock.calls.find((call) => call[0] === "/");
		const postHandler = postCall?.[1];

		// Mock Hono context
		const mockContext = {
			req: {
				json: vi.fn().mockResolvedValue({ id: 1, method: "test" }),
				raw: { headers: {}, method: "POST" },
			},
			json: vi.fn().mockResolvedValue({
				jsonrpc: "2.0",
				result: "Request processed",
				id: 1,
			}),
		};

		await postHandler(mockContext);

		expect(StreamableHTTPServerTransport).toHaveBeenCalled();
		expect(mockServer.connect).toHaveBeenCalled();
		expect(mockContext.json).toHaveBeenCalledWith({
			jsonrpc: "2.0",
			result: "Request processed",
			id: 1,
		});
	});

	test("should handle MCP POST request with error", async () => {
		const { startHttpServer } = await import("./http.js");

		// Make server.connect throw an error
		mockServer.connect = vi
			.fn()
			.mockRejectedValue(new Error("Connection failed"));

		await startHttpServer(mockServer, mockConfig);

		// Get the POST handler
		const postCall = mockApp.post.mock.calls.find((call) => call[0] === "/");
		const postHandler = postCall?.[1];

		// Mock Hono context
		const mockContext = {
			req: {
				json: vi.fn().mockResolvedValue({ id: 1, method: "test" }),
				raw: { headers: {}, method: "POST" },
			},
			json: vi.fn().mockResolvedValue({
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: "Internal server error",
					data: "Connection failed",
				},
				id: null,
			}),
		};

		await postHandler(mockContext);

		expect(mockLogger.error).toHaveBeenCalledWith(
			"MCP request error",
			expect.objectContaining({
				error: "Connection failed",
			}),
		);

		expect(mockContext.json).toHaveBeenCalledWith(
			{
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: "Internal server error",
					data: "Connection failed",
				},
				id: null,
			},
			500,
		);
	});

	test("should handle health check request", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		// Get the health check handler
		const healthCall = mockApp.get.mock.calls.find(
			(call) => call[0] === "/health",
		);
		const healthHandler = healthCall?.[1];

		// Mock Hono context
		const mockContext = {
			json: vi.fn().mockResolvedValue({
				status: "ok",
				service: "test-server",
				version: "1.0.0",
				transport: "StreamableHTTP",
				serviceType: "todo",
				timestamp: expect.any(String),
			}),
		};

		await healthHandler(mockContext);

		expect(mockContext.json).toHaveBeenCalledWith({
			status: "ok",
			service: "test-server",
			version: "1.0.0",
			transport: "StreamableHTTP",
			serviceType: "todo",
			timestamp: expect.any(String),
		});
	});

	test("should handle root info request", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		// Get the root handler
		const rootCall = mockApp.get.mock.calls.find((call) => call[0] === "/");
		const rootHandler = rootCall?.[1];

		// Mock Hono context
		const mockContext = {
			json: vi.fn(),
		};

		await rootHandler(mockContext);

		expect(mockContext.json).toHaveBeenCalledWith({
			name: "test-server",
			version: "1.0.0",
			description: "Todo MCP server with HTTP streaming transport",
			transport: "StreamableHTTPServerTransport",
			serviceType: "todo",
			endpoints: {
				mcp: "POST /",
				health: "GET /health",
			},
			usage: expect.objectContaining({
				description: expect.any(String),
				example: expect.any(Object),
			}),
			timestamp: expect.any(String),
		});
	});

	test("should handle unsupported methods", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		// Get the unsupported methods handler
		const unsupportedCall = mockApp.on.mock.calls.find(
			(call) => Array.isArray(call[0]) && call[0].includes("DELETE"),
		);
		const unsupportedHandler = unsupportedCall?.[2];

		// Mock Hono context
		const mockContext = {
			json: vi.fn(),
		};

		await unsupportedHandler(mockContext);

		expect(mockContext.json).toHaveBeenCalledWith(
			{
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: "Method not allowed. Use POST for MCP communication.",
				},
				id: null,
			},
			405,
		);
	});

	test("should handle global errors", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		// Get the error handler
		const errorHandler = mockApp.onError.mock.calls[0][0];

		// Mock error and context
		const mockError = new Error("Test error");
		const mockContext = {
			json: vi.fn(),
		};

		await errorHandler(mockError, mockContext);

		expect(mockLogger.error).toHaveBeenCalledWith("HTTP server error", {
			error: "Test error",
		});

		expect(mockContext.json).toHaveBeenCalledWith(
			{
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: "Internal server error",
					data: "Test error",
				},
				id: null,
			},
			500,
		);
	});

	test("should log server startup information", async () => {
		const { startHttpServer } = await import("./http.js");

		await startHttpServer(mockServer, mockConfig);

		expect(mockLogger.info).toHaveBeenCalledWith(
			"🚀 Todo MCP HTTP Server starting on http://localhost:3000",
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"📋 Mode: MCP over HTTP (StreamableHTTP Transport)",
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"🔗 MCP Endpoint: http://localhost:3000/ (POST)",
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"❤️  Health Check: http://localhost:3000/health",
		);
		expect(mockLogger.info).toHaveBeenCalledWith(
			"📖 Usage Info: http://localhost:3000/ (GET)",
		);
	});
});
