import { integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

// Priority enum
export const priorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export type Priority = z.infer<typeof priorityEnum>;

// Lists table
export const listsTable = pgTable("lists", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 500 }),
  createdAt: timestamp().notNull().defaultNow(),
  archivedAt: timestamp(),
});

// Tasks table
export const tasksTable = pgTable("tasks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: varchar({ length: 1000 }),
  createdAt: timestamp().notNull().defaultNow(),
  completedAt: timestamp(),
  archivedAt: timestamp(),
  priority: varchar({ length: 20 }).notNull().default("medium"),
  listId: integer()
    .notNull()
    .references(() => listsTable.id),
});

// Manual Zod schemas for validation
export const createListSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  archivedAt: z.date().optional(),
});

export const createTaskSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  priority: priorityEnum.default("medium"),
  listId: z.number().int().positive(),
});

export const updateTaskSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  priority: priorityEnum.optional(),
  completedAt: z.date().nullable().optional(),
  archivedAt: z.date().nullable().optional(),
  listId: z.number().int().positive().optional(),
});

// Database result types (inferred from tables)
export type SelectList = typeof listsTable.$inferSelect;
export type InsertList = typeof listsTable.$inferInsert;
export type SelectTask = typeof tasksTable.$inferSelect;
export type InsertTask = typeof tasksTable.$inferInsert;

// Input validation types
export type CreateList = z.infer<typeof createListSchema>;
export type UpdateList = z.infer<typeof updateListSchema>;
export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
