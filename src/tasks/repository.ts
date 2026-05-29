import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import * as schema from "../db/schema.js";
import { tasks, type TaskRow } from "../db/schema.js";
import type { CreateTaskInput, PatchTaskInput, TaskStatus } from "./validation.js";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "med" | "high";
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export interface TaskRepository {
  create(input: CreateTaskInput): Promise<Task>;
  list(status?: TaskStatus): Promise<Task[]>;
  update(id: string, input: PatchTaskInput): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}

type DrizzleDb = NodePgDatabase<typeof schema>;

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly db: DrizzleDb) {}

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date();
    const [row] = await this.db
      .insert(tasks)
      .values({
        id: randomUUID(),
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "todo",
        priority: input.priority ?? "med",
        dueDate: input.due_date ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    if (!row) {
      throw new Error("Task insert did not return a row");
    }

    return toTask(row);
  }

  async list(status?: TaskStatus): Promise<Task[]> {
    const rows = status
      ? await this.db.select().from(tasks).where(eq(tasks.status, status))
      : await this.db.select().from(tasks);

    return rows.map(toTask);
  }

  async update(id: string, input: PatchTaskInput): Promise<Task | null> {
    const values: Partial<typeof tasks.$inferInsert> = {
      updatedAt: new Date()
    };

    if ("title" in input) values.title = input.title;
    if ("description" in input) values.description = input.description ?? null;
    if ("status" in input) values.status = input.status;
    if ("priority" in input) values.priority = input.priority;
    if ("due_date" in input) values.dueDate = input.due_date ?? null;

    const [row] = await this.db.update(tasks).set(values).where(eq(tasks.id, id)).returning();
    return row ? toTask(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
    return rows.length > 0;
  }
}

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    due_date: row.dueDate,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString()
  };
}
