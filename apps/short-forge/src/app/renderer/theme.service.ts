import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from '../puzzle/ollama.service';
import { Puzzle } from '../puzzle/puzzle.validator';
import {
  FONT_MONO_OPTIONS,
  FONT_SANS_OPTIONS,
  RenderTheme,
  validateRenderTheme,
} from './theme.validator';

@Injectable()
export class ThemeService {
  private readonly logger = new Logger(ThemeService.name);

  constructor(private readonly ollamaService: OllamaService) {}

  async generateTheme(puzzle: Puzzle): Promise<RenderTheme> {
    try {
      const responseText = await this.ollamaService.generate(this.buildPrompt(puzzle));
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON object found in theme response.');
      }

      const theme = validateRenderTheme(JSON.parse(jsonMatch[0]));
      this.logger.log(`Generated render theme: ${theme.mood}`);
      return theme;
    } catch (error) {
      const fallbackTheme = this.buildCuratedTheme(puzzle);
      this.logger.warn(
        `Theme generation failed, using curated topic theme "${fallbackTheme.mood}": ${error.message}`,
      );
      return fallbackTheme;
    }
  }

  private buildCuratedTheme(puzzle: Puzzle): RenderTheme {
    const themes: RenderTheme[] = [
      {
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
      },
      {
        fontSans: 'Space Grotesk',
        fontMono: 'Fira Code',
        backgroundStart: '#071a1f',
        backgroundEnd: '#1d2f24',
        accentPrimary: '#34d399',
        accentSecondary: '#fbbf24',
        textPrimary: '#f8fafc',
        textSecondary: '#bbf7d0',
        surfaceColor: 'rgba(6, 78, 59, 0.68)',
        surfaceBorder: 'rgba(52, 211, 153, 0.3)',
        mood: 'green terminal',
      },
      {
        fontSans: 'Inter',
        fontMono: 'JetBrains Mono',
        backgroundStart: '#171127',
        backgroundEnd: '#312e81',
        accentPrimary: '#c084fc',
        accentSecondary: '#fb7185',
        textPrimary: '#faf5ff',
        textSecondary: '#ddd6fe',
        surfaceColor: 'rgba(49, 46, 129, 0.7)',
        surfaceBorder: 'rgba(216, 180, 254, 0.28)',
        mood: 'violet trace',
      },
      {
        fontSans: 'Outfit',
        fontMono: 'IBM Plex Mono',
        backgroundStart: '#172554',
        backgroundEnd: '#3f2d12',
        accentPrimary: '#f59e0b',
        accentSecondary: '#60a5fa',
        textPrimary: '#eff6ff',
        textSecondary: '#fde68a',
        surfaceColor: 'rgba(30, 64, 175, 0.66)',
        surfaceBorder: 'rgba(245, 158, 11, 0.3)',
        mood: 'blue amber',
      },
      {
        fontSans: 'Manrope',
        fontMono: 'Fira Code',
        backgroundStart: '#20111f',
        backgroundEnd: '#4a1d2f',
        accentPrimary: '#fb7185',
        accentSecondary: '#2dd4bf',
        textPrimary: '#fff1f2',
        textSecondary: '#fecdd3',
        surfaceColor: 'rgba(76, 29, 51, 0.72)',
        surfaceBorder: 'rgba(251, 113, 133, 0.3)',
        mood: 'rose circuit',
      },
    ];
    const seed = `${puzzle.topic}|${puzzle.difficulty}|${puzzle.tags.join('|')}`;
    const theme = themes[this.hash(seed) % themes.length];

    return validateRenderTheme(theme);
  }

  private hash(value: string): number {
    return value.split('').reduce((hash, char) => {
      return (hash * 31 + char.charCodeAt(0)) >>> 0;
    }, 0);
  }

  private buildPrompt(puzzle: Puzzle): string {
    return `Create a visual theme for a vertical coding puzzle video.
Return ONLY a valid JSON object. Do not include CSS, HTML, markdown, comments, or image URLs.

Context:
- topic: ${puzzle.topic}
- difficulty: ${puzzle.difficulty}
- hook: ${puzzle.hook}
- tags: ${puzzle.tags.join(', ')}

Allowed fontSans values: ${FONT_SANS_OPTIONS.join(', ')}
Allowed fontMono values: ${FONT_MONO_OPTIONS.join(', ')}

Required JSON shape:
{
  "fontSans": "one allowed fontSans",
  "fontMono": "one allowed fontMono",
  "backgroundStart": "#000000",
  "backgroundEnd": "#111111",
  "accentPrimary": "#f97316",
  "accentSecondary": "#facc15",
  "textPrimary": "#f8fafc",
  "textSecondary": "#fed7aa",
  "surfaceColor": "rgba(31, 41, 55, 0.76)",
  "surfaceBorder": "rgba(251, 146, 60, 0.28)",
  "mood": "short readable label"
}

Rules:
- Use only 6-digit hex colors for hex fields.
- Use only rgba(r, g, b, a) for surface fields.
- Keep background dark enough for mobile readability.
- Ensure textPrimary has strong contrast against both background colors.
- Ensure textSecondary remains readable.
- Do not copy the example colors unless they are an excellent fit.
- Do not use pure black and pure white as the whole theme unless necessary.`;
  }
}
