import "dotenv/config";

// Global test setup
console.log("Setting up test environment...");

// Set test environment variables
process.env.NODE_ENV = "test";

// Use dedicated test database to avoid messing with real data
// Priority: TEST_DATABASE_URL > DATABASE_TEST_URL > fallback to test database
process.env.DATABASE_URL =
	process.env.TEST_DATABASE_URL ||
	process.env.DATABASE_TEST_URL ||
	"postgresql://localhost:5432/todo_mcp_test";

console.log(`Test database: ${process.env.DATABASE_URL}`);
