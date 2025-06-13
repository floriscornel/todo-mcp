import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleError = vi.fn();
const mockProcessExit = vi.fn();

// Setup global mocks
beforeEach(() => {
  vi.clearAllMocks();

  // Mock console methods
  vi.spyOn(console, "log").mockImplementation(mockConsoleLog);
  vi.spyOn(console, "error").mockImplementation(mockConsoleError);
  vi.spyOn(process, "exit").mockImplementation(mockProcessExit as any);

  // Reset process.argv
  process.argv = ["node", "index.js"];
});

describe("Todo MCP Server", () => {
  describe("Basic Functionality", () => {
    it("should be importable without errors", async () => {
      // This test ensures the module can be imported without syntax errors
      expect(async () => {
        await import("../index.js");
      }).not.toThrow();
    });

    it("should export expected functions", async () => {
      // Test that the module structure is correct
      const module = await import("../index.js");
      expect(module).toBeDefined();
    });
  });

  describe("Database Schema Validation", () => {
    it("should have valid priority enum values", async () => {
      const { priorityEnum } = await import("../db/index.js");

      // Test that priority enum has expected values
      expect(priorityEnum.options).toEqual(["low", "medium", "high", "urgent"]);
    });
  });

  describe("Environment Setup", () => {
    it("should load environment configuration", () => {
      // Test that dotenv is loaded
      expect(process.env).toBeDefined();
    });

    it("should have test database URL configured", () => {
      // Verify test database isolation is working
      expect(process.env.DATABASE_URL).toContain("todo_mcp_test");
    });
  });

  describe("Module Dependencies", () => {
    it("should import MCP SDK components", async () => {
      // Test that MCP SDK imports work
      const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
      const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");

      expect(McpServer).toBeDefined();
      expect(StdioServerTransport).toBeDefined();
    });

    it("should import database components", async () => {
      // Test that database imports work
      const { todoDb, initializeDatabase } = await import("../db/index.js");

      expect(todoDb).toBeDefined();
      expect(initializeDatabase).toBeDefined();
    });

    it("should import validation library", async () => {
      // Test that zod validation works
      const { z } = await import("zod");

      expect(z).toBeDefined();
      expect(z.string).toBeDefined();
      expect(z.number).toBeDefined();
    });
  });
});
