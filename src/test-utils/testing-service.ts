#!/usr/bin/env node

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Testing service for automated tests
 * This service provides simple, predictable tools for testing transport layers
 * without requiring database connections or external dependencies
 */

/**
 * Load testing service tools into the MCP server
 */
export async function loadTestingService(server: McpServer): Promise<void> {
	// Echo tool - for testing parameter passing and basic functionality
	server.tool(
		"echo",
		"Echo the input parameters back. Useful for testing parameter passing and JSON serialization.",
		{
			message: z
				.string()
				.optional()
				.default("Hello from testing service!")
				.describe("Message to echo back"),
			metadata: z
				.record(z.unknown())
				.optional()
				.describe("Optional metadata object to include in response"),
		},
		async (params) => {
			const { message, metadata } = params;

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							echo: message,
							timestamp: new Date().toISOString(),
							metadata: metadata || null,
						}),
					},
				],
			};
		},
	);

	// Math tool - for testing parameter validation and error handling
	server.tool(
		"math",
		"Perform basic arithmetic operations. Useful for testing parameter validation and error handling.",
		{
			operation: z
				.enum(["add", "subtract", "multiply", "divide"])
				.describe("Mathematical operation to perform"),
			a: z.number().describe("First number"),
			b: z.number().describe("Second number"),
		},
		async (params) => {
			const { operation, a, b } = params;

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
					if (b === 0) {
						throw new Error("Division by zero is not allowed");
					}
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
		},
	);

	// Status tool - for testing tool discovery and introspection
	server.tool(
		"status",
		"Get server status and information. Useful for testing tool discovery and introspection.",
		{
			includeTimestamp: z
				.boolean()
				.optional()
				.default(true)
				.describe("Whether to include timestamp in response"),
			format: z
				.enum(["json", "text"])
				.optional()
				.default("json")
				.describe("Response format - json or text"),
		},
		async (params) => {
			const { includeTimestamp, format } = params;

			const status = {
				service: "testing",
				version: "1.0.0",
				status: "healthy",
				tools: ["echo", "math", "status", "validate"],
				...(includeTimestamp && { timestamp: new Date().toISOString() }),
			};

			if (format === "text") {
				const textStatus = `Testing Service Status:
Service: ${status.service}
Version: ${status.version}
Status: ${status.status}
Tools: ${status.tools.join(", ")}
${includeTimestamp ? `Timestamp: ${status.timestamp}` : ""}`;

				return {
					content: [
						{
							type: "text",
							text: textStatus,
						},
					],
				};
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(status),
					},
				],
			};
		},
	);

	// Validate tool - for testing error handling and edge cases
	server.tool(
		"validate",
		"Test parameter validation with various constraints. Useful for testing error handling.",
		{
			value: z.string().describe("Value to validate"),
			type: z
				.enum(["email", "url", "uuid", "number"])
				.describe("Type of validation to perform"),
			strict: z
				.boolean()
				.optional()
				.default(false)
				.describe("Whether to use strict validation rules"),
		},
		async (params) => {
			const { value, type, strict } = params;

			let isValid = false;
			let reason = "";

			switch (type) {
				case "email": {
					const emailRegex = strict
						? /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
						: /.*@.*/;
					isValid = emailRegex.test(value);
					reason = isValid ? "Valid email format" : "Invalid email format";
					break;
				}

				case "url":
					try {
						new URL(value);
						isValid = true;
						reason = "Valid URL format";
					} catch {
						isValid = false;
						reason = "Invalid URL format";
					}
					break;

				case "uuid": {
					const uuidRegex =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
					isValid = uuidRegex.test(value);
					reason = isValid ? "Valid UUID format" : "Invalid UUID format";
					break;
				}

				case "number": {
					const num = Number(value);
					isValid = !Number.isNaN(num) && Number.isFinite(num);
					reason = isValid ? "Valid number" : "Invalid number";
					break;
				}

				default:
					throw new Error(`Unknown validation type: ${type}`);
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify({
							value,
							type,
							strict,
							isValid,
							reason,
							timestamp: new Date().toISOString(),
						}),
					},
				],
			};
		},
	);

	console.log(
		"🧪 Testing service loaded with tools: echo, math, status, validate",
	);
}
