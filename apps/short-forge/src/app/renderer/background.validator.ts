import { z } from 'zod';

const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export const BackgroundBriefSchema = z.object({
  prompt: z.string().min(20).max(1600),
  negativePrompt: z
    .string()
    .max(500)
    .default('readable foreground text, large letters, watermark, UI mockup, bright center'),
  overlayOpacity: z.number().min(0.42).max(0.78).default(0.62),
  blurPx: z.number().int().min(0).max(10).default(2),
  saturation: z.number().min(0.65).max(1.25).default(0.9),
  contrast: z.number().min(0.75).max(1.2).default(0.9),
  mood: z.string().min(1).max(48),
});

export type BackgroundBrief = z.infer<typeof BackgroundBriefSchema>;

export type RenderBackground = BackgroundBrief & {
  imageUrl: string;
  source: 'generator' | 'local-fallback';
};

export function isDataImage(value: string): boolean {
  return DATA_IMAGE_PATTERN.test(value);
}
