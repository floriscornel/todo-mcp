# Todo MCP

[![npm version](https://img.shields.io/npm/v/@floriscornel/todo-mcp.svg)](https://www.npmjs.com/package/@floriscornel/todo-mcp)
[![npm downloads](https://img.shields.io/npm/dm/@floriscornel/todo-mcp.svg)](https://www.npmjs.com/package/@floriscornel/todo-mcp)
[![codecov](https://codecov.io/gh/floriscornel/todo-mcp/graph/badge.svg)](https://app.codecov.io/gh/floriscornel/todo-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/floriscornel/todo-mcp.svg)](https://github.com/floriscornel/todo-mcp/stargazers)

A simple, powerful Todo list manager for Claude Desktop and other MCP-compatible AI assistants. Organize your tasks across different projects with priorities and never lose track of what needs to be done!

## ✨ Features

- 📝 **Simple Task Management** - Create, complete, and archive tasks
- 📂 **Project Organization** - Separate tasks by lists (perfect for different codebases/projects)
- 🎯 **Priority System** - Low, Medium, High, and Urgent priorities
- 🕒 **Time Tracking** - Automatic timestamps for creation, completion, and archiving
- 🔍 **Smart Sorting** - Tasks sorted by priority and age automatically
- 💾 **Persistent Storage** - Uses PostgreSQL for reliable data storage

## 🚀 Quick Start

### Step 1: Install Database (Choose One)

#### Option A: DBngin (Recommended for Mac Users) 🍎
1. Download [DBngin](https://dbngin.com/) - A simple database manager for Mac
2. Install and open DBngin
3. Click "+" and select PostgreSQL
4. Start the PostgreSQL server
5. Create two databases:
   - `todo_mcp` (for your tasks)
   - `todo_mcp_test` (for testing)

#### Option B: Docker Compose (Cross-Platform) 🐳
1. Create a `docker-compose.yml` file:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: todo_mcp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

2. Run: `docker-compose up -d`
3. Create test database: `docker exec -it <container_name> createdb -U postgres todo_mcp_test`

### Step 2: Configure Claude Desktop

Add this to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "todo-mcp": {
      "command": "npx",
      "args": ["-y", "@floriscornel/todo-mcp@latest"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/todo_mcp"
      }
    }
  }
}
```

### Step 3: Start Using! 🎉

Ask Claude things like:
- "Create a new list called 'Frontend Project'"
- "Add a task to fix the login bug with high priority"
- "Show me all my urgent tasks"
- "Complete the task about updating dependencies"

## 💡 Real-World Examples

### 🔄 **Code Review Workflow**
```
You: "I'm reviewing this PR and found several issues. Can you help me track them?"

Claude: "I'll help you create tasks for the issues you found. First, let me create a list for this PR."

You: "Create a list called 'PR-123 Review Issues'"

Claude: *Creates the list*

You: "Add these tasks:
- Fix memory leak in UserService (high priority)
- Add error handling for API calls (medium)
- Update outdated dependencies (low)
- Add unit tests for new features (high)"

Claude: *Creates all tasks with appropriate priorities*

You: "Show me the high priority items first"
```

### 🐛 **Bug Triage Session**
```
You: "I just got 5 bug reports from users. Help me organize them by priority."

Claude: "Let me create a 'Bug Reports - Sprint 24' list and add these issues. What are the bugs?"

You: "Login fails on mobile Safari, checkout process crashes, slow page load, typo in footer, and dark mode toggle broken"

Claude: *Creates tasks and asks about severity*

Claude: "I've added these. The login and checkout issues sound urgent - should I mark them as high priority?"

You: "Yes, and show me all urgent tasks across all my lists so I can plan my day"
```

### 🚀 **Feature Development Planning**
```
You: "I'm starting work on a new dashboard feature. Help me break it down into tasks."

Claude: "Great! Let me create a 'Dashboard Feature' list. What components do you need to build?"

You: "I need to design the layout, create API endpoints, build the frontend components, write tests, and update documentation"

Claude: *Creates structured tasks*

Claude: "I've created tasks for each component. Should I mark the API endpoints as high priority since the frontend depends on them?"

You: "Perfect! Also add a task to review the design with the team before I start coding"
```

### 📚 **Learning & Research Tracking**
```
You: "I'm learning React Native. Can you help me track my progress?"

Claude: "I'll create a 'React Native Learning' list. What topics do you want to cover?"

You: "Navigation, state management, API integration, testing, and deployment"

Claude: *Creates learning tasks*

You: "I just finished the navigation tutorial. Mark that as complete and show me what's next"

Claude: "Great progress! Next up is state management. I can also help you find resources for that topic."
```

### 🔧 **Refactoring Project**
```
You: "I need to refactor this legacy codebase. There's so much to do, I don't know where to start."

Claude: "Let's break it down systematically. I'll create a 'Legacy Refactor' list. What are the main areas that need work?"

You: "Database queries are slow, no error handling, outdated dependencies, no tests, and the UI is a mess"

Claude: *Creates organized tasks with priorities*

Claude: "I've prioritized database performance and error handling as urgent since they affect users directly. Want me to help you tackle the database issues first?"
```

### 🎯 **Daily Standup Preparation**
```
You: "What did I work on yesterday and what should I focus on today?"

Claude: "Let me check your completed tasks from yesterday and show you today's priorities."

*Shows completed tasks and upcoming high-priority items*

Claude: "Yesterday you completed the user authentication fix and API documentation. Today's urgent tasks are the payment gateway integration and the mobile responsive fixes."

You: "Perfect! Add a new task to review the payment gateway with the security team before deploying"
```

### 🏃‍♂️ **Sprint Planning**
```
You: "Help me plan this 2-week sprint. I have tasks scattered across different lists."

Claude: "I'll show you all your tasks grouped by priority. Which lists should I include in the sprint planning?"

You: "Include 'Frontend Bugs', 'API Development', and 'User Stories - Q4'"

Claude: *Aggregates and prioritizes tasks*

Claude: "Here are your urgent and high-priority tasks. Based on your usual velocity, I'd recommend focusing on these 8 tasks for the sprint. Should I create a 'Sprint 12' list to track them?"
```

### 🔍 **Code Investigation**
```
You: "This function is behaving weirdly. Help me track what I need to investigate."

Claude: "I'll create an 'Investigation - UserAuth Bug' list. What symptoms are you seeing?"

You: "Users can't log in on weekends, but weekdays work fine. It's bizarre."

Claude: "That is strange! Let me add investigation tasks:
- Check server logs for weekend patterns
- Review cron jobs and scheduled tasks  
- Test with different user accounts
- Check database connection pooling
- Review load balancer configuration"

You: "Great breakdown! I just checked the logs - mark that complete and add a task to check if our SSL certificate renewal happens on weekends"
```

## 🎨 **IDE Integration Benefits**

### **Claude Desktop**
- **Persistent Context**: Your tasks persist across conversations
- **Natural Language**: "Show me what I was working on last week"
- **Smart Prioritization**: Claude can help reprioritize based on deadlines

### **VS Code / Cursor**
- **Code-Aware Tasks**: "Add a task to refactor this function" (while viewing code)
- **Context Switching**: Quickly switch between coding and task management
- **Inline Planning**: Plan refactoring while reviewing code

### **Cross-Session Continuity**
- **Pick Up Where You Left Off**: "What was I working on before the meeting?"
- **Team Handoffs**: "Show the new developer what needs to be done on this feature"
- **Progress Tracking**: "How much of the authentication system is complete?"

## 🧪 Testing MCP Tools Directly

The todo-mcp includes an `ExtendedMcpServer` class that makes it easy to test MCP tools directly without setting up transports. This is perfect for:

- **Unit Testing** - Test individual tools in isolation
- **Integration Testing** - Test workflows with multiple tool calls  
- **Development & Debugging** - Explore tool behavior during development
- **API Exploration** - Programmatically discover tool capabilities

### Quick Example

```typescript
import { ExtendedMcpServer } from "@floriscornel/todo-mcp/utils";
import { loadTodoService } from "@floriscornel/todo-mcp/service";
import { initializeDatabase } from "@floriscornel/todo-mcp/db";

// Initialize
await initializeDatabase();
const server = new ExtendedMcpServer({ name: "test", version: "1.0.0" });
await loadTodoService(server);

// Call tools directly
const result = await server.callTool("createList", {
  name: "My Test List",
  description: "Created via direct tool call"
});

// Batch operations
const results = await server.callTools([
  { tool: "getLists", parameters: { random_string: "test" } },
  { tool: "createTask", parameters: { list: "My Test List", name: "Test task" } }
]);

// Tool introspection
const toolNames = server.getToolNames(); // ["getLists", "createList", ...]
const toolInfo = server.getToolInfo("createTask"); // Full tool metadata
const hasTools = server.hasTool("getTasks"); // true
```

### Available Testing Methods

| Method | Purpose | 
|--------|---------|
| `callTool(name, params)` | Execute a single tool with parameters |
| `callTools(calls)` | Execute multiple tools in sequence |
| `getToolNames()` | List all available tool names |
| `getToolInfo(name)` | Get detailed tool information |
| `hasTool(name)` | Check if a tool exists |
| `getToolsMetadata()` | Get metadata for all tools |

### Example Script

Check out the complete example at [`examples/test-tools-directly.ts`](examples/test-tools-directly.ts) which demonstrates:

- Tool discovery and introspection
- Creating lists and tasks
- Error handling and validation
- Batch operations
- Integration testing patterns

This makes the todo-mcp project highly testable and provides a solid foundation for building reliable MCP-based applications.

## 📖 How It Works

### Lists
Think of lists as different projects or categories:
- **Frontend Repo** - Tasks for your React app
- **Backend API** - Server-side todos
- **Personal** - Non-work related tasks

### Tasks
Each task has:
- **Name** (5-120 characters) - Keep it concise and actionable
- **Description** (optional, up to 500 characters) - Add details if needed
- **Priority** - Low → Medium → High → Urgent
- **Timestamps** - When created, completed, or archived

### Smart Organization
- Tasks are automatically sorted by priority (urgent first) and age
- Completed tasks are kept for reference but don't clutter your active list
- Archive tasks when they're no longer relevant

## 🛠️ Available Commands

The MCP provides these tools for Claude:

- `getLists()` - Show all your project lists
- `createList(name, description?)` - Create a new project list
- `getTasks(list, includeCompleted?)` - Get tasks from a specific list
- `createTask(list, name, description?, priority?)` - Add a new task
- `completeTask(taskId)` - Mark a task as done
- `archiveTask(taskId)` - Archive a task (removes from active view)

## 🔧 Configuration

### Environment Variables

```bash
# Main database (required)
DATABASE_URL="postgresql://username:password@localhost:5432/todo_mcp"

# Test database (optional, for development)
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/todo_mcp_test"
```

### Database Connection Examples

```bash
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo_mcp"

# Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo_mcp"

# Remote database (replace with your details)
DATABASE_URL="postgresql://user:pass@your-db-host:5432/todo_mcp"
```

## 🧪 Development

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Setup
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

# Run tests
npm test

# Start development
npm run dev
```

### Testing
```bash
npm test                    # Run tests once
npm run test:watch         # Run tests in watch mode  
npm run test:coverage      # Run tests with coverage report
```

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `npm test`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines
- Write tests for new features
- Follow the existing code style (we use Biome for formatting)
- Update documentation for user-facing changes
- Keep commits focused and descriptive

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with the [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Uses [Drizzle ORM](https://orm.drizzle.team/) for database operations
- Inspired by the need for better task management in AI-assisted development

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/floriscornel/todo-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/floriscornel/todo-mcp/discussions)
- **Documentation**: [MCP Documentation](https://modelcontextprotocol.io/)

## 🗺️ Roadmap

- [ ] Web interface for task management
- [ ] Task due dates and reminders
- [ ] Task dependencies and subtasks
- [ ] Export/import functionality
- [ ] Team collaboration features
- [ ] Integration with popular task managers

---

**Made with ❤️ for the AI-assisted development community**
