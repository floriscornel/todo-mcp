import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import type { Context } from "hono";
import { z } from "zod";
import type { ApplicationConfig } from "../utils/config.js";
import { logger } from "../utils/config.js";
import type { ExtendedMcpServer } from "../utils/extended-mcp-server.js";

export async function startOpenApiServer(
	server: ExtendedMcpServer,
	config: ApplicationConfig,
) {
	const { port, host } = config.server;

	const app = new OpenAPIHono();

	// OpenAPI documentation endpoint
	app.doc("/doc", {
		openapi: "3.0.0",
		info: {
			version: config.server.version,
			title: `${config.server.name} API`,
			description:
				"Auto-generated REST API from MCP Tool definitions. This API provides the same functionality as the MCP tools in a REST format.",
		},
		servers: [
			{
				url: `http://${host}:${port}`,
				description: "Development server",
			},
		],
	});

	// Swagger UI endpoint
	app.get("/ui", swaggerUI({ url: "/doc" }));

	// Health check endpoint
	app.openapi(
		createRoute({
			method: "get",
			path: "/health",
			summary: "Health check",
			description: "Check if the API is running and list available tools",
			responses: {
				200: {
					description: "Service is healthy",
					content: {
						"application/json": {
							schema: z.object({
								status: z.string(),
								service: z.string(),
								version: z.string(),
								timestamp: z.string(),
								tools: z.array(
									z.object({
										name: z.string(),
										description: z.string(),
										endpoint: z.string(),
										method: z.string(),
									}),
								),
							}),
						},
					},
				},
			},
		}),
		(c) => {
			const toolsMetadata = server.getToolsMetadata();
			const tools = toolsMetadata.map((tool) => ({
				name: tool.name,
				description: tool.description || "No description available",
				endpoint: generateEndpointPath(tool.name),
				method: "post",
			}));

			return c.json({
				status: "ok",
				service: config.server.name,
				version: config.server.version,
				timestamp: new Date().toISOString(),
				tools,
			});
		},
	);

	// Root endpoint - API information
	app.openapi(
		createRoute({
			method: "get",
			path: "/",
			summary: "API Information",
			description: "Get information about this auto-generated API",
			responses: {
				200: {
					description: "API information",
					content: {
						"application/json": {
							schema: z.object({
								name: z.string(),
								version: z.string(),
								description: z.string(),
								documentation: z.string(),
								toolsEndpoint: z.string(),
								generatedFrom: z.string(),
							}),
						},
					},
				},
			},
		}),
		(c) => {
			return c.json({
				name: `${config.server.name} API`,
				version: config.server.version,
				description: "Auto-generated REST API from MCP Tool definitions",
				documentation: `http://${host}:${port}/ui`,
				toolsEndpoint: "/api/tools",
				generatedFrom: "Model Context Protocol (MCP) Tools",
			});
		},
	);

	// Dynamically generate endpoints for each MCP tool
	const toolsMetadata = server.getToolsMetadata();

	for (const toolMeta of toolsMetadata) {
		const toolInfo = server.getToolInfo(toolMeta.name);
		const endpoint = generateEndpointPath(toolMeta.name);
		const method = "post";
		const requestSchema = toolInfo.inputSchema || z.object({});
		const responseSchema = toolInfo.outputSchema || z.object({});

		// Check if tool has parameters
		const hasParameters =
			toolInfo.inputSchema &&
			Object.keys(toolInfo.inputSchema.shape || {}).length > 0;

		const hasResponseSchema =
			toolInfo.outputSchema &&
			Object.keys(toolInfo.outputSchema.shape || {}).length > 0;

		// Simplified route configuration to avoid complex TypeScript issues
		const route = createRoute({
			method,
			path: endpoint,
			summary: `${toolMeta.name} - ${toolMeta.description || "No description"}`,
			description: toolMeta.description || "No description available",
			request: hasParameters
				? {
						body: {
							content: {
								"application/json": {
									schema: requestSchema,
								},
							},
						},
					}
				: {},
			responses: {
				200: {
					description: "Tool executed successfully",
					content: {
						"application/json": {
							schema: z.object({
								content: hasResponseSchema
									? responseSchema
									: z.object({
											text: z.string().describe("Human readable response"),
										}),
							}),
						},
					},
				},
				400: {
					description: "Invalid parameters or tool execution error",
					content: {
						"application/json": {
							schema: z.object({
								error: z.string(),
							}),
						},
					},
				},
			},
		});

		// Add the route handler
		app.openapi(route, async (c: Context) => {
			try {
				const parameters = hasParameters ? await c.req.json() : {};

				// Call the MCP tool
				const result = await server.callTool(toolMeta.name, parameters);

				return c.json(result, 200);
			} catch (error) {
				logger.error(`Tool ${toolMeta.name} execution failed`, {
					error: error instanceof Error ? error.message : String(error),
				});

				return c.json(
					{
						error: error instanceof Error ? error.message : String(error),
					},
					400,
				);
			}
		});

		logger.debug(
			`Generated endpoint: ${method.toUpperCase()} ${endpoint} -> ${toolMeta.name}`,
		);
	}

	// Global error handler
	app.onError((error, c) => {
		logger.error("OpenAPI server error", { error: error.message });
		return c.json(
			{
				success: false,
				error: "Internal server error",
				message: error.message,
			},
			500,
		);
	});

	logger.info(
		`🚀 ${config.server.name} ${config.server.version} OpenAPI Server starting on http://${host}:${port}`,
	);
	logger.info(`📖 Swagger UI: http://${host}:${port}/ui`);
	logger.info(`📄 OpenAPI Spec: http://${host}:${port}/doc`);
	logger.info(`❤️  Health Check: http://${host}:${port}/health`);
	logger.info(`🔧 Generated ${toolsMetadata.length} tool endpoints`);

	return serve({
		fetch: app.fetch,
		port,
		hostname: host,
	});
}

export function generateEndpointPath(toolName: string): string {
	// Convert camelCase to kebab-case and add /api prefix
	const kebabCase = toolName.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
	return `/api/${kebabCase}`;
}
