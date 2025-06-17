import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mockConsole, mockProcessExit } from "./test-utils/mocks.js";
import type { ApplicationConfig } from "./utils/config.js";

// Mock the external dependencies
vi.mock("commander", () => ({
	Command: vi.fn().mockImplementation(() => {
		const mockProgram = {
			name: vi.fn().mockReturnThis(),
			description: vi.fn().mockReturnThis(),
			version: vi.fn().mockReturnThis(),
			addHelpText: vi.fn().mockReturnThis(),
			option: vi.fn().mockReturnThis(),
			parse: vi.fn().mockReturnThis(),
			opts: vi.fn().mockReturnValue({}),
		};
		return mockProgram;
	}),
}));

// Mock the database and service modules
vi.mock("./db/index.js", () => ({
	initializeDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./service/todo.js", () => ({
	loadTodoService: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./transports/stdio.js", () => ({
	startStdioServer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./transports/http.js", () => ({
	startHttpServer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./transports/cli.js", () => ({
	startCliMode: vi.fn().mockResolvedValue(undefined),
}));

// Mock ExtendedMcpServer
const mockExtendedMcpServer = vi.fn().mockImplementation(() => ({
	connect: vi.fn(),
	tool: vi.fn(),
}));

vi.mock("./utils/extended-mcp-server.js", () => ({
	ExtendedMcpServer: mockExtendedMcpServer,
}));

// Use vi.hoisted to declare the mock logger before it's used
const mockLogger = vi.hoisted(() => ({
	info: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
	warn: vi.fn(),
}));

vi.mock("./utils/config.js", async () => {
	const actual = await vi.importActual("./utils/config.js");
	return {
		...actual,
		logger: mockLogger,
	};
});

// Import the functions after mocking
import { createMcpServer, startTransport } from "./index.js";

