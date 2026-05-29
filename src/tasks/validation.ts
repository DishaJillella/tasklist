import { z } from "zod";

export const taskStatuses = ["todo", "in_progress", "done"] as const;
export const taskPriorities = ["low", "med", "high"] as const;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO date in YYYY-MM-DD format")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Must be a valid calendar date");

const title = z.string().trim().min(1, "Title is required");

export const createTaskSchema = z
  .object({
    title,
    description: z.string().trim().nullable().optional(),
    status: z.enum(taskStatuses).optional(),
    priority: z.enum(taskPriorities).optional(),
    due_date: isoDate.nullable().optional()
  })
  .strict();

export const patchTaskSchema = z
  .object({
    title: title.optional(),
    description: z.string().trim().nullable().optional(),
    status: z.enum(taskStatuses).optional(),
    priority: z.enum(taskPriorities).optional(),
    due_date: isoDate.nullable().optional()
  })
  .strict();

export const listTasksQuerySchema = z
  .object({
    status: z.enum(taskStatuses).optional()
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];

export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "body";
    formatted[path] ??= [];
    formatted[path].push(issue.message);
  }

  return formatted;
}
