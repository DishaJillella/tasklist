import type { Task, TaskRepository } from "../src/tasks/repository.js";
import type { CreateTaskInput, PatchTaskInput, TaskStatus } from "../src/tasks/validation.js";
import { buildApp } from "../src/app.js";

class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();
  private nextId = 1;

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date("2026-05-29T00:00:00.000Z").toISOString();
    const task: Task = {
      id: `task_${this.nextId++}`,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "med",
      due_date: input.due_date ?? null,
      created_at: now,
      updated_at: now
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async list(status?: TaskStatus): Promise<Task[]> {
    const tasks = [...this.tasks.values()];
    return status ? tasks.filter((task) => task.status === status) : tasks;
  }

  async update(id: string, input: PatchTaskInput): Promise<Task | null> {
    const existing = this.tasks.get(id);
    if (!existing) return null;

    const updated: Task = {
      ...existing,
      title: input.title ?? existing.title,
      description: "description" in input ? input.description ?? null : existing.description,
      status: input.status ?? existing.status,
      priority: input.priority ?? existing.priority,
      due_date: "due_date" in input ? input.due_date ?? null : existing.due_date,
      updated_at: new Date("2026-05-29T00:01:00.000Z").toISOString()
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
}

async function setup() {
  const repository = new InMemoryTaskRepository();
  const app = await buildApp(repository);
  return { app, repository };
}

describe("task routes", () => {
  it("creates a task with defaults", async () => {
    const { app } = await setup();

    const response = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "Write project brief" }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: "task_1",
      title: "Write project brief",
      description: null,
      status: "todo",
      priority: "med",
      due_date: null
    });
  });

  it("rejects invalid create payloads with problem details", async () => {
    const { app } = await setup();

    const response = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "", priority: "urgent" }
    });

    expect(response.statusCode).toBe(422);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.json()).toMatchObject({
      status: 422,
      title: "Unprocessable Entity"
    });
  });

  it("lists tasks and filters by status", async () => {
    const { app } = await setup();
    await app.inject({ method: "POST", url: "/tasks", payload: { title: "Todo" } });
    await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "Done", status: "done" }
    });

    const all = await app.inject({ method: "GET", url: "/tasks" });
    const done = await app.inject({ method: "GET", url: "/tasks?status=done" });

    expect(all.statusCode).toBe(200);
    expect(all.json()).toHaveLength(2);
    expect(done.statusCode).toBe(200);
    expect(done.json()).toMatchObject([{ title: "Done", status: "done" }]);
  });

  it("rejects invalid status filters", async () => {
    const { app } = await setup();

    const response = await app.inject({ method: "GET", url: "/tasks?status=blocked" });

    expect(response.statusCode).toBe(422);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("partially updates a task and preserves omitted fields", async () => {
    const { app } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: {
        title: "Draft",
        description: "Initial text",
        priority: "high",
        due_date: "2026-06-15"
      }
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/tasks/${created.json().id}`,
      payload: { status: "in_progress" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      title: "Draft",
      description: "Initial text",
      status: "in_progress",
      priority: "high",
      due_date: "2026-06-15"
    });
  });

  it("treats repeated patches as idempotent final state", async () => {
    const { app } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "Patch me" }
    });
    const id = created.json().id;
    const patch = { title: "Patched", status: "done", due_date: null };

    const first = await app.inject({ method: "PATCH", url: `/tasks/${id}`, payload: patch });
    const second = await app.inject({ method: "PATCH", url: `/tasks/${id}`, payload: patch });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({
      id,
      title: "Patched",
      status: "done",
      due_date: null
    });
  });

  it("rejects invalid patches without updating the task", async () => {
    const { app } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "Keep me" }
    });
    const id = created.json().id;

    const invalid = await app.inject({
      method: "PATCH",
      url: `/tasks/${id}`,
      payload: { status: "blocked" }
    });
    const tasks = await app.inject({ method: "GET", url: "/tasks" });

    expect(invalid.statusCode).toBe(422);
    expect(invalid.headers["content-type"]).toContain("application/problem+json");
    expect(tasks.json()[0]).toMatchObject({ id, title: "Keep me", status: "todo" });
  });

  it("returns not found for missing patch targets", async () => {
    const { app } = await setup();

    const response = await app.inject({
      method: "PATCH",
      url: "/tasks/missing",
      payload: { status: "done" }
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("deletes an existing task", async () => {
    const { app } = await setup();
    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      payload: { title: "Delete me" }
    });

    const response = await app.inject({ method: "DELETE", url: `/tasks/${created.json().id}` });
    const list = await app.inject({ method: "GET", url: "/tasks" });

    expect(response.statusCode).toBe(204);
    expect(list.json()).toEqual([]);
  });

  it("returns not found for missing delete targets", async () => {
    const { app } = await setup();

    const response = await app.inject({ method: "DELETE", url: "/tasks/missing" });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });

  it("returns bad request problem details for malformed JSON", async () => {
    const { app } = await setup();

    const response = await app.inject({
      method: "POST",
      url: "/tasks",
      headers: { "content-type": "application/json" },
      payload: "{"
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain("application/problem+json");
  });
});
