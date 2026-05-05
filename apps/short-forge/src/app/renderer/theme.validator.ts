import { z } from 'zod';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const RGBA_COLOR_PATTERN =
  /^rgba\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(0(\.\d+)?|1(\.0+)?)\s*\)$/;

export const FONT_SANS_OPTIONS = ['Outfit', 'Inter', 'Space Grotesk', 'Manrope'] as const;
export const FONT_MONO_OPTIONS = ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono'] as const;

export const RenderThemeSchema = z.object({
  fontSans: z.enum(FONT_SANS_OPTIONS),
  fontMono: z.enum(FONT_MONO_OPTIONS),
  backgroundStart: z.string().regex(HEX_COLOR_PATTERN),
  backgroundEnd: z.string().regex(HEX_COLOR_PATTERN),
  accentPrimary: z.string().regex(HEX_COLOR_PATTERN),
  accentSecondary: z.string().regex(HEX_COLOR_PATTERN),
  textPrimary: z.string().regex(HEX_COLOR_PATTERN),
  textSecondary: z.string().regex(HEX_COLOR_PATTERN),
  surfaceColor: z.string().regex(RGBA_COLOR_PATTERN),
  surfaceBorder: z.string().regex(RGBA_COLOR_PATTERN),
  mood: z.string().min(1).max(32),
});

export type RenderTheme = z.infer<typeof RenderThemeSchema>;

export const DEFAULT_RENDER_THEME: RenderTheme = {
  fontSans: 'Manrope',
  fontMono: 'IBM Plex Mono',
  backgroundStart: '#111827',
  backgroundEnd: '#3b1f2b',
  accentPrimary: '#f97316',
  accentSecondary: '#facc15',
  textPrimary: '#f8fafc',
  textSecondary: '#fed7aa',
  surfaceColor: 'rgba(31, 41, 55, 0.76)',
  surfaceBorder: 'rgba(251, 146, 60, 0.28)',
  mood: 'ember logic',
};

export function validateRenderTheme(theme: unknown): RenderTheme {
  const parsed = RenderThemeSchema.parse(theme);
  const primaryContrast = Math.min(
    contrastRatio(parsed.textPrimary, parsed.backgroundStart),
    contrastRatio(parsed.textPrimary, parsed.backgroundEnd),
  );
  const secondaryContrast = Math.min(
    contrastRatio(parsed.textSecondary, parsed.backgroundStart),
    contrastRatio(parsed.textSecondary, parsed.backgroundEnd),
  );

  if (primaryContrast < 4.5) {
    throw new Error('Theme textPrimary does not meet contrast requirements.');
  }

  if (secondaryContrast < 3) {
    throw new Error('Theme textSecondary does not meet contrast requirements.');
  }

  if (rgbaAlpha(parsed.surfaceColor) < 0.45) {
    throw new Error('Theme surfaceColor must be opaque enough for readable panels.');
  }

  return parsed;
}

function contrastRatio(first: string, second: string): number {
  const firstLum = relativeLuminance(first);
  const secondLum = relativeLuminance(second);
  const lighter = Math.max(firstLum, secondLum);
  const darker = Math.min(firstLum, secondLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbaAlpha(rgba: string): number {
  const alphaMatch = rgba.match(/,\s*(0(\.\d+)?|1(\.0+)?)\s*\)$/);
  return alphaMatch ? Number(alphaMatch[1]) : 0;
}
