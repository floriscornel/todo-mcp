import {
	integer,
	pgEnum,
	pgTable,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Priority enum - defined at database level for better type safety
export const priorityEnum = pgEnum("priority", [
	"low",
	"medium",
	"high",
	"urgent",
]);
export type Priority = (typeof priorityEnum.enumValues)[number];

// Zod enum for validation (synced with database enum)
export const priorityZodEnum = z.enum(priorityEnum.enumValues);

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
	priority: priorityEnum().notNull().default("medium"),
	listId: integer()
		.notNull()
		.references(() => listsTable.id),
});

// Auto-generated Zod schemas from Drizzle tables
// These are always in sync with the database schema
export const selectListSchema = createSelectSchema(listsTable);
export const insertListSchema = createInsertSchema(listsTable);
export const selectTaskSchema = createSelectSchema(tasksTable);
export const insertTaskSchema = createInsertSchema(tasksTable);

// Basic validation schemas without UI messages
export const createListSchema = z.object({
	name: z.string().min(1).max(255).trim(),
	description: z.string().max(500).trim().optional(),
});

export const updateListSchema = z.object({
	name: z.string().min(1).max(255).trim().optional(),
	description: z.string().max(500).trim().optional(),
	archivedAt: z.date().nullable().optional(),
});

export const createTaskSchema = z.object({
	name: z.string().min(5).max(120).trim(),
	description: z.string().max(500).trim().optional(),
	priority: priorityZodEnum.default("medium"),
	listId: z.number().int().positive(),
});

export const updateTaskSchema = z.object({
	name: z.string().min(5).max(120).trim().optional(),
	description: z.string().max(500).trim().optional(),
	priority: priorityZodEnum.optional(),
	listId: z.number().int().positive().optional(),
	completedAt: z.date().nullable().optional(),
	archivedAt: z.date().nullable().optional(),
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

// Priority utilities
export const priorityOrder: Record<Priority, number> = {
	urgent: 0,
	high: 1,
	medium: 2,
	low: 3,
};
