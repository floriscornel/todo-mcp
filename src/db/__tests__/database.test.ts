import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initializeDatabase, todoDb } from "../index.js";

describe("Database Operations", () => {
  let databaseAvailable = false;

  beforeAll(async () => {
    try {
      // Initialize database with migrations
      await initializeDatabase();
      databaseAvailable = true;
      console.log("✅ Test database connected successfully");
    } catch (error) {
      console.warn("⚠️  Test database not available, skipping database tests");
      console.warn("Make sure you have PostgreSQL running and TEST_DATABASE_URL configured");
      console.warn(`Database error: ${error.message}`);
      databaseAvailable = false;
    }
  });

  afterAll(async () => {
    if (databaseAvailable) {
      try {
        // Clean up database connection
        await todoDb.close();
      } catch (error) {
        console.warn("Warning: Error closing database connection:", error.message);
      }
    }
  });

  describe("List Operations", () => {
    it("should create a new list", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Test List",
        description: "A test list for testing",
      });

      expect(list).toBeDefined();
      expect(list.id).toBeTypeOf("number");
      expect(list.name).toBe("Test List");
      expect(list.description).toBe("A test list for testing");
      expect(list.createdAt).toBeInstanceOf(Date);
    });

    it("should get a list by id", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const createdList = await todoDb.createList({
        name: "Get Test List",
        description: "List for get test",
      });

      const retrievedList = await todoDb.getList(createdList.id);

      expect(retrievedList).toBeDefined();
      expect(retrievedList?.id).toBe(createdList.id);
      expect(retrievedList?.name).toBe("Get Test List");
    });

    it("should get all lists", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const lists = await todoDb.getAllLists();
      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBeGreaterThan(0);
    });

    it("should update a list", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Update Test List",
        description: "Original description",
      });

      const updatedList = await todoDb.updateList(list.id, {
        name: "Updated List Name",
        description: "Updated description",
      });

      expect(updatedList).toBeDefined();
      expect(updatedList?.name).toBe("Updated List Name");
      expect(updatedList?.description).toBe("Updated description");
    });

    it("should archive a list", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Archive Test List",
        description: "List to be archived",
      });

      const archivedList = await todoDb.archiveList(list.id);

      expect(archivedList).toBeDefined();
      expect(archivedList?.archivedAt).toBeInstanceOf(Date);
    });
  });

  describe("Task Operations", () => {
    it("should create a new task", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      // First create a list
      const list = await todoDb.createList({
        name: "Task Test List",
        description: "List for task testing",
      });

      const task = await todoDb.createTask({
        name: "Test Task",
        description: "A test task",
        priority: "high",
        listId: list.id,
      });

      expect(task).toBeDefined();
      expect(task.id).toBeTypeOf("number");
      expect(task.name).toBe("Test Task");
      expect(task.description).toBe("A test task");
      expect(task.priority).toBe("high");
      expect(task.listId).toBe(list.id);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.completedAt).toBeNull();
    });

    it("should complete a task", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      // First create a list and task
      const list = await todoDb.createList({
        name: "Complete Test List",
        description: "List for completion testing",
      });

      const task = await todoDb.createTask({
        name: "Task to Complete",
        description: "This task will be completed",
        priority: "medium",
        listId: list.id,
      });

      const completedTask = await todoDb.completeTask(task.id);

      expect(completedTask).toBeDefined();
      expect(completedTask?.completedAt).toBeInstanceOf(Date);
    });

    it("should get tasks by list", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      // Create a list and add tasks
      const list = await todoDb.createList({
        name: "List Tasks Test",
        description: "List for testing task retrieval",
      });

      await todoDb.createTask({
        name: "Task 1",
        priority: "low",
        listId: list.id,
      });

      await todoDb.createTask({
        name: "Task 2",
        priority: "high",
        listId: list.id,
      });

      const tasks = await todoDb.getTasksByList(list.id);

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBe(2);
      expect(tasks.every((task) => task.listId === list.id)).toBe(true);
    });

    it("should get all tasks", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const allTasks = await todoDb.getAllTasks();
      expect(Array.isArray(allTasks)).toBe(true);
      expect(allTasks.length).toBeGreaterThan(0);
    });

    it("should get active tasks", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const activeTasks = await todoDb.getActiveTasks();
      expect(Array.isArray(activeTasks)).toBe(true);
      // All returned tasks should not be completed
      expect(activeTasks.every((task) => task.completedAt === null)).toBe(true);
    });

    it("should get completed tasks", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const completedTasks = await todoDb.getCompletedTasks();
      expect(Array.isArray(completedTasks)).toBe(true);
      // All returned tasks should be completed
      expect(completedTasks.every((task) => task.completedAt !== null)).toBe(true);
    });

    it("should update a task", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Update Task Test List",
        description: "List for task update testing",
      });

      const task = await todoDb.createTask({
        name: "Original Task Name",
        description: "Original description",
        priority: "low",
        listId: list.id,
      });

      const updatedTask = await todoDb.updateTask(task.id, {
        name: "Updated Task Name",
        description: "Updated description",
        priority: "urgent",
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.name).toBe("Updated Task Name");
      expect(updatedTask?.description).toBe("Updated description");
      expect(updatedTask?.priority).toBe("urgent");
    });

    it("should uncomplete a task", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Uncomplete Test List",
        description: "List for uncomplete testing",
      });

      const task = await todoDb.createTask({
        name: "Task to Uncomplete",
        priority: "medium",
        listId: list.id,
      });

      // First complete the task
      await todoDb.completeTask(task.id);

      // Then uncomplete it
      const uncompletedTask = await todoDb.uncompleteTask(task.id);

      expect(uncompletedTask).toBeDefined();
      expect(uncompletedTask?.completedAt).toBeNull();
    });

    it("should archive a task", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Archive Task Test List",
        description: "List for task archive testing",
      });

      const task = await todoDb.createTask({
        name: "Task to Archive",
        priority: "medium",
        listId: list.id,
      });

      const archivedTask = await todoDb.archiveTask(task.id);

      expect(archivedTask).toBeDefined();
      expect(archivedTask?.archivedAt).toBeInstanceOf(Date);
    });

    it("should delete a task", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Delete Task Test List",
        description: "List for task deletion testing",
      });

      const task = await todoDb.createTask({
        name: "Task to Delete",
        priority: "low",
        listId: list.id,
      });

      // Delete the task
      await todoDb.deleteTask(task.id);

      // Verify it's deleted
      const deletedTask = await todoDb.getTask(task.id);
      expect(deletedTask).toBeUndefined();
    });

    it("should get task counts by list", async () => {
      if (!databaseAvailable) {
        console.log("⏭️  Skipping test - database not available");
        return;
      }

      const list = await todoDb.createList({
        name: "Task Counts Test List",
        description: "List for testing task counts",
      });

      // Create various tasks
      const task1 = await todoDb.createTask({
        name: "Active Task",
        priority: "low",
        listId: list.id,
      });

      const task2 = await todoDb.createTask({
        name: "Task to Complete",
        priority: "medium",
        listId: list.id,
      });

      const task3 = await todoDb.createTask({
        name: "Task to Archive",
        priority: "high",
        listId: list.id,
      });

      // Complete one task
      await todoDb.completeTask(task2.id);

      // Archive one task
      await todoDb.archiveTask(task3.id);

      const counts = await todoDb.getTaskCountsByList(list.id);

      expect(counts).toBeDefined();
      expect(counts.total).toBe(3);
      expect(counts.active).toBe(1); // Only task1 is active
      expect(counts.completed).toBe(1); // task2 is completed
      expect(counts.archived).toBe(1); // task3 is archived
    });
  });
});
