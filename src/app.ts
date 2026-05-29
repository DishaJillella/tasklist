import sensible from "@fastify/sensible";
import Fastify from "fastify";
import { createDb } from "./db/client.js";
import { problem } from "./tasks/problem.js";
import { DrizzleTaskRepository, type TaskRepository } from "./tasks/repository.js";
import { registerTaskRoutes } from "./tasks/routes.js";

export async function buildApp(repository?: TaskRepository) {
  const app = Fastify({ logger: false });
  await app.register(sensible);

  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof error === "object" && error !== null && "statusCode" in error
        ? error.statusCode
        : undefined;

    if (statusCode === 400) {
      return problem(reply, 400, "Request body must be valid JSON");
    }

    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  });

  const taskRepository = repository ?? new DrizzleTaskRepository(createDb());
  await registerTaskRoutes(app, taskRepository);

  return app;
}
