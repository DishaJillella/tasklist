import type { FastifyInstance } from "fastify";
import { problem } from "./problem.js";
import type { TaskRepository } from "./repository.js";
import {
  createTaskSchema,
  formatZodErrors,
  listTasksQuerySchema,
  patchTaskSchema
} from "./validation.js";

export async function registerTaskRoutes(app: FastifyInstance, repository: TaskRepository) {
  app.post("/tasks", async (request, reply) => {
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 422, "Task payload is invalid", formatZodErrors(parsed.error));
    }

    const task = await repository.create(parsed.data);
    return reply.code(201).send(task);
  });

  app.get("/tasks", async (request, reply) => {
    const parsed = listTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return problem(reply, 422, "Task query is invalid", formatZodErrors(parsed.error));
    }

    return repository.list(parsed.data.status);
  });

  app.patch<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const parsed = patchTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return problem(reply, 422, "Task patch is invalid", formatZodErrors(parsed.error));
    }

    const task = await repository.update(request.params.id, parsed.data);
    if (!task) {
      return problem(reply, 404, "Task was not found");
    }

    return task;
  });

  app.delete<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const deleted = await repository.delete(request.params.id);
    if (!deleted) {
      return problem(reply, 404, "Task was not found");
    }

    return reply.code(204).send();
  });
}
