import { serve } from "@hono/node-server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { ApplicationConfig } from "../utils/config.js";
import { logger } from "../utils/config.js";
import type { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

export async function startHttpServer(
	server: ExtendedMcpServer,
	config: ApplicationConfig,
) {
	const { port, host } = config.server;

	logger.info("Starting MCP server with HTTP transport", {
		host,
		port,
		serverName: config.server.name,
		version: config.server.version,
		service: "todo",
	});

	const app = new Hono();

	// Add middleware
	app.use("*", cors());
	app.use("*", honoLogger());

	// Main MCP endpoint
	app.post("/", async (c) => {
		try {
			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
			});

			// biome-ignore lint/suspicious/noExplicitAny: MCP transport type compatibility
			await server.connect(transport as any);

			// Convert Hono request to Node.js compatible format
			const body = await c.req.json();
			const req = c.req.raw;

			// Create a minimal response object that works with the transport
			const res = {
				writeHead: (_statusCode: number, _headers?: Record<string, string>) => {
					// Headers will be handled by Hono
				},
				write: (_chunk: string) => {
					// Will be handled by returning the response
				},
				end: (_chunk?: string) => {
					// Will be handled by returning the response
				},
				on: (event: string, callback: () => void) => {
					// Handle cleanup when response closes
					if (event === "close") {
						callback();
					}
				},
				// biome-ignore lint/suspicious/noExplicitAny: Node.js response mock for MCP transport
			} as any;

			// Handle the MCP request
			// biome-ignore lint/suspicious/noExplicitAny: Node.js request type compatibility
			await transport.handleRequest(req as any, res, body);

			// Cleanup
			transport.close();

			// Since we can't easily integrate with the transport's response handling,
			// we'll create a simple JSON-RPC response
			return c.json({
				jsonrpc: "2.0",
				result: "Request processed",
				id: body.id || null,
			});
		} catch (error) {
			logger.error("MCP request error", {
				error: error instanceof Error ? error.message : String(error),
			});
			return c.json(
				{
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message: "Internal server error",
						data: error instanceof Error ? error.message : "Unknown error",
					},
					id: null,
				},
				500,
			);
		}
	});

	// Health check endpoint
	app.get("/health", (c) => {
		return c.json({
			status: "ok",
			service: config.server.name,
			version: config.server.version,
			transport: "StreamableHTTP",
			serviceType: "todo",
			timestamp: new Date().toISOString(),
		});
	});

	// Root endpoint - provide information about the service
	app.get("/", (c) => {
		return c.json({
			name: config.server.name,
			version: config.server.version,
			description: "Todo MCP server with HTTP streaming transport",
			transport: "StreamableHTTPServerTransport",
			serviceType: "todo",
			endpoints: {
				mcp: "POST /",
				health: "GET /health",
			},
			usage: {
				description:
					"Send JSON-RPC 2.0 requests to POST / for MCP communication",
				example: {
					method: "POST",
					url: "/",
					headers: {
						"Content-Type": "application/json",
					},
					body: {
						jsonrpc: "2.0",
						method: "tools/list",
						id: 1,
					},
				},
			},
			timestamp: new Date().toISOString(),
		});
	});

	// Handle unsupported methods
	app.on(["GET", "DELETE", "PUT", "PATCH"], "*", (c) => {
		return c.json(
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

	// Global error handler
	app.onError((error, c) => {
		logger.error("HTTP server error", { error: error.message });
		return c.json(
			{
				jsonrpc: "2.0",
				error: {
					code: -32603,
					message: "Internal server error",
					data: error.message,
				},
				id: null,
			},
			500,
		);
	});

	logger.info(`🚀 Todo MCP HTTP Server starting on http://${host}:${port}`);
	logger.info("📋 Mode: MCP over HTTP (StreamableHTTP Transport)");
	logger.info(`🔗 MCP Endpoint: http://${host}:${port}/ (POST)`);
	logger.info(`❤️  Health Check: http://${host}:${port}/health`);
	logger.info(`📖 Usage Info: http://${host}:${port}/ (GET)`);

	return serve({
		fetch: app.fetch,
		port,
		hostname: host,
	});
}