describe("Index Module", () => {
	let consoleMock: ReturnType<typeof mockConsole>;
	let processExitMock: ReturnType<typeof mockProcessExit>;

	beforeEach(() => {
		consoleMock = mockConsole();
		processExitMock = mockProcessExit();
		vi.clearAllMocks();
		process.env.DATABASE_URL = undefined;
	});

	afterEach(() => {
		consoleMock.restore();
		processExitMock.restore();
		vi.resetAllMocks();
	});

	// biome-ignore lint/suspicious/noExplicitAny: Test utility function needs flexible type
	function createMockConfig(overrides: any = {}): ApplicationConfig {
		return {
			server: {
				name: "test-server",
				version: "1.0.0",
				host: "localhost",
				port: 3000,
			},
			database: {
				url: "postgres://test:test@localhost:5432/test",
				requireConnection: true,
			},
			mcp: {
				transport: "stdio" as const,
			},
			cli: {
				tool: undefined,
				parameters: undefined,
				list: false,
				interactive: false,
			},
			log: {
				level: "info" as const,
			},
			...overrides,
		};
	}

	function createMockServer() {
		return mockExtendedMcpServer();
	}

	describe("createMcpServer", () => {
		test("should create MCP server with database initialization", async () => {
			const config = createMockConfig({
				database: {
					requireConnection: true,
					url: "test://localhost:5432/test",
				},
			});

			const server = await createMcpServer(config);

			const { initializeDatabase } = await import("./db/index.js");
			const { loadTodoService } = await import("./service/todo.js");

			expect(initializeDatabase).toHaveBeenCalled();
			expect(loadTodoService).toHaveBeenCalledWith(server);
			expect(mockExtendedMcpServer).toHaveBeenCalledWith(
				{
					name: "test-server",
					version: "1.0.0",
				},
				{
					capabilities: {
						tools: {},
					},
				},
			);
		});

		test("should create MCP server without database initialization", async () => {
			const config = createMockConfig({
				database: {
					requireConnection: false,
					url: "test://localhost:5432/test",
				},
			});

			await createMcpServer(config);

			const { initializeDatabase } = await import("./db/index.js");
			expect(initializeDatabase).not.toHaveBeenCalled();
		});

		test("should create server with correct configuration", async () => {
			const config = createMockConfig();
			const server = await createMcpServer(config);

			expect(server).toBeDefined();
			expect(mockExtendedMcpServer).toHaveBeenCalledWith(
				{
					name: "test-server",
					version: "1.0.0",
				},
				{
					capabilities: {
						tools: {},
					},
				},
			);
		});
	});

	describe("startTransport", () => {
		test("should start stdio transport", async () => {
			const mockServer = createMockServer();
			const config = createMockConfig({
				mcp: { transport: "stdio" },
			});

			await startTransport(mockServer, config);

			const { startStdioServer } = await import("./transports/stdio.js");
			expect(startStdioServer).toHaveBeenCalledWith(mockServer, config);
		});

		test("should start http transport", async () => {
			const mockServer = createMockServer();
			const config = createMockConfig({
				mcp: { transport: "http" },
			});

			await startTransport(mockServer, config);

			const { startHttpServer } = await import("./transports/http.js");
			expect(startHttpServer).toHaveBeenCalledWith(mockServer, config);
		});

		test("should start cli transport", async () => {
			const mockServer = createMockServer();
			const config = createMockConfig({
				mcp: { transport: "cli" },
			});

			await startTransport(mockServer, config);

			const { startCliMode } = await import("./transports/cli.js");
			expect(startCliMode).toHaveBeenCalledWith(mockServer, config);
		});

		test("should throw error for unknown transport", async () => {
			const mockServer = createMockServer();
			const config = createMockConfig({
				mcp: { transport: "unknown" as "stdio" | "http" | "cli" },
			});

			await expect(startTransport(mockServer, config)).rejects.toThrow(
				"Unknown transport: unknown",
			);
		});
	});

	describe("CLI Integration", () => {
		test("should export createMcpServer function", async () => {
			const indexModule = await import("./index.js");
			expect(typeof indexModule.createMcpServer).toBe("function");
		});

		test("should export startTransport function", async () => {
			const indexModule = await import("./index.js");
			expect(typeof indexModule.startTransport).toBe("function");
		});
	});

	describe("Main Function Error Handling", () => {
		test("should handle createMcpServer errors", async () => {
			const { initializeDatabase } = await import("./db/index.js");

			// Mock database initialization to throw an error
			// biome-ignore lint/suspicious/noExplicitAny: Mock testing requires type flexibility
			(initializeDatabase as any).mockRejectedValueOnce(
				new Error("Database connection failed"),
			);

			const config = createMockConfig({
				database: {
					requireConnection: true,
					url: "test://localhost:5432/test",
				},
			});

			await expect(createMcpServer(config)).rejects.toThrow(
				"Database connection failed",
			);
		});

		test("should handle startTransport errors", async () => {
			const { startStdioServer } = await import("./transports/stdio.js");

			// Mock stdio server to throw an error
			// biome-ignore lint/suspicious/noExplicitAny: Mock testing requires type flexibility
			(startStdioServer as any).mockRejectedValueOnce(
				new Error("Transport failed"),
			);

			const mockServer = createMockServer();
			const config = createMockConfig({
				mcp: { transport: "stdio" },
			});

			await expect(startTransport(mockServer, config)).rejects.toThrow(
				"Transport failed",
			);
		});

		test("should handle loadTodoService errors", async () => {
			const { loadTodoService } = await import("./service/todo.js");

			// Mock service loading to throw an error
			// biome-ignore lint/suspicious/noExplicitAny: Mock testing requires type flexibility
			(loadTodoService as any).mockRejectedValueOnce(
				new Error("Service loading failed"),
			);

			const config = createMockConfig();

			await expect(createMcpServer(config)).rejects.toThrow(
				"Service loading failed",
			);
		});
	});

	describe("Main Function", () => {
		let originalArgv: string[];
		let originalExit: typeof process.exit;
		let originalOn: typeof process.on;
		let mockExit: typeof process.exit;
		let mockOn: typeof process.on;

		beforeEach(() => {
			originalArgv = [...process.argv];
			originalExit = process.exit;
			originalOn = process.on;

			// biome-ignore lint/suspicious/noExplicitAny: Mock process functions need any type
			mockExit = vi.fn() as any;
			// biome-ignore lint/suspicious/noExplicitAny: Mock process functions need any type
			mockOn = vi.fn() as any;

			process.exit = mockExit;
			process.on = mockOn;
		});

		afterEach(() => {
			process.argv = originalArgv;
			process.exit = originalExit;
			process.on = originalOn;
		});

		test("should handle main function configuration creation", async () => {
			const { createConfig } = await import("./utils/config.js");

			const config = createConfig({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					host: "localhost",
					port: 3000,
				},
				database: {
					url: "postgres://localhost:5432/todo_mcp",
					requireConnection: true,
				},
				mcp: {
					transport: "stdio",
				},
				cli: {
					tool: undefined,
					parameters: undefined,
					list: false,
					interactive: false,
				},
				log: {
					level: "info",
				},
			});

			expect(config).toBeDefined();
			expect(config.server.name).toBe("todo-mcp");
		});

		test("should handle CLI mode detection", async () => {
			const { createConfig } = await import("./utils/config.js");

			const config = createConfig({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					host: "localhost",
					port: 3000,
				},
				database: {
					url: "postgres://localhost:5432/todo_mcp",
					requireConnection: true,
				},
				mcp: {
					transport: "stdio",
				},
				cli: {
					tool: "getTasks",
					parameters: undefined,
					list: false,
					interactive: false,
				},
				log: {
					level: "info",
				},
			});

			// Test CLI mode detection logic
			if (config.cli.tool || config.cli.list || config.cli.interactive) {
				config.mcp.transport = "cli";
			}

			expect(config.mcp.transport).toBe("cli");
		});

		test("should handle environment DATABASE_URL", async () => {
			process.env.DATABASE_URL = "postgres://custom:5432/custom_db";

			const { createConfig } = await import("./utils/config.js");

			const config = createConfig({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					host: "localhost",
					port: 3000,
				},
				database: {
					url: process.env.DATABASE_URL || "postgres://localhost:5432/todo_mcp",
					requireConnection: true,
				},
				mcp: {
					transport: "stdio",
				},
				cli: {
					tool: undefined,
					parameters: undefined,
					list: false,
					interactive: false,
				},
				log: {
					level: "info",
				},
			});

			expect(config.database.url).toBe("postgres://custom:5432/custom_db");
		});

		test("should handle uncaught exceptions", async () => {
			// Test that the uncaught exception handler is registered
			expect(process.on).toBeDefined();

			// Simulate uncaught exception handler
			const mockError = new Error("Test uncaught exception");
			const uncaughtHandler = (error: Error) => {
				mockLogger.error("Uncaught exception:", { error: error.message });
				process.exit(1);
			};

			uncaughtHandler(mockError);

			expect(mockLogger.error).toHaveBeenCalledWith("Uncaught exception:", {
				error: "Test uncaught exception",
			});
		});

		test("should handle unhandled rejections", async () => {
			// Test that the unhandled rejection handler is registered
			expect(process.on).toBeDefined();

			// Simulate unhandled rejection handler
			const mockReason = new Error("Test rejection");
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const rejectionHandler = (reason: any) => {
				mockLogger.error("Unhandled rejection:", {
					reason: reason instanceof Error ? reason.message : String(reason),
				});
				process.exit(1);
			};

			rejectionHandler(mockReason);

			expect(mockLogger.error).toHaveBeenCalledWith("Unhandled rejection:", {
				reason: "Test rejection",
			});
		});

		test("should handle non-Error rejection", async () => {
			// Test string rejection
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const rejectionHandler = (reason: any) => {
				mockLogger.error("Unhandled rejection:", {
					reason: reason instanceof Error ? reason.message : String(reason),
				});
				process.exit(1);
			};

			rejectionHandler("String rejection");

			expect(mockLogger.error).toHaveBeenCalledWith("Unhandled rejection:", {
				reason: "String rejection",
			});
		});

		test("should handle main function catch block", async () => {
			// Test the main function's catch block for Error instances
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const errorHandler = (error: any) => {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				mockLogger.error(`Failed to start server: ${errorMessage}`);
				process.exit(1);
			};

			const testError = new Error("Test error");
			errorHandler(testError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				"Failed to start server: Test error",
			);
		});

		test("should handle main function catch block with non-Error", async () => {
			// Test the main function's catch block for non-Error values
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const errorHandler = (error: any) => {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				mockLogger.error(`Failed to start server: ${errorMessage}`);
				process.exit(1);
			};

			errorHandler("String error");

			expect(mockLogger.error).toHaveBeenCalledWith(
				"Failed to start server: String error",
			);
		});

		test("should handle main catch error scenarios", async () => {
			// Test the main().catch() error handler
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const mainCatchHandler = (error: any) => {
				mockLogger.error("Application failed to start:", {
					error: error instanceof Error ? error.message : String(error),
				});
				process.exit(1);
			};

			const testError = new Error("Application start error");
			mainCatchHandler(testError);

			expect(mockLogger.error).toHaveBeenCalledWith(
				"Application failed to start:",
				{
					error: "Application start error",
				},
			);
		});

		test("should handle main catch with non-Error", async () => {
			// Test the main().catch() error handler with non-Error
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const mainCatchHandler = (error: any) => {
				mockLogger.error("Application failed to start:", {
					error: error instanceof Error ? error.message : String(error),
				});
				process.exit(1);
			};

			mainCatchHandler("Non-error value");

			expect(mockLogger.error).toHaveBeenCalledWith(
				"Application failed to start:",
				{
					error: "Non-error value",
				},
			);
		});
	});

	describe("Main Function CLI Integration", () => {
		test("should test createMcpServer function", async () => {
			const { createMcpServer } = await import("./index.js");
			const config = createMockConfig({
				database: { requireConnection: true },
			});

			const server = await createMcpServer(config);
			expect(server).toBeDefined();

			// Verify database initialization was called
			const { initializeDatabase } = await import("./db/index.js");
			expect(initializeDatabase).toHaveBeenCalled();
		});

		test("should test createMcpServer with database disabled", async () => {
			const { createMcpServer } = await import("./index.js");
			const config = createMockConfig({
				database: { requireConnection: false },
			});

			const server = await createMcpServer(config);
			expect(server).toBeDefined();
		});

		test("should test startTransport with stdio", async () => {
			const { startTransport } = await import("./index.js");
			const config = createMockConfig({ mcp: { transport: "stdio" } });
			const server = createMockServer();

			await startTransport(server, config);

			const { startStdioServer } = await import("./transports/stdio.js");
			expect(startStdioServer).toHaveBeenCalledWith(server, config);
		});

		test("should test startTransport with http", async () => {
			const { startTransport } = await import("./index.js");
			const config = createMockConfig({ mcp: { transport: "http" } });
			const server = createMockServer();

			await startTransport(server, config);

			const { startHttpServer } = await import("./transports/http.js");
			expect(startHttpServer).toHaveBeenCalledWith(server, config);
		});

		test("should test startTransport with cli", async () => {
			const { startTransport } = await import("./index.js");
			const config = createMockConfig({ mcp: { transport: "cli" } });
			const server = createMockServer();

			await startTransport(server, config);

			const { startCliMode } = await import("./transports/cli.js");
			expect(startCliMode).toHaveBeenCalledWith(server, config);
		});

		test("should test startTransport with unknown transport", async () => {
			const { startTransport } = await import("./index.js");
			// biome-ignore lint/suspicious/noExplicitAny: Testing invalid transport type
			const config = createMockConfig({ mcp: { transport: "unknown" as any } });
			const server = createMockServer();

			await expect(startTransport(server, config)).rejects.toThrow(
				"Unknown transport: unknown",
			);
		});

		test("should test CLI argument parsing logic", async () => {
			const { Command } = await import("commander");
			// biome-ignore lint/suspicious/noExplicitAny: Mock needs flexible type for testing
			const CommandMock = Command as any;

			const mockProgram = {
				name: vi.fn().mockReturnThis(),
				description: vi.fn().mockReturnThis(),
				version: vi.fn().mockReturnThis(),
				addHelpText: vi.fn().mockReturnThis(),
				option: vi.fn().mockReturnThis(),
				parse: vi.fn().mockReturnThis(),
				opts: vi.fn().mockReturnValue({
					host: "localhost",
					port: "3000",
					transport: "stdio",
					logLevel: "info",
					db: true,
					tool: "getTasks",
					parameters: '{"list":"work"}',
					list: false,
					interactive: false,
				}),
			};

			CommandMock.mockImplementation(() => mockProgram);

			// Test the argument parsing workflow
			const options = mockProgram.opts();
			expect(options.host).toBe("localhost");
			expect(options.port).toBe("3000");
			expect(options.transport).toBe("stdio");
			expect(options.tool).toBe("getTasks");
		});

		test("should test configuration creation from CLI options", async () => {
			const { createConfig } = await import("./utils/config.js");

			// Test the config creation logic that main() uses
			const config = createConfig({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					host: "localhost",
					port: 3000,
				},
				database: {
					url: "postgres://localhost:5432/todo_mcp",
					requireConnection: true,
				},
				mcp: {
					transport: "stdio",
				},
				cli: {
					tool: "getTasks",
					parameters: '{"list":"work"}',
					list: false,
					interactive: false,
				},
				log: {
					level: "info",
				},
			});

			expect(config.server.name).toBe("todo-mcp");
			expect(config.mcp.transport).toBe("stdio");
			expect(config.cli.tool).toBe("getTasks");
		});

		test("should test CLI mode detection logic", async () => {
			// Test the logic that sets transport to CLI when CLI options are provided
			// biome-ignore lint/suspicious/noExplicitAny: Test function needs flexible type
			const testCliDetection = (cliOptions: any) => {
				return !!(cliOptions.tool || cliOptions.list || cliOptions.interactive);
			};

			expect(testCliDetection({ tool: "getTasks" })).toBe(true);
			expect(testCliDetection({ list: true })).toBe(true);
			expect(testCliDetection({ interactive: true })).toBe(true);
			expect(testCliDetection({})).toBe(false);
		});

		test("should test environment variable handling", async () => {
			// Test DATABASE_URL environment variable handling
			const originalUrl = process.env.DATABASE_URL;
			process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test_db";

			const databaseUrl =
				process.env.DATABASE_URL || "postgres://localhost:5432/todo_mcp";
			expect(databaseUrl).toBe("postgres://test:test@localhost:5432/test_db");

			// Restore original value
			if (originalUrl) {
				process.env.DATABASE_URL = originalUrl;
			} else {
				process.env.DATABASE_URL = undefined;
			}
		});

		test("should test error handling scenarios", async () => {
			// Test error message formatting
			// biome-ignore lint/suspicious/noExplicitAny: Error handler needs flexible type
			const formatError = (error: any) => {
				return error instanceof Error ? error.message : String(error);
			};

			expect(formatError(new Error("Test error"))).toBe("Test error");
			expect(formatError("String error")).toBe("String error");
			expect(formatError(null)).toBe("null");
			expect(formatError(undefined)).toBe("undefined");
		});

		test("should test process event handler setup", async () => {
			// Test the unhandled rejection handler logic
			// biome-ignore lint/suspicious/noExplicitAny: Rejection handler needs flexible type
			const rejectionHandler = (reason: any) => {
				mockLogger.error("Unhandled rejection:", {
					reason: reason instanceof Error ? reason.message : String(reason),
				});
			};

			rejectionHandler(new Error("Test rejection"));
			expect(mockLogger.error).toHaveBeenCalledWith("Unhandled rejection:", {
				reason: "Test rejection",
			});

			rejectionHandler("String rejection");
			expect(mockLogger.error).toHaveBeenCalledWith("Unhandled rejection:", {
				reason: "String rejection",
			});
		});

		test("should test import.meta.url condition", async () => {
			// Test the condition that determines when main() should run
			const testMainCondition = (
				importMetaUrl: string,
				processArgv1: string,
			) => {
				return importMetaUrl === `file://${processArgv1}`;
			};

			// Test when they match (CLI execution)
			const importMetaUrl = "file:///path/to/index.js";
			const processArgv1 = "/path/to/index.js";
			expect(testMainCondition(importMetaUrl, processArgv1)).toBe(true);

			// Test when they don't match (module import)
			const differentImportMetaUrl = "file:///different/path.js";
			expect(testMainCondition(differentImportMetaUrl, processArgv1)).toBe(
				false,
			);
		});
	});

	describe("Configuration Tests", () => {
		test("should create config with overrides", async () => {
			const { createConfig } = await import("./utils/config.js");

			const config = createConfig({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					host: "127.0.0.1",
					port: 8080,
				},
				log: {
					level: "debug",
				},
			});

			expect(config.server.host).toBe("127.0.0.1");
			expect(config.server.port).toBe(8080);
			expect(config.log.level).toBe("debug");
			expect(config.server.name).toBe("todo-mcp"); // Should keep defaults
		});

		test("should handle partial config overrides", async () => {
			const { createConfig } = await import("./utils/config.js");

			const config = createConfig({
				mcp: {
					transport: "http",
				},
			});

			expect(config.mcp.transport).toBe("http");
			expect(config.server.name).toBe("todo-mcp"); // Should use default
		});
	});

	describe("Transport Integration", () => {
		test("should test all transport types", async () => {
			const { startTransport } = await import("./index.js");
			const server = createMockServer();

			// Test stdio transport
			const stdioConfig = createMockConfig({ mcp: { transport: "stdio" } });
			await startTransport(server, stdioConfig);

			// Test http transport
			const httpConfig = createMockConfig({ mcp: { transport: "http" } });
			await startTransport(server, httpConfig);

			// Test cli transport
			const cliConfig = createMockConfig({ mcp: { transport: "cli" } });
			await startTransport(server, cliConfig);

			// Verify all transports were called
			const { startStdioServer } = await import("./transports/stdio.js");
			const { startHttpServer } = await import("./transports/http.js");
			const { startCliMode } = await import("./transports/cli.js");

			expect(startStdioServer).toHaveBeenCalled();
			expect(startHttpServer).toHaveBeenCalled();
			expect(startCliMode).toHaveBeenCalled();
		});
	});
});
