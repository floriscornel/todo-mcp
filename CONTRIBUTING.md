# Contributing to Todo MCP

Thank you for your interest in contributing to Todo MCP! This guide will help you get started with development, understand the architecture, and contribute effectively.

## 🚀 Quick Start for Developers

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Development Setup

```bash
# Clone the repository
git clone https://github.com/floriscornel/todo-mcp.git
cd todo-mcp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URLs

# Run database migrations
npm run db:migrate

# Run tests to ensure everything works
npm run test:coverage

# Start development server (MCP stdio mode)
npm run dev

# Or start in different modes
npm run dev:http         # MCP HTTP server mode
npm run dev:openapi      # OpenAPI mode with Swagger UI
npm run dev:auto-openapi # Auto-reloading OpenAPI mode
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Main database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo_mcp"

# Test database (separate from main)
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo_mcp_test"

# Optional: Logging level
LOG_LEVEL="debug"
```

## 🏗️ Architecture Overview

Todo MCP follows a modular architecture with clear separation of concerns:

```
src/
├── db/                 # Database layer
│   ├── schema.ts      # Database schema (Drizzle ORM)
│   ├── postgres.ts    # Database operations
│   └── index.ts       # Database initialization
├── service/           # Business logic layer
│   └── todo.ts        # Todo service (MCP tools)
├── transports/        # Transport layer
│   ├── stdio.ts       # MCP stdio transport (standard input/output)
│   ├── http.ts        # MCP HTTP transport (streamable HTTP)
│   ├── openapi.ts     # OpenAPI/Swagger transport
│   └── cli.ts         # CLI transport
├── utils/             # Utility layer
│   ├── config.ts      # Configuration management
│   ├── extended-mcp-server.ts  # Enhanced MCP server
│   ├── priority.ts    # Priority utilities
│   └── time.ts        # Time formatting utilities
└── index.ts           # Main entry point
```

### Key Components

#### 1. **Database Layer** (`src/db/`)
- **Drizzle ORM**: Type-safe database operations
- **PostgreSQL**: Robust data storage with enums and constraints
- **Migrations**: Database schema versioning
- **Connection Management**: Pooled connections and environment-based URLs

#### 2. **Service Layer** (`src/service/`)
- **Todo Service**: Core business logic implementing MCP tools
- **Validation**: Dual-layer validation (database + user-facing)
- **Error Handling**: Comprehensive error handling with user-friendly messages

#### 3. **Transport Layer** (`src/transports/`)
- **Modular Design**: Each transport mode is self-contained
- **stdio**: MCP stdio transport for Claude Desktop (single agent)
- **http**: MCP streamable HTTP transport for multi-agent access
- **openapi**: Auto-generated REST API with Swagger UI
- **cli**: Direct command-line tool execution

#### 4. **Utility Layer** (`src/utils/`)
- **Configuration**: Type-safe configuration management
- **Extended MCP Server**: Enhanced server with direct tool calling
- **Priority System**: Centralized priority handling
- **Time Formatting**: Relative time formatting for LLM context

## 🧪 Testing

### Test Structure
```
src/
├── __tests__/         # Unit tests
├── transports/        # Transport tests (co-located)
│   ├── stdio.test.ts
│   ├── http.test.ts
│   ├── openapi.test.ts
│   └── cli.test.ts
└── test-utils/        # Test utilities
    └── vitest.setup.ts
```

### Running Tests

```bash
# Run all tests with coverage (ALWAYS use this)
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests for CI (includes JUnit output)
npm run test:coverage:ci
```

### Coverage Requirements
- **Minimum 80%** coverage for branches, functions, lines, and statements
- Tests are automatically run in CI for Node.js 18, 20, and 22
- Coverage reports are uploaded to Codecov

### Writing Tests

#### Database Tests
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeDatabase } from '../db/index.js';

describe('Database Operations', () => {
  beforeEach(async () => {
    await initializeDatabase();
    // Database is automatically cleaned between tests
  });

  it('should create a task', async () => {
    // Your test here
  });
});
```

#### Transport Tests
```typescript
import { ExtendedMcpServer } from '../utils/extended-mcp-server.js';
import { loadTodoService } from '../service/todo.js';

describe('HTTP Transport', () => {
  let server: ExtendedMcpServer;

  beforeEach(async () => {
    server = new ExtendedMcpServer({ name: 'test', version: '1.0.0' });
    await loadTodoService(server);
  });

  it('should handle tool calls', async () => {
    const result = await server.callTool('getLists', {});
    expect(result).toBeDefined();
  });
});
```

## 🔧 Development Workflow

### Code Quality Standards

```bash
# Linting (uses Biome)
npm run lint
npm run lint:fix

# Type checking
npm run compile

# Build
npm run build

