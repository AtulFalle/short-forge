import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { OllamaService } from '../puzzle/ollama.service';
import { Puzzle } from '../puzzle/puzzle.validator';
import { BackgroundBrief, BackgroundBriefSchema, isDataImage, RenderBackground } from './background.validator';
import { RenderTheme } from './theme.validator';

@Injectable()
export class BackgroundService {
  private readonly logger = new Logger(BackgroundService.name);
  private readonly backgroundDir = path.join(process.cwd(), 'output', 'backgrounds');
  private readonly generatorUrl = process.env.IMAGE_GENERATOR_URL;

  constructor(private readonly ollamaService: OllamaService) {}

  async generateBackground(puzzle: Puzzle, theme: RenderTheme, jobId: string): Promise<RenderBackground> {
    const brief = await this.generateBrief(puzzle, theme);
    await fs.mkdir(this.backgroundDir, { recursive: true });

    if (this.generatorUrl) {
      const generatedPath = path.join(this.backgroundDir, `${jobId}.png`);
      const generated = await this.tryGenerateImage(brief, generatedPath);
      if (generated) {
        return {
          ...brief,
          imageUrl: pathToFileURL(generatedPath).href,
          source: 'generator',
        };
      }
    }

    const fallbackPath = path.join(this.backgroundDir, `${jobId}.svg`);
    await fs.writeFile(fallbackPath, this.renderFallbackSvg(puzzle, theme), 'utf-8');

    return {
      ...brief,
      imageUrl: pathToFileURL(fallbackPath).href,
      source: 'local-fallback',
    };
  }

