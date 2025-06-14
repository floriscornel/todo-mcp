import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema.js";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/todo_mcp";

// Create PostgreSQL connection
const sql = postgres(connectionString, {
  max: 1, // Single connection for local development
  onnotice: () => {
    // Intentionally empty - suppress PostgreSQL notices to prevent stdout pollution
  },
});

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// Migration function
export async function runMigrations() {
  const migrationsPath = path.join(__dirname, "../../migrations");
  await migrate(db, { migrationsFolder: migrationsPath });
}

// Database operations
export class TodoDatabase {
  // List operations
  async createList(data: schema.CreateList): Promise<schema.SelectList> {
    const [list] = await db.insert(schema.listsTable).values(data).returning();
    return list;
  }

  async getList(id: number): Promise<schema.SelectList | undefined> {
    const result = await db.select().from(schema.listsTable).where(eq(schema.listsTable.id, id));
    return result[0];
  }

  async getAllLists(): Promise<schema.SelectList[]> {
    return await db.select().from(schema.listsTable).where(isNull(schema.listsTable.archivedAt));
  }

  async updateList(id: number, data: schema.UpdateList): Promise<schema.SelectList | undefined> {
    const [list] = await db
      .update(schema.listsTable)
      .set(data)
      .where(eq(schema.listsTable.id, id))
      .returning();
    return list;
  }

  async archiveList(id: number): Promise<schema.SelectList | undefined> {
    return await this.updateList(id, { archivedAt: new Date() });
  }

  // Task operations
  async createTask(data: schema.CreateTask): Promise<schema.SelectTask> {
    const [task] = await db.insert(schema.tasksTable).values(data).returning();
    return task;
  }

  async getTask(id: number): Promise<schema.SelectTask | undefined> {
    const result = await db.select().from(schema.tasksTable).where(eq(schema.tasksTable.id, id));
    return result[0];
  }

  async getTasksByList(listId: number): Promise<schema.SelectTask[]> {
    return await db.select().from(schema.tasksTable).where(eq(schema.tasksTable.listId, listId));
  }

  async getAllTasks(): Promise<schema.SelectTask[]> {
    return await db.select().from(schema.tasksTable);
  }

  async getActiveTasks(): Promise<schema.SelectTask[]> {
    return await db.select().from(schema.tasksTable).where(isNull(schema.tasksTable.completedAt));
  }

  async getCompletedTasks(): Promise<schema.SelectTask[]> {
    return await db
      .select()
      .from(schema.tasksTable)
      .where(isNotNull(schema.tasksTable.completedAt));
  }

  async updateTask(id: number, data: schema.UpdateTask): Promise<schema.SelectTask | undefined> {
    const [task] = await db
      .update(schema.tasksTable)
      .set(data)
      .where(eq(schema.tasksTable.id, id))
      .returning();
    return task;
  }

  async completeTask(id: number): Promise<schema.SelectTask | undefined> {
    return await this.updateTask(id, { completedAt: new Date() });
  }

  async uncompleteTask(id: number): Promise<schema.SelectTask | undefined> {
    return await this.updateTask(id, { completedAt: null });
  }

  async archiveTask(id: number): Promise<schema.SelectTask | undefined> {
    return await this.updateTask(id, { archivedAt: new Date() });
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(schema.tasksTable).where(eq(schema.tasksTable.id, id));
  }

  // Get task counts for a specific list
  async getTaskCountsByList(listId: number): Promise<{
    total: number;
    active: number;
    completed: number;
    archived: number;
  }> {
    const tasks = await this.getTasksByList(listId);

    const total = tasks.length;
    const active = tasks.filter((t) => !t.completedAt && !t.archivedAt).length;
    const completed = tasks.filter((t) => t.completedAt && !t.archivedAt).length;
    const archived = tasks.filter((t) => t.archivedAt).length;

    return { total, active, completed, archived };
  }

  // Utility methods
  async close(): Promise<void> {
    await sql.end();
  }
}

// Export singleton instance
export const todoDb = new TodoDatabase();