# Format code
npm run format
```

### Database Development

#### Schema Changes
1. **Modify schema** in `src/db/schema.ts`
2. **Generate migration**: `npm run db:generate`
3. **Apply migration**: `npm run db:migrate`
4. **Update types**: TypeScript types are auto-generated
5. **Run tests**: Ensure all tests pass

#### Database Patterns
- Use `generatedAlwaysAsIdentity()` for primary keys
- Include `createdAt` timestamp with `defaultNow()`
- Use appropriate varchar lengths based on UI constraints
- Foreign keys should have proper references with cascade rules

### MCP Tool Development

#### Adding New Tools
1. **Define tool** in `src/service/todo.ts`:
```typescript
server.tool(
  "newTool",
  "Clear description of what this tool does",
  {
    // Zod schema for parameters
    param: z.string().describe("Parameter description"),
  },
  async (params) => {
    // Implementation
    return {
      content: [
        {
          type: "text",
          text: "Response text",
        },
      ],
    };
  }
);
```

2. **Add tests** for the new tool
3. **Update documentation** if it's user-facing

#### Tool Patterns
- Use descriptive names and descriptions
- Include parameter validation with Zod
- Provide clear error messages
- Format responses consistently
- Include relative timestamps where appropriate

### Transport Development

#### Adding New Transports
1. **Create transport file** in `src/transports/new-transport.ts`
2. **Implement transport interface**:
```typescript
export async function startNewTransport(
  server: ExtendedMcpServer,
  config: ApplicationConfig
) {
  // Transport implementation
}
```

3. **Add transport tests** 
4. **Update CLI options** in `src/index.ts`
5. **Add to documentation**

## 📦 Release Process

### Versioning
- Follow [Semantic Versioning](https://semver.org/)
- **Patch** (0.1.2 → 0.1.3): Bug fixes, documentation updates
- **Minor** (0.1.2 → 0.2.0): New features, backward compatible
- **Major** (0.1.2 → 1.0.0): Breaking changes

### Release Steps
1. **Create release branch**:
   ```bash
   git checkout -b release/v0.3.0
   ```

2. **Update version** in `package.json` and `src/index.ts`

3. **Update CHANGELOG.md** with release notes

4. **Run quality checks**:
   ```bash
   npm run test:coverage
   npm run lint
   npm run compile
   npm run build
   ```

5. **Create PR** with title "Release v0.3.0"

6. **After merge, create GitHub release**:
   - Tag format: `v0.3.0`
   - Include changelog in release notes
   - This triggers automatic NPM publishing

### Automated Publishing
- **Never run `npm publish` manually**
- GitHub Actions handles building and publishing
- CI runs tests on Node.js 18, 20, and 22
- Codecov integration for coverage reporting

## 🤝 Contributing Guidelines

### Before Contributing
1. **Check existing issues** for similar features/bugs
2. **Create an issue** for discussion if it's a significant change
3. **Fork the repository** and create a feature branch
4. **Write tests** for new functionality
5. **Update documentation** for user-facing changes

### Pull Request Process
1. **Branch naming**: `feature/description` or `fix/description`
2. **Commit messages**: Follow conventional commits
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `test:` - Adding or updating tests
   - `refactor:` - Code refactoring
   - `chore:` - Dependency updates, build changes

3. **PR checklist**:
   - [ ] `npm run test:coverage` passes
   - [ ] `npm run lint` passes without errors
   - [ ] `npm run compile` succeeds
   - [ ] `npm run build` creates clean distribution
   - [ ] Documentation updated for user-facing changes
   - [ ] Commit messages are descriptive

### Code Style
- **TypeScript**: Strict configuration with proper types
- **Biome**: Automatic formatting and linting
- **Zod**: Runtime validation for all inputs
- **Error Handling**: Comprehensive error handling with user-friendly messages

### Development Tips
- **Use `npm run test:coverage`** instead of `npm test` - we maintain 80% coverage
- **Database tests**: Use the test database and clean between tests
- **Transport tests**: Test all transport modes when adding new functionality
- **Priority handling**: Use the centralized priority utilities
- **Relative time**: Use `formatRelativeTime()` for consistent formatting

## 🔍 Debugging

### Development Debugging
```bash
# Debug mode with detailed logging
LOG_LEVEL=debug npm run dev

# Debug specific transport
LOG_LEVEL=debug npm run dev:http

# Debug CLI tools
LOG_LEVEL=debug npm run dev -- --transport cli --tool getLists
```

### Test Debugging
```bash
# Run single test file
npm run test -- src/transports/http.test.ts

# Run tests with verbose output
npm run test -- --reporter=verbose

# Debug test with UI
npm run test:ui
```

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/floriscornel/todo-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/floriscornel/todo-mcp/discussions)
- **MCP Documentation**: [Model Context Protocol](https://modelcontextprotocol.io/)

## 🙏 Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes for significant contributions
- Special thanks in documentation for architectural improvements

Thank you for contributing to Todo MCP! 🚀