import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const db = drizzle(process.env.DATABASE_URL!);

async function startMcpServer() {
  // Create MCP server
  const server = new McpServer({
    name: "todo-mcp",
    version: "0.1.0",
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Todo MCP Server started");
}

// Main function to handle both CLI and MCP server modes
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // CLI commands
  switch (command) {
    case "help":
    case "--help":
    case "-h":
      console.log("Todo MCP Server");
      console.log("Usage:");
      console.log("  npx @floriscornel/todo-mcp@latest help       # Show help");
      console.log("  npx @floriscornel/todo-mcp@latest            # Start MCP server (default)");
      return;
    case undefined:
      // No command = start MCP server
      await startMcpServer();
      return;
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help to see available commands");
      process.exit(1);
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

main().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
