import type { FastifyReply } from "fastify";

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
};

const titles: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  422: "Unprocessable Entity"
};

export function problem(
  reply: FastifyReply,
  status: 400 | 404 | 422,
  detail: string,
  errors?: Record<string, string[]>
) {
  const body: ProblemDetails = {
    type: `https://httpstatuses.com/${status}`,
    title: titles[status] ?? "Error",
    status,
    detail,
    instance: reply.request.url
  };

  if (errors) {
    body.errors = errors;
  }

  return reply.code(status).type("application/problem+json").send(body);
}
