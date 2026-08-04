import { z } from "zod";

export const createRepoSchema = z.object({
  name: z.string().min(1).max(200),
  sourceType: z.enum(["LOCAL_PATH", "GIT_URL"]),
  location: z.string().min(1).max(1000),
  defaultBranch: z.string().min(1).max(200).default("main"),
});

export const updateRepoSchema = createRepoSchema.partial();

export const createTaskSchema = z.object({
  name: z.string().min(1).max(200),
  repoId: z.string().min(1),
  prompt: z.string().min(1).max(20000),
  agent: z.string().max(200).nullish(),
  model: z.string().max(200).nullish(),
  fallbackModel: z.string().max(200).nullish(),
  contextTier: z.enum(["default", "long_context"]).nullish(),
  reasoningEffort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"]).nullish(),
  permissionMode: z.enum(["default", "full"]).default("default"),
  outputFormat: z.enum(["text", "json"]).default("text"),
  triggerType: z.enum(["MANUAL", "SCHEDULE", "WEBHOOK", "API"]),
  cronExpression: z.string().max(200).nullish(),
  webhookEvents: z.string().max(500).nullish(),
  enabled: z.boolean().default(true),
  useSafeBranch: z.boolean().default(true),
  waitForPreviousRuns: z.boolean().default(false),
  timeoutSeconds: z.number().int().min(30).max(86400).default(1800),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  permissionMode: z.enum(["default", "full"]).optional(),
  outputFormat: z.enum(["text", "json"]).optional(),
  enabled: z.boolean().optional(),
  useSafeBranch: z.boolean().optional(),
  waitForPreviousRuns: z.boolean().optional(),
  timeoutSeconds: z.number().int().min(30).max(86400).optional(),
});

export const createWebhookSchema = z.object({
  repoId: z.string().min(1),
});

export const createApiTokenSchema = z.object({
  name: z.string().min(1).max(200),
});
