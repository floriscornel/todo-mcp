import "dotenv/config";

export interface LogLevel {
	level: "debug" | "info" | "warn" | "error";
}

export interface ServerConfig {
	name: string;
	version: string;
	port: number;
	host: string;
}

export interface DatabaseConfig {
	url: string;
	testUrl?: string;
	requireConnection: boolean;
}

export interface McpConfig {
	transport: "stdio" | "http" | "openapi" | "cli";
}

export interface CliConfig {
	tool?: string;
	parameters?: string;
	list?: boolean;
	interactive?: boolean;
}

export interface ApplicationConfig {
	server: ServerConfig;
	database: DatabaseConfig;
	mcp: McpConfig;
	cli: CliConfig;
	log: LogLevel;
}

// Default configuration
const defaultConfig: ApplicationConfig = {
	server: {
		name: "todo-mcp",
		version: "0.2.0",
		port: 3000,
		host: "localhost",
	},
	database: {
		url: process.env.DATABASE_URL || "postgres://localhost:5432/todo_mcp",
		testUrl:
			process.env.TEST_DATABASE_URL ||
			"postgres://localhost:5432/todo_mcp_test",
		requireConnection: true,
	},
	mcp: {
		transport: "stdio",
	},
	cli: {},
	log: {
		level: (process.env.LOG_LEVEL as LogLevel["level"]) || "info",
	},
};

// Override config based on environment variables
export const config: ApplicationConfig = {
	...defaultConfig,
	server: {
		...defaultConfig.server,
		port: process.env.PORT
			? Number.parseInt(process.env.PORT, 10)
			: defaultConfig.server.port,
		host: process.env.HOST || defaultConfig.server.host,
	},
	database: {
		...defaultConfig.database,
		url: process.env.DATABASE_URL || defaultConfig.database.url,
		...(process.env.TEST_DATABASE_URL && {
			testUrl: process.env.TEST_DATABASE_URL,
		}),
		requireConnection: process.env.DB_REQUIRED !== "false",
	},
	mcp: {
		...defaultConfig.mcp,
		transport:
			(process.env.MCP_TRANSPORT as McpConfig["transport"]) ||
			defaultConfig.mcp.transport,
	},
	cli: {
		...defaultConfig.cli,
	},
};

// Create a new config with overrides
export function createConfig(
	overrides: Partial<ApplicationConfig> = {},
): ApplicationConfig {
	const appConfig = {
		server: { ...config.server, ...overrides.server },
		database: { ...config.database, ...overrides.database },
		mcp: { ...config.mcp, ...overrides.mcp },
		cli: { ...config.cli, ...overrides.cli },
		log: { ...config.log, ...overrides.log },
	};

	logger = createLogger(appConfig);

	return appConfig;
}

// Simple logger
export const createLogger = (config: ApplicationConfig) => {
	return {
		debug: (message: string, meta?: Record<string, unknown>) => {
			console.log(config.log.level);
			if (config.log.level === "debug") {
				console.debug(
					`[DEBUG] ${message}`,
					meta ? JSON.stringify(meta, null, 2) : "",
				);
			}
		},
		info: (message: string, meta?: Record<string, unknown>) => {
			if (["debug", "info"].includes(config.log.level)) {
				console.info(
					`[INFO] ${message}`,
					meta ? JSON.stringify(meta, null, 2) : "",
				);
			}
		},
		warn: (message: string, meta?: Record<string, unknown>) => {
			if (["debug", "info", "warn"].includes(config.log.level)) {
				console.warn(
					`[WARN] ${message}`,
					meta ? JSON.stringify(meta, null, 2) : "",
				);
			}
		},
		error: (message: string, meta?: Record<string, unknown>) => {
			console.error(
				`[ERROR] ${message}`,
				meta ? JSON.stringify(meta, null, 2) : "",
			);
		},
	};
};

export let logger = createLogger(config);

// Export for convenience
export { defaultConfig };
