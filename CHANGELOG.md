# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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