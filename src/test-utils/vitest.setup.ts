import "dotenv/config";

// Global test setup
console.log("Setting up test environment...");

// Set test environment variables
process.env.NODE_ENV = "test";

// Database configuration for tests
// In CI/automated environments, assume database is available
// In local development, provide fallbacks
const isCI = process.env.CI === "true" || process.env.NODE_ENV === "test";

if (isCI) {
	// In CI, assume database is available and configured
	process.env.DATABASE_URL =
		process.env.TEST_DATABASE_URL ||
		process.env.DATABASE_URL ||
		"postgresql://postgres:postgres@localhost:5432/todo_mcp_test";
} else {
	// In local development, use test database if available
	process.env.DATABASE_URL =
		process.env.TEST_DATABASE_URL ||
		process.env.DATABASE_TEST_URL ||
		"postgresql://localhost:5432/todo_mcp_test";
}

console.log(`Test database: ${process.env.DATABASE_URL}`);
console.log(`CI environment: ${isCI}`);

// Set log level to error during tests to reduce noise
process.env.LOG_LEVEL = "error";

// Global test timeout
const DEFAULT_TIMEOUT = 10000;
export { DEFAULT_TIMEOUT };
