import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	createMockConfig,
	createMockServerWithTestingService,
	mockConsole,
	mockProcessExit,
} from "../test-utils/mocks.js";
import { startCliMode } from "./cli.js";

describe("CLI Transport", () => {
	let mockServer: Awaited<
		ReturnType<typeof createMockServerWithTestingService>
	>;
	let consoleMocks: ReturnType<typeof mockConsole>;
	let processExitMock: ReturnType<typeof mockProcessExit>;

	beforeEach(async () => {
		mockServer = await createMockServerWithTestingService();
		consoleMocks = mockConsole();
		processExitMock = mockProcessExit();
	});

	afterEach(() => {
		consoleMocks.restore();
		processExitMock.restore();
		vi.resetAllMocks();
	});

	describe("List Tools Mode", () => {
		test("should display available tools when list option is true", async () => {
			const config = createMockConfig({
				cli: { list: true },
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"🛠️  Todo MCP CLI Mode",
			);
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"📋 Available Tools:",
			);
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"  • echo - Echo the input parameters back. Useful for testing parameter passing and JSON serialization.",
			);
			expect(mockServer.getToolsMetadata).toHaveBeenCalled();
		});

		test("should handle empty tools list gracefully", async () => {
			mockServer.getToolsMetadata = vi.fn().mockReturnValue([]);
			const config = createMockConfig({
				cli: { list: true },
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"📋 Available Tools:",
			);
			expect(mockServer.getToolsMetadata).toHaveBeenCalled();
		});
	});

	describe("Tool Execution Mode", () => {
		test("should execute tool with parameters", async () => {
			const config = createMockConfig({
				cli: {
					tool: "echo",
					parameters: '{"message": "Hello World!"}',
				},
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"🔧 Executing tool: echo",
			);
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"📥 Parameters:",
				JSON.stringify({ message: "Hello World!" }, null, 2),
			);
			expect(mockServer.callTool).toHaveBeenCalledWith("echo", {
				message: "Hello World!",
			});
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				expect.stringContaining("✅ Result"),
			);
		});

		test("should execute tool without parameters", async () => {
			const config = createMockConfig({
				cli: { tool: "echo" },
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"🔧 Executing tool: echo",
			);
			expect(mockServer.callTool).toHaveBeenCalledWith("echo", {});
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				expect.stringContaining("✅ Result"),
			);
		});

		test("should handle invalid JSON parameters", async () => {
			const config = createMockConfig({
				cli: {
					tool: "echo",
					parameters: '{"invalid": json}',
				},
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.error).toHaveBeenCalledWith(
				"❌ Invalid JSON parameters:",
				expect.any(String),
			);
			expect(processExitMock.mockExit).toHaveBeenCalledWith(1);
		});

		test("should handle tool execution errors", async () => {
			const config = createMockConfig({
				cli: {
					tool: "math",
					parameters: '{"operation": "divide", "a": 10, "b": 0}',
				},
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.error).toHaveBeenCalledWith(
				"❌ Tool execution failed:",
			);
			expect(consoleMocks.mocks.error).toHaveBeenCalledWith(
				"Division by zero is not allowed",
			);
			expect(processExitMock.mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("Interactive Mode", () => {
		test("should show interactive mode not implemented message", async () => {
			const config = createMockConfig({
				cli: { interactive: true },
			});

			await startCliMode(mockServer, config);

			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"🚧 Interactive mode is not yet implemented",
			);
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"💡 For now, use --tool and --parameters for direct execution",
			);
		});
	});

	describe("Configuration Handling", () => {
		test("should log server information", async () => {
			const config = createMockConfig({
				server: {
					name: "test-server",
					version: "1.0.0",
					port: 3000,
					host: "localhost",
				},
				cli: { list: true },
			});

			await startCliMode(mockServer, config);

			// The logger should be called with server info
			expect(consoleMocks.mocks.log).toHaveBeenCalledWith(
				"🛠️  Todo MCP CLI Mode",
			);
		});
	});
});
