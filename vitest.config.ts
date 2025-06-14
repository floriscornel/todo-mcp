import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./src/test-utils/vitest.setup.ts"],
		include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
		exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"coverage/",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"**/*.test.ts",
				"**/*.spec.ts",
				"**/test-utils/**",
				// Don't require coverage for examples
				"examples/**",
				// Migrations are generated code
				"migrations/**",
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
			},
		},
		testTimeout: 15000, // Increased for database operations
		hookTimeout: 15000,
		// Isolate tests to prevent interference
		isolate: true,
		// Pool options for better performance
		pool: "threads",
		poolOptions: {
			threads: {
				// Enable parallelization for better performance
				// Tests are properly isolated so this should be safe
				minThreads: 1,
				maxThreads: 4,
			},
		},
		// Retry failed tests once in case of flaky database connections
		retry: 1,
	},
});