  private async generateBrief(puzzle: Puzzle, theme: RenderTheme): Promise<BackgroundBrief> {
    try {
      const responseText = await this.ollamaService.generate(this.buildPrompt(puzzle, theme));
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON object found in background brief response.');
      }

      const brief = BackgroundBriefSchema.parse(JSON.parse(jsonMatch[0]));
      this.logger.log(`Generated background brief: ${brief.mood}`);
      return brief;
    } catch (error) {
      this.logger.warn(`Background brief failed, using deterministic brief: ${error.message}`);
      return this.buildFallbackBrief(puzzle);
    }
  }

  private async tryGenerateImage(brief: BackgroundBrief, outputPath: string): Promise<boolean> {
    try {
      const response = await fetch(this.generatorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: brief.prompt,
          negativePrompt: brief.negativePrompt,
          width: 1080,
          height: 1920,
        }),
      });

      if (!response.ok) {
        throw new Error(`Image generator returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.startsWith('image/')) {
        const bytes = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(outputPath, bytes);
        return true;
      }

      const data = await response.json();
      const imageValue = this.extractImageValue(data);
      if (!imageValue) {
        throw new Error('Image generator response did not include image data.');
      }

      if (isDataImage(imageValue)) {
        await fs.writeFile(outputPath, Buffer.from(imageValue.split(',')[1], 'base64'));
        return true;
      }

      if (/^[A-Za-z0-9+/=]+$/.test(imageValue)) {
        await fs.writeFile(outputPath, Buffer.from(imageValue, 'base64'));
        return true;
      }

      if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
        const imageResponse = await fetch(imageValue);
        if (!imageResponse.ok) {
          throw new Error(`Image URL returned ${imageResponse.status}`);
        }
        await fs.writeFile(outputPath, Buffer.from(await imageResponse.arrayBuffer()));
        return true;
      }

      throw new Error('Unsupported image generator response format.');
    } catch (error) {
      this.logger.warn(`Image generation failed, using local fallback image: ${error.message}`);
      return false;
    }
  }

  private extractImageValue(data: unknown): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const record = data as Record<string, unknown>;
    const candidates = [
      record.image,
      record.imageBase64,
      record.base64,
      record.url,
      Array.isArray(record.images) ? record.images[0] : null,
      Array.isArray(record.data) ? (record.data[0] as Record<string, unknown>)?.b64_json : null,
      Array.isArray(record.data) ? (record.data[0] as Record<string, unknown>)?.url : null,
    ];

    return candidates.find((value): value is string => typeof value === 'string' && value.length > 0) ?? null;
  }

  private buildPrompt(puzzle: Puzzle, theme: RenderTheme): string {
    const visualDirection = this.topicVisualDirection(puzzle);

    return `Create an image-generation brief for a vertical coding puzzle background.
Return ONLY valid JSON. No markdown, comments, CSS, HTML, or URLs.

Context:
- topic: ${puzzle.topic}
- difficulty: ${puzzle.difficulty}
- hook: ${puzzle.hook}
- tags: ${puzzle.tags.join(', ')}
- accent colors: ${theme.accentPrimary}, ${theme.accentSecondary}
- mood: ${theme.mood}
- topic visual direction: ${visualDirection}

Required JSON shape:
{
  "prompt": "vertical 1080x1920 cinematic technology background...",
  "negativePrompt": "readable foreground text, large letters, watermark, UI mockup, bright center",
  "overlayOpacity": 0.62,
  "blurPx": 2,
  "saturation": 0.9,
  "contrast": 0.9,
  "mood": "short label"
}

Rules:
- Make the image clearly related to the topic, not just a plain gradient.
- Use concrete tech atmosphere: topic-related logo/emblem shapes, programming-language icon motifs, framework-style badges, circuit traces, server panels, data flow, debugging overlays, or dashboards seen out of focus.
- Logos/emblems must be background design elements only: large, partial, translucent, blurred or frosted, low-contrast, and pushed toward the edges.
- If the topic names a specific technology, include a tasteful abstract version of its recognizable logo or icon style.
- Do not place readable text, UI mockups, or crisp code in the center.
- Leave the center calm for large text and code panels.
- Use a dark background suitable for white text overlays.`;
  }

  private buildFallbackBrief(puzzle: Puzzle): BackgroundBrief {
    const visualDirection = this.topicVisualDirection(puzzle);

    return {
      prompt: `Vertical 1080x1920 cinematic technology background for ${puzzle.topic}. ${visualDirection}. Dark layered depth, subtle topic-related logo or emblem shapes near the edges, circuit traces, data streams, calm readable center, no readable foreground text.`,
      negativePrompt: 'readable foreground text, large letters, watermark, UI mockup, bright center',
      overlayOpacity: 0.64,
      blurPx: 2,
      saturation: 0.9,
      contrast: 0.9,
      mood: 'generated abstract',
    };
  }

  private renderFallbackSvg(puzzle: Puzzle, theme: RenderTheme): string {
    const seed = this.hash(`${puzzle.topic}|${puzzle.difficulty}|${theme.mood}`);
    const topicTokens = this.topicTokens(puzzle);
    const topicLogo = this.topicLogoMark(puzzle);
    const circles = Array.from({ length: 9 }, (_, index) => {
      const x = 120 + ((seed + index * 197) % 840);
      const y = 120 + ((seed * (index + 3)) % 1680);
      const radius = 120 + ((seed + index * 61) % 260);
      const opacity = (0.08 + ((seed + index * 13) % 12) / 100).toFixed(2);
      const color = index % 2 === 0 ? theme.accentPrimary : theme.accentSecondary;

      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" opacity="${opacity}" />`;
    }).join('\n');
    const lines = Array.from({ length: 12 }, (_, index) => {
      const y = 140 + index * 150 + ((seed + index * 23) % 44);
      const opacity = (0.05 + ((seed + index * 7) % 8) / 100).toFixed(2);

      return `<path d="M -80 ${y} C 260 ${y - 90}, 620 ${y + 120}, 1160 ${y - 30}" stroke="${theme.textSecondary}" stroke-width="3" opacity="${opacity}" fill="none" />`;
    }).join('\n');
    const traces = Array.from({ length: 18 }, (_, index) => {
      const x = 36 + ((seed + index * 89) % 960);
      const y = 120 + ((seed * (index + 5)) % 1660);
      const width = 80 + ((seed + index * 47) % 240);
      const turn = 24 + ((seed + index * 19) % 82);
      const color = index % 3 === 0 ? theme.accentPrimary : theme.accentSecondary;
      const opacity = (0.08 + ((seed + index * 11) % 16) / 100).toFixed(2);

      return `<path d="M ${x} ${y} h ${width} v ${turn} h ${Math.floor(width / 2)}" stroke="${color}" stroke-width="2" opacity="${opacity}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('\n');
    const logRows = Array.from({ length: 26 }, (_, index) => {
      const leftSide = index % 2 === 0;
      const x = leftSide ? 42 : 686;
      const y = 190 + index * 58 + ((seed + index * 17) % 18);
      const opacity = (0.09 + ((seed + index * 5) % 10) / 100).toFixed(2);
      const token = topicTokens[index % topicTokens.length];
      const chars = this.pseudoLog(seed + index * 101, token);

      return `<text x="${x}" y="${y}" font-family="monospace" font-size="${leftSide ? 23 : 21}" fill="${theme.textSecondary}" opacity="${opacity}">${this.escapeSvg(chars)}</text>`;
    }).join('\n');
    const panels = Array.from({ length: 6 }, (_, index) => {
      const x = index % 2 === 0 ? -42 : 820;
      const y = 110 + index * 285 + ((seed + index * 41) % 80);
      const color = index % 2 === 0 ? theme.accentPrimary : theme.accentSecondary;

      return `<rect x="${x}" y="${y}" width="300" height="150" rx="18" fill="${color}" opacity="0.055" />
<rect x="${x + 24}" y="${y + 32}" width="190" height="8" rx="4" fill="${theme.textSecondary}" opacity="0.12" />
<rect x="${x + 24}" y="${y + 62}" width="238" height="8" rx="4" fill="${theme.textSecondary}" opacity="0.09" />
<rect x="${x + 24}" y="${y + 92}" width="132" height="8" rx="4" fill="${theme.textSecondary}" opacity="0.1" />`;
    }).join('\n');
    const logos = [
      `<text x="72" y="360" font-family="Arial, sans-serif" font-size="156" font-weight="800" fill="${theme.accentPrimary}" opacity="0.13">${this.escapeSvg(topicLogo)}</text>`,
      `<text x="710" y="1504" font-family="Arial, sans-serif" font-size="176" font-weight="800" fill="${theme.accentSecondary}" opacity="0.11">${this.escapeSvg(topicLogo)}</text>`,
      `<circle cx="900" cy="344" r="112" fill="none" stroke="${theme.accentSecondary}" stroke-width="18" opacity="0.1" />
<text x="842" y="382" font-family="Arial, sans-serif" font-size="80" font-weight="800" fill="${theme.accentSecondary}" opacity="0.15">${this.escapeSvg(topicLogo.slice(0, 2))}</text>`,
    ].join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${theme.backgroundStart}" />
<stop offset="100%" stop-color="${theme.backgroundEnd}" />
</linearGradient>
<filter id="blur"><feGaussianBlur stdDeviation="54" /></filter>
<filter id="softText"><feGaussianBlur stdDeviation="1.1" /></filter>
</defs>
<rect width="1080" height="1920" fill="url(#bg)" />
<g filter="url(#blur)">
${circles}
</g>
<g>
${traces}
</g>
<g filter="url(#softText)">
${logRows}
</g>
<g filter="url(#softText)">
${logos}
</g>
<g>
${panels}
</g>
<g>
${lines}
</g>
<rect x="210" y="0" width="660" height="1920" fill="#000000" opacity="0.2" />
<rect width="1080" height="1920" fill="#000000" opacity="0.14" />
</svg>`;
  }

  private topicVisualDirection(puzzle: Puzzle): string {
    const text = `${puzzle.topic} ${puzzle.tags.join(' ')}`.toLowerCase();
    if (/(javascript|typescript|node|react|frontend|web|dom)/.test(text)) {
      return 'JavaScript/web identity, recognizable JS or TypeScript style emblem, browser/runtime iconography, async event-loop rings, module graph lines';
    }
    if (/(python|django|flask|data|pandas|numpy|machine|ai|ml)/.test(text)) {
      return 'Python/data identity, snake-like abstract emblem, notebook grid fragments, tensor/data-flow ribbons, soft matrix charts, analytical glow';
    }
    if (/(database|sql|postgres|mysql|mongo|redis|cache|query)/.test(text)) {
      return 'database identity, cylinder/storage logo shapes, relational table silhouettes, query-plan branches, index nodes, soft amber/green telemetry';
    }
    if (/(api|http|rest|graphql|network|server|backend|microservice)/.test(text)) {
      return 'API/network identity, connected-node emblem, request traces, packet streams, endpoint nodes, server rack depth';
    }
    if (/(security|auth|jwt|crypto|hash|encryption)/.test(text)) {
      return 'security identity, shield/lock emblem shapes, encrypted packet trails, hash-grid fragments, guarded dark ambience';
    }
    if (/(algorithm|array|string|tree|graph|recursion|dynamic programming|sorting)/.test(text)) {
      return 'algorithm identity, abstract graph/tree emblem, stack frames, branching paths, array blocks, recursive depth lines';
    }

    return 'modern software engineering identity, abstract topic emblem, circuit traces, data-flow paths, server glass reflections';
  }

  private topicTokens(puzzle: Puzzle): string[] {
    const text = `${puzzle.topic} ${puzzle.tags.join(' ')}`.toLowerCase();
    if (/(javascript|typescript|node|react|frontend|web|dom)/.test(text)) {
      return ['async', 'event', 'promise', 'render', 'state', 'module'];
    }
    if (/(python|django|flask|data|pandas|numpy|machine|ai|ml)/.test(text)) {
      return ['tensor', 'frame', 'model', 'index', 'vector', 'batch'];
    }
    if (/(database|sql|postgres|mysql|mongo|redis|cache|query)/.test(text)) {
      return ['query', 'index', 'join', 'cache', 'write', 'scan'];
    }
    if (/(api|http|rest|graphql|network|server|backend|microservice)/.test(text)) {
      return ['route', 'trace', 'status', 'packet', 'retry', 'latency'];
    }
    if (/(security|auth|jwt|crypto|hash|encryption)/.test(text)) {
      return ['hash', 'token', 'nonce', 'cipher', 'claim', 'guard'];
    }
    if (/(algorithm|array|string|tree|graph|recursion|dynamic programming|sorting)/.test(text)) {
      return ['node', 'edge', 'stack', 'memo', 'pivot', 'depth'];
    }

    return ['build', 'debug', 'trace', 'state', 'logic', 'flow'];
  }

  private topicLogoMark(puzzle: Puzzle): string {
    const text = `${puzzle.topic} ${puzzle.tags.join(' ')}`.toLowerCase();
    if (/typescript/.test(text)) {
      return 'TS';
    }
    if (/javascript|node|react|frontend|web|dom/.test(text)) {
      return 'JS';
    }
    if (/python|django|flask/.test(text)) {
      return 'PY';
    }
    if (/sql|postgres|mysql|database|query/.test(text)) {
      return 'DB';
    }
    if (/mongo/.test(text)) {
      return 'DB';
    }
    if (/redis|cache/.test(text)) {
      return 'KV';
    }
    if (/api|http|rest|graphql|network/.test(text)) {
      return 'API';
    }
    if (/security|auth|jwt|crypto|hash|encryption/.test(text)) {
      return 'SEC';
    }
    if (/ai|ml|machine/.test(text)) {
      return 'AI';
    }

    return puzzle.topic
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 3) || 'SF';
  }

  private pseudoLog(seed: number, token: string): string {
    const levels = ['info', 'trace', 'debug', 'tick', 'emit', 'sync'];
    const level = levels[seed % levels.length];
    const id = (seed % 4096).toString(16).padStart(3, '0');
    const tail = (seed * 2654435761 >>> 0).toString(16).slice(0, 8);

    return `${level}:${id} ${token}.${tail} -> ${seed % 97}ms`;
  }

  private escapeSvg(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private hash(value: string): number {
    return value.split('').reduce((hash, char) => {
      return (hash * 31 + char.charCodeAt(0)) >>> 0;
    }, 0);
  }
}
