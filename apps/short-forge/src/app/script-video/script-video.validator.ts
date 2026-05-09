import { z } from 'zod';
import { SCRIPT_VIDEO_LIMITS } from './script-video.limits';

const TrimmedOptionalString = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .optional();

export const CreateScriptVideoJobSchema = z
  .object({
    prompt: TrimmedOptionalString(SCRIPT_VIDEO_LIMITS.maxPromptChars),
    script: TrimmedOptionalString(SCRIPT_VIDEO_LIMITS.maxScriptChars),
    tone: TrimmedOptionalString(40).default('curious'),
    style: TrimmedOptionalString(60).default('mini-blog'),
    audience: TrimmedOptionalString(60).default('general'),
    durationSec: z
      .number()
      .int()
      .min(SCRIPT_VIDEO_LIMITS.minDurationSec)
      .max(SCRIPT_VIDEO_LIMITS.maxDurationSec)
      .default(SCRIPT_VIDEO_LIMITS.defaultDurationSec),
    language: TrimmedOptionalString(30).default('English'),
  })
  .refine((value) => Boolean(value.prompt || value.script), {
    message: 'Either prompt or script is required.',
    path: ['prompt'],
  });

export type CreateScriptVideoJobInput = z.infer<typeof CreateScriptVideoJobSchema>;

export const ScriptVideoStageSchema = z.enum([
  'brief_created',
  'outline_generated',
  'outline_approved',
  'script_generated',
  'script_approved',
  'storyboard_generated',
  'storyboard_approved',
  'preview_rendered',
  'final_rendered',
  'failed',
]);

export type ScriptVideoStage = z.infer<typeof ScriptVideoStageSchema>;

export const ScriptVideoJobSchema = z.object({
  id: z.string().uuid(),
  stage: ScriptVideoStageSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  error: z.string().optional(),
});

export type ScriptVideoJob = z.infer<typeof ScriptVideoJobSchema>;

export const ScriptVideoBriefSchema = z.object({
  sourceType: z.enum(['prompt', 'script']),
  prompt: z.string().optional(),
  suppliedScript: z.string().optional(),
  topic: z.string(),
  tone: z.string(),
  style: z.string(),
  audience: z.string(),
  durationSec: z.number().int().min(SCRIPT_VIDEO_LIMITS.minDurationSec).max(SCRIPT_VIDEO_LIMITS.maxDurationSec),
  language: z.literal('English'),
  sourceNotes: z.array(z.string()).default([]),
});

export type ScriptVideoBrief = z.infer<typeof ScriptVideoBriefSchema>;

export const ScriptVideoOutlineSchema = z.object({
  title: z.string().trim().min(1).max(90),
  hook: z.string().trim().min(1).max(SCRIPT_VIDEO_LIMITS.maxHookChars),
  beats: z.array(z.string().trim().min(1).max(160)).min(3).max(6),
  closing: z.string().trim().min(1).max(160),
});

export type ScriptVideoOutline = z.infer<typeof ScriptVideoOutlineSchema>;

export const ScriptVideoScriptSchema = z.object({
  title: z.string().trim().min(1).max(90),
  narration: z.array(z.string().trim().min(1).max(700)).min(3).max(8),
  closing: z.string().trim().min(1).max(300),
});

export type ScriptVideoScript = z.infer<typeof ScriptVideoScriptSchema>;

export const ScriptVideoSceneSchema = z.object({
  narration: z.string().trim().min(1).max(700),
  visualText: z.string().trim().min(1).max(SCRIPT_VIDEO_LIMITS.maxVisualTextChars),
  backgroundPrompt: z.string().trim().min(1).max(280),
  mood: z.string().trim().min(1).max(60),
  durationSec: z.number().min(1).max(20),
});

export const ScriptVideoStoryboardSchema = z.object({
  title: z.string().trim().min(1).max(90),
  hook: z.string().trim().min(1).max(SCRIPT_VIDEO_LIMITS.maxHookChars),
  scenes: z.array(ScriptVideoSceneSchema).min(SCRIPT_VIDEO_LIMITS.minScenes).max(SCRIPT_VIDEO_LIMITS.maxScenes),
  closing: z.string().trim().min(1).max(300),
});

export type ScriptVideoStoryboard = z.infer<typeof ScriptVideoStoryboardSchema>;

