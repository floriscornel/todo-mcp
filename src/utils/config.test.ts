import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("Configuration Module", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment variables
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	describe("Default Configuration", () => {
		test("should provide default configuration values", async () => {
			const { defaultConfig } = await import("./config.js");

			expect(defaultConfig).toMatchObject({
				server: {
					name: "todo-mcp",
					version: "0.2.0",
					port: 3000,
					host: "localhost",
				},
				database: {
					requireConnection: true,
				},
				mcp: {
					transport: "stdio",
				},
				cli: {},
			});

			expect(defaultConfig.database.url).toContain("todo_mcp");
			expect(defaultConfig.database.testUrl).toContain("todo_mcp_test");
		});

		test("should use environment variables for default configuration", async () => {
			process.env.DATABASE_URL = "postgres://custom:5432/todo_custom";
			process.env.TEST_DATABASE_URL = "postgres://custom:5432/todo_test";
			process.env.LOG_LEVEL = "debug";

			const { defaultConfig } = await import("./config.js");

			expect(defaultConfig.database.url).toBe(
				"postgres://custom:5432/todo_custom",
			);
			expect(defaultConfig.database.testUrl).toBe(
				"postgres://custom:5432/todo_test",
			);
			expect(defaultConfig.log.level).toBe("debug");
		});
	});

	describe("Environment-based Configuration", () => {
		test("should override configuration with environment variables", async () => {
			process.env.PORT = "8080";
			process.env.HOST = "0.0.0.0";
			process.env.DATABASE_URL = "postgres://env:5432/todo_env";
			process.env.TEST_DATABASE_URL = "postgres://env:5432/todo_test";
			process.env.DB_REQUIRED = "false";
			process.env.MCP_TRANSPORT = "http";

			const { config } = await import("./config.js");

			expect(config.server.port).toBe(8080);
			expect(config.server.host).toBe("0.0.0.0");
			expect(config.database.url).toBe("postgres://env:5432/todo_env");
			expect(config.database.testUrl).toBe("postgres://env:5432/todo_test");
			expect(config.database.requireConnection).toBe(false);
			expect(config.mcp.transport).toBe("http");
		});

		test("should handle partial environment variable overrides", async () => {
			process.env.PORT = "4000";
			// Don't set HOST - should use default

			const { config } = await import("./config.js");

			expect(config.server.port).toBe(4000);
			expect(config.server.host).toBe("localhost"); // default
		});

		test("should conditionally include test database URL", async () => {
			// Test without TEST_DATABASE_URL
			process.env.TEST_DATABASE_URL = undefined;

			const { config: config1 } = await import("./config.js");
			expect(config1.database.testUrl).toBe(
				"postgres://localhost:5432/todo_mcp_test",
			);

			vi.resetModules();

			// Test with TEST_DATABASE_URL
			process.env.TEST_DATABASE_URL = "postgres://test:5432/custom_test";
			const { config: config2 } = await import("./config.js");
			expect(config2.database.testUrl).toBe("postgres://test:5432/custom_test");
		});
	});

	describe("createConfig Function", () => {
		test("should create config without overrides", async () => {
			const { createConfig, config } = await import("./config.js");

			const newConfig = createConfig();

			expect(newConfig).toEqual(config);
		});

		test("should create config with server overrides", async () => {
			const { createConfig } = await import("./config.js");

			const overrides = {
				server: {
					name: "custom-server",
					version: "2.0.0",
					port: 3000,
					host: "localhost",
				},
			};

			const newConfig = createConfig(overrides);

			expect(newConfig.server.name).toBe("custom-server");
			expect(newConfig.server.version).toBe("2.0.0");
			// Should preserve other defaults
			expect(newConfig.server.host).toBe("localhost");
			expect(newConfig.server.port).toBe(3000);
		});

		test("should create config with database overrides", async () => {
			const { createConfig } = await import("./config.js");

			const overrides = {
				database: {
					url: "postgres://override:5432/todo_override",
					requireConnection: false,
				},
			};

			const newConfig = createConfig(overrides);

			expect(newConfig.database.url).toBe(
				"postgres://override:5432/todo_override",
			);
			expect(newConfig.database.requireConnection).toBe(false);
		});

		test("should create config with mcp overrides", async () => {
			const { createConfig } = await import("./config.js");

			const overrides = {
				mcp: {
					transport: "cli" as const,
				},
			};

			const newConfig = createConfig(overrides);

			expect(newConfig.mcp.transport).toBe("cli");
		});

		test("should create config with cli overrides", async () => {
			const { createConfig } = await import("./config.js");

			const overrides = {
				cli: {
					tool: "getTasks",
					parameters: '{"list":"work"}',
					list: true,
					interactive: false,
				},
			};

			const newConfig = createConfig(overrides);

			expect(newConfig.cli.tool).toBe("getTasks");
			expect(newConfig.cli.parameters).toBe('{"list":"work"}');
			expect(newConfig.cli.list).toBe(true);
			expect(newConfig.cli.interactive).toBe(false);
		});

		test("should create config with log overrides", async () => {
			const { createConfig } = await import("./config.js");

			const overrides = {
				log: {
					level: "error" as const,
				},
			};

			const newConfig = createConfig(overrides);

			expect(newConfig.log.level).toBe("error");
		});

		test("should create config with multiple section overrides", async () => {
			const { createConfig } = await import("./config.js");

			const overrides = {
				server: {
					name: "multi-override",
					version: "0.2.0",
					port: 9000,
					host: "localhost",
				},
				database: {
					requireConnection: false,
				},
				log: {
					level: "warn" as const,
				},
			};

			const newConfig = createConfig(overrides);

			expect(newConfig.server.name).toBe("multi-override");
			expect(newConfig.server.port).toBe(9000);
			expect(newConfig.database.requireConnection).toBe(false);
			expect(newConfig.log.level).toBe("warn");
			// Should preserve other defaults
			expect(newConfig.server.host).toBe("localhost");
			expect(newConfig.mcp.transport).toBe("stdio");
		});
	});

	describe("Logger Functionality", () => {
		let consoleSpy: {
			debug: ReturnType<typeof vi.spyOn>;
			info: ReturnType<typeof vi.spyOn>;
			warn: ReturnType<typeof vi.spyOn>;
			error: ReturnType<typeof vi.spyOn>;
		};

		beforeEach(() => {
			consoleSpy = {
				debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
				info: vi.spyOn(console, "info").mockImplementation(() => {}),
				warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
				error: vi.spyOn(console, "error").mockImplementation(() => {}),
			};
		});

		test("should log debug messages when level is debug", async () => {
			process.env.LOG_LEVEL = "debug";
			const { logger } = await import("./config.js");

			logger.debug("Debug message", { key: "value" });

			expect(consoleSpy.debug).toHaveBeenCalledWith(
				"[DEBUG] Debug message",
				'{\n  "key": "value"\n}',
			);
		});

		test("should log debug messages without metadata", async () => {
			process.env.LOG_LEVEL = "debug";
			const { logger } = await import("./config.js");

			logger.debug("Debug message");

			expect(consoleSpy.debug).toHaveBeenCalledWith(
				"[DEBUG] Debug message",
				"",
			);
		});

		test("should not log debug messages when level is info", async () => {
			process.env.LOG_LEVEL = "info";
			const { logger } = await import("./config.js");

			logger.debug("Debug message");

			expect(consoleSpy.debug).not.toHaveBeenCalled();
		});

		test("should log info messages when level is debug or info", async () => {
			process.env.LOG_LEVEL = "info";
			const { logger } = await import("./config.js");

			logger.info("Info message", { data: "test" });

			expect(consoleSpy.info).toHaveBeenCalledWith(
				"[INFO] Info message",
				'{\n  "data": "test"\n}',
			);
		});

		test("should log info messages without metadata", async () => {
			process.env.LOG_LEVEL = "info";
			const { logger } = await import("./config.js");

			logger.info("Info message");

			expect(consoleSpy.info).toHaveBeenCalledWith("[INFO] Info message", "");
		});

		test("should not log info messages when level is warn", async () => {
			process.env.LOG_LEVEL = "warn";
			const { logger } = await import("./config.js");

			logger.info("Info message");

			expect(consoleSpy.info).not.toHaveBeenCalled();
		});

		test("should log warn messages when level is debug, info, or warn", async () => {
			process.env.LOG_LEVEL = "warn";
			const { logger } = await import("./config.js");

			logger.warn("Warning message", { warning: "data" });

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				"[WARN] Warning message",
				'{\n  "warning": "data"\n}',
			);
		});

		test("should log warn messages without metadata", async () => {
			process.env.LOG_LEVEL = "warn";
			const { logger } = await import("./config.js");

			logger.warn("Warning message");

			expect(consoleSpy.warn).toHaveBeenCalledWith(
				"[WARN] Warning message",
				"",
			);
		});

		test("should not log warn messages when level is error", async () => {
			process.env.LOG_LEVEL = "error";
			const { logger } = await import("./config.js");

			logger.warn("Warning message");

			expect(consoleSpy.warn).not.toHaveBeenCalled();
		});

		test("should always log error messages", async () => {
			process.env.LOG_LEVEL = "error";
			const { logger } = await import("./config.js");

			logger.error("Error message", { error: "details" });

			expect(consoleSpy.error).toHaveBeenCalledWith(
				"[ERROR] Error message",
				'{\n  "error": "details"\n}',
			);
		});

		test("should log error messages without metadata", async () => {
			process.env.LOG_LEVEL = "error";
			const { logger } = await import("./config.js");

			logger.error("Error message");

			expect(consoleSpy.error).toHaveBeenCalledWith(
				"[ERROR] Error message",
				"",
			);
		});

		test("should test all log levels with different configurations", async () => {
			const testCases = [
				{
					level: "debug",
					expectDebug: true,
					expectInfo: true,
					expectWarn: true,
					expectError: true,
				},
				{
					level: "info",
					expectDebug: false,
					expectInfo: true,
					expectWarn: true,
					expectError: true,
				},
				{
					level: "warn",
					expectDebug: false,
					expectInfo: false,
					expectWarn: true,
					expectError: true,
				},
				{
					level: "error",
					expectDebug: false,
					expectInfo: false,
					expectWarn: false,
					expectError: true,
				},
			];

			for (const testCase of testCases) {
				// Reset modules and spies for each test case
				vi.resetModules();
				consoleSpy.debug.mockClear();
				consoleSpy.info.mockClear();
				consoleSpy.warn.mockClear();
				consoleSpy.error.mockClear();

				process.env.LOG_LEVEL = testCase.level;
				const { logger } = await import("./config.js");

				logger.debug("Debug test");
				logger.info("Info test");
				logger.warn("Warn test");
				logger.error("Error test");

				expect(consoleSpy.debug).toHaveBeenCalledTimes(
					testCase.expectDebug ? 1 : 0,
				);
				expect(consoleSpy.info).toHaveBeenCalledTimes(
					testCase.expectInfo ? 1 : 0,
				);
				expect(consoleSpy.warn).toHaveBeenCalledTimes(
					testCase.expectWarn ? 1 : 0,
				);
				expect(consoleSpy.error).toHaveBeenCalledTimes(
					testCase.expectError ? 1 : 0,
				);
			}
		});
	});
});
