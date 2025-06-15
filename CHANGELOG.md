# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.2.0] - 2025-06-14

### 🚀 Major New Features

- 🌐 **Multiple Transport Modes**: Revolutionary expansion beyond traditional MCP
  - **stdio** (default) - Traditional MCP for Claude Desktop integration
  - **http** - RESTful streaming HTTP server for web integration
  - **openapi** - Auto-generated REST API with Swagger UI documentation
  - **cli** - Direct command-line tool execution for automation and testing

- 🔧 **Full CLI Interface**: Complete command-line interface with Commander.js
  - Interactive and non-interactive modes
  - Direct tool execution: `todo-mcp --transport cli --tool getTasks --parameters '{"list":"work"}'`
  - Built-in help system and examples
  - Flexible configuration options (host, port, transport, log levels)

- 📊 **HTTP Server**: Production-ready HTTP server with Hono framework
  - Streaming HTTP transport for real-time MCP communication
  - CORS support for web applications
  - Health check endpoints for monitoring
  - Comprehensive error handling and logging

- 🔍 **OpenAPI Integration**: Auto-generated REST API from MCP tools
  - Interactive Swagger UI documentation at `/ui`
  - OpenAPI 3.0 specification at `/doc` 
  - Automatic endpoint generation from MCP tool definitions
  - Type-safe request/response schemas with Zod validation
  - Tool discovery and metadata endpoints

### 🎯 Enhanced Type Safety & Architecture

- 🏗️ **Database-level Type Safety**: PostgreSQL enum for priority field
  - Replaced `varchar` priority field with proper `priority` enum type
  - Compile-time type safety preventing invalid priority values
  - Database-level constraints ensure data integrity

- 📦 **Improved Architecture**: Complete separation of concerns refactoring
  - **Schema Layer**: Clean database schema focused purely on data structure
  - **Application Layer**: UI constants (emojis) and validation messages moved to application level
  - **Transport Layer**: Modular transport system supporting multiple protocols
  - **Validation**: Dual validation approach with base schemas for database and enhanced schemas for tools

- � **Developer Experience**: Significantly improved maintainability
  - Priority utilities (`priorityOrder`, `priorityEmojis`) centralized and reusable
  - Better IntelliSense support with proper TypeScript types
  - Cleaner error messages and validation feedback
  - Eliminated code duplication with `drizzle-zod` auto-generation

### 🛠️ Technical Implementation

- **Transport Architecture**: Modular transport system with clean interfaces
- **Hono Integration**: Modern web framework for HTTP/OpenAPI modes
- **Commander.js**: Professional CLI interface with comprehensive option parsing
- **Auto-generated APIs**: Dynamic REST endpoint creation from MCP tool metadata
- **Enhanced Logging**: Structured logging with configurable levels across all transports
- **Type-safe Configuration**: Complete configuration system with validation

### � Breaking Changes

⚠️ **CLI Interface**: The command-line interface has been completely redesigned
- **Old**: `node dist/index.js` (stdio only)
- **New**: `todo-mcp [options]` with full CLI support

**Migration Guide**:
```bash
# Old way (still works as default)
node dist/index.js

# New equivalent
todo-mcp
# or explicitly
todo-mcp --transport stdio

# New features
todo-mcp --transport http --port 3001        # HTTP server
todo-mcp --transport openapi --port 3002     # OpenAPI + Swagger UI
todo-mcp --transport cli --tool getLists     # Direct CLI execution
```

### 🔄 Database Migration

**Migration Required**: Run `npm run db:migrate` to apply priority enum changes
- Database migration generated for `varchar` to `enum` conversion
- `createInsertSchema` and `createSelectSchema` from `drizzle-zod` for type-safe auto-generation
- Priority enum: `pgEnum("priority", ["low", "medium", "high", "urgent"])`
- Maintains 100% backward compatibility with existing data

### 📦 New Dependencies

- `@hono/node-server` - HTTP server runtime
- `@hono/swagger-ui` - Swagger UI integration
- `@hono/zod-openapi` - OpenAPI schema generation
- `commander` - CLI framework
- `hono` - Web framework for HTTP/API modes

**Compatibility**: Maintains full backward compatibility for existing MCP integrations

## [v0.1.3] - 2025-06-13

### Improved
- 🧪 **Enhanced test coverage**: Significantly improved test coverage from 92.66% to 98%
  - Added comprehensive tests for task count functionality (`getTaskCountsByList`)
  - Enhanced database operation testing with various task states (active, completed, archived)
  - Improved postgres.ts coverage from 89.52% to 97.14%
- ✅ **Better test reliability**: Enhanced test robustness with more comprehensive edge case testing

## [v0.1.2] - 2025-06-13

### Fixed
- 🐛 **Fixed missing migrations**: Added missing migrations to the package


## [v0.1.1] - 2025-06-13

### Fixed
- 🐛 **Fixed shebang**: Added shebang to the entry point to ensure proper execution


## [v0.1.0] - 2025-06-13

### Added
- 🚀 **Initial release of todo-mcp**: A Model Context Protocol (MCP) server for todo and task management
- 📝 **Todo list management**: Create and organize todo lists with names and descriptions
- ✅ **Task management**: Create, complete, and archive tasks with priority levels
- 🎯 **Priority system**: Support for low (🟢), medium (🟡), high (🔴), and urgent (🔥) task priorities
- ⏰ **Relative timestamps**: Human-readable relative time display (e.g., "3 minutes ago", "2 hours ago") for better LLM context
  - Includes `createdAtRelative`, `completedAtRelative`, and `archivedAtRelative` fields in task responses
  - Makes it easier for LLMs to understand task recency without needing current date/time context
  - Supports time ranges from "just now" to years ago with appropriate pluralization
- 📊 **Task count summaries**: Enhanced `getLists` endpoint with comprehensive task statistics
  - Shows total, active, completed, and archived task counts for each list
  - Provides quick overview of list status without requiring separate `getTasks` calls
  - Includes relative timestamps for list creation dates
- 🗄️ **PostgreSQL integration**: Robust database backend with Drizzle ORM
- 🔧 **Developer experience**: Full TypeScript support with comprehensive type safety
- 🧪 **Testing**: Complete test suite for reliable functionality

### Technical Implementation
- MCP (Model Context Protocol) server implementation for seamless AI integration
- PostgreSQL database with Drizzle ORM for efficient data management
- `formatRelativeTime()` utility function for consistent relative time formatting
- `getTaskCountsByList()` database method for efficient task counting
- Enhanced response structures with relative timestamps and task counts
- Comprehensive input validation with Zod schemas
- Support for task filtering (active, completed, archived)

**Full Changelog**: https://github.com/floriscornel/todo-mcp/commits/v0.1.0 