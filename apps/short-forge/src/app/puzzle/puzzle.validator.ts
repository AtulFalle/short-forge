import { z } from 'zod';

export const PuzzleSchema = z.object({
  hook: z.string(),
  question: z.string(),
  code: z.string(),
  options: z.array(z.string()).length(3),
  answer: z.string(),
  explanation: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()),
});

export type Puzzle = z.infer<typeof PuzzleSchema>;

export const GeneratePuzzleSchema = z.object({
  topic: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
