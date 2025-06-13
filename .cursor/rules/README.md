# Cursor Rules for Todo MCP

This directory contains Cursor rules that enforce development workflow and coding standards for the todo-mcp project.

## Rules Overview

### 🔄 **development-workflow.mdc** (Always Applied)
Core development practices including:
- **Testing**: Always use `npm run test:coverage` instead of `npm test`
- **Commit Structure**: Conventional commits format
- **Branch Workflow**: Feature branches with proper naming
- **Publication**: Never run `npm publish` manually - use GitHub releases

### 🧪 **testing-standards.mdc** (Auto-Attached to test files)
Testing guidelines that activate when working with test files:
- 80% coverage requirements
- Test structure and naming conventions
- Database testing patterns
- Mock strategies

### 🔄 **pr-automation.mdc** (Manual)
PR creation and automated review preparation:
- Pre-PR quality checklist
- PR description templates for GitHub Copilot
- CI validation requirements

### 🗄️ **database-patterns.mdc** (Auto-Attached to DB files)
Database development with Drizzle ORM:
- Schema change workflow
- Migration best practices
- Type-safe database operations
- Connection management

### 🚀 **release-management.mdc** (Manual)
Release and versioning workflow:
- Semantic versioning guidelines
- GitHub release process
- Automated NPM publishing via CI
- Pre-release checklists

### 🔧 **mcp-development.mdc** (Auto-Attached to MCP files)
Model Context Protocol development patterns:
- Tool definition structure
- Parameter validation with Zod
- Response formatting standards
- Error handling patterns

## Usage

### Always Active
- `development-workflow.mdc` - Core practices always in context

### Auto-Attached
Rules automatically activate when working with matching files:
- Test files → `testing-standards.mdc`
- Database files → `database-patterns.mcp`
- MCP files → `mcp-development.mcp`

### Manual Invocation
Use `@ruleName` to explicitly reference:
- `@pr-automation` - When creating PRs
- `@release-management` - When preparing releases

## Key Principles

1. **Coverage Over Tests**: Always run coverage, maintain 80% thresholds
2. **Structured Commits**: Conventional format for automated processing
3. **Automated Publishing**: GitHub releases trigger NPM publication
4. **Type Safety**: Zod validation throughout the stack
5. **Copilot-Ready**: PRs structured for automated review

## Quick Commands

```bash
# Development
npm run test:coverage    # Always use this instead of npm test
npm run lint:fix        # Fix code style
npm run compile         # TypeScript check

# Database  
npm run db:generate     # Generate migrations
npm run db:migrate      # Apply migrations

# Build
npm run build          # Production build
```

These rules ensure consistent development practices for solo open source development with automated CI/CD and GitHub Copilot integration. 