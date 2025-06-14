import { config } from "dotenv";
import { runMigrations } from "./postgres.js";

// Load environment variables
config();

// Initialize database
export async function initializeDatabase(): Promise<void> {
	try {
		await runMigrations();
	} catch (error) {
		console.error("Failed to initialize database:", error);
		throw error;
	}
}

// Export the database instance and schema
export { todoDb } from "./postgres.js";
export * from "./schema.js";
