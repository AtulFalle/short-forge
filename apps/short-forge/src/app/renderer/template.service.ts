import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DEFAULT_RENDER_THEME, RenderTheme } from './theme.validator';
import { RenderBackground } from './background.validator';

const DEFAULT_RENDER_BACKGROUND: RenderBackground = {
  imageUrl: '',
  source: 'local-fallback',
  prompt: 'No generated background image.',
  negativePrompt: '',
  overlayOpacity: 0.68,
  blurPx: 0,
  saturation: 0.9,
  contrast: 0.9,
  mood: 'none',
};

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir = path.join(process.cwd(), 'templates');

  async loadCodeTemplate(data: {
    hook: string;
    question: string;
    code: string;
    theme?: RenderTheme;
    background?: RenderBackground;
  }): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, 'code.html');
      const html = await fs.readFile(templatePath, 'utf-8');

      return this.injectCodeValues(html, data);
    } catch (error) {
      this.logger.error(`Failed to load code template: ${error.message}`);
      throw error;
    }
  }

  async loadOptionsTemplate(data: {
    hook: string;
    options: string[];
    timer: number;
    theme?: RenderTheme;
    background?: RenderBackground;
  }): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, 'options.html');
      const html = await fs.readFile(templatePath, 'utf-8');

      let rendered = html;
      const replacements: Record<string, string> = {
        '{{hook}}': this.escapeHtml(data.hook),
        '{{options}}': this.renderOptions(data.options),
        '{{timer}}': data.timer.toString(),
        '{{themeCss}}': this.renderThemeCss(data.theme ?? DEFAULT_RENDER_THEME),
        '{{backgroundCss}}': this.renderBackgroundCss(data.background ?? DEFAULT_RENDER_BACKGROUND),
      };

      for (const [key, value] of Object.entries(replacements)) {
        rendered = rendered.split(key).join(value);
      }

      return rendered;
    } catch (error) {
      this.logger.error(`Failed to load options template: ${error.message}`);
      throw error;
    }
  }

  async loadAnswerTemplate(
    answer: string,
    explanation: string,
    theme: RenderTheme = DEFAULT_RENDER_THEME,
    background: RenderBackground = DEFAULT_RENDER_BACKGROUND,
  ): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, 'answer.html');
      const html = await fs.readFile(templatePath, 'utf-8');

      let rendered = html.split('{{answer}}').join(this.escapeHtml(answer));
      rendered = rendered.split('{{explanation}}').join(this.escapeHtml(explanation));
      rendered = rendered.split('{{themeCss}}').join(this.renderThemeCss(theme));
      rendered = rendered.split('{{backgroundCss}}').join(this.renderBackgroundCss(background));
      return rendered;
    } catch (error) {
      this.logger.error(`Failed to load answer template: ${error.message}`);
      throw error;
    }
  }

  private injectCodeValues(
    html: string,
    data: {
      hook: string;
      question: string;
      code: string;
      theme?: RenderTheme;
      background?: RenderBackground;
    },
  ): string {
    let rendered = html;

    const replacements: Record<string, string> = {
      '{{hook}}': this.escapeHtml(data.hook),
      '{{question}}': this.escapeHtml(data.question),
      '{{code}}': this.escapeHtml(data.code),
      '{{themeCss}}': this.renderThemeCss(data.theme ?? DEFAULT_RENDER_THEME),
      '{{backgroundCss}}': this.renderBackgroundCss(data.background ?? DEFAULT_RENDER_BACKGROUND),
    };

    for (const [key, value] of Object.entries(replacements)) {
      rendered = rendered.split(key).join(value);
    }

    return rendered;
  }

  private renderOptions(options: string[]): string {
    return options
      .map((opt) => `
        <li class="option-item">
            <div class="option-marker"></div>
            <div class="option-text">${this.escapeHtml(opt)}</div>
        </li>`)
      .join('\n');
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private renderThemeCss(theme: RenderTheme): string {
    return `
            --bg-grad-start: ${theme.backgroundStart};
            --bg-grad-end: ${theme.backgroundEnd};
            --text-primary: ${theme.textPrimary};
            --text-secondary: ${theme.textSecondary};
            --accent-primary: ${theme.accentPrimary};
            --accent-secondary: ${theme.accentSecondary};
            --glass-bg: ${theme.surfaceColor};
            --glass-border: ${theme.surfaceBorder};
            --font-sans: ${this.cssFontFamily(theme.fontSans)}, sans-serif;
            --font-mono: ${this.cssFontFamily(theme.fontMono)}, monospace;`;
  }

  private renderBackgroundCss(background: RenderBackground): string {
    const imageUrl = background.imageUrl ? `url("${this.escapeCssUrl(background.imageUrl)}")` : 'none';

    return `
            --background-image: ${imageUrl};
            --background-overlay-opacity: ${background.overlayOpacity};
            --background-blur: ${background.blurPx}px;
            --background-saturation: ${background.saturation};
            --background-contrast: ${background.contrast};`;
  }

  private escapeCssUrl(value: string): string {
    return value.replace(/\\/g, '/').replace(/"/g, '%22').replace(/\n|\r/g, '');
  }

  private cssFontFamily(font: string): string {
    return `'${font.replace(/'/g, '')}'`;
  }
}
