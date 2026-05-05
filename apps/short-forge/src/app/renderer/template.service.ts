import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir = path.join(process.cwd(), 'templates');

  async loadCodeTemplate(data: {
    hook: string;
    question: string;
    code: string;
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
  }): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, 'options.html');
      const html = await fs.readFile(templatePath, 'utf-8');

      let rendered = html;
      const replacements: Record<string, string> = {
        '{{hook}}': this.escapeHtml(data.hook),
        '{{options}}': this.renderOptions(data.options),
        '{{timer}}': data.timer.toString(),
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

  async loadAnswerTemplate(answer: string, explanation: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, 'answer.html');
      const html = await fs.readFile(templatePath, 'utf-8');

      let rendered = html.split('{{answer}}').join(this.escapeHtml(answer));
      rendered = rendered.split('{{explanation}}').join(this.escapeHtml(explanation));
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
    },
  ): string {
    let rendered = html;

    const replacements: Record<string, string> = {
      '{{hook}}': this.escapeHtml(data.hook),
      '{{question}}': this.escapeHtml(data.question),
      '{{code}}': this.escapeHtml(data.code),
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
}
