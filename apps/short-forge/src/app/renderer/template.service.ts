import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir = path.join(process.cwd(), 'templates');

  async loadCodeTemplate(data: {
    hook: string;
    code?: string;
    options: string[];
    footer: string;
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

  async loadAnswerTemplate(answer: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, 'answer.html');
      const html = await fs.readFile(templatePath, 'utf-8');

      return html.split('{{answer}}').join(this.escapeHtml(answer));
    } catch (error) {
      this.logger.error(`Failed to load answer template: ${error.message}`);
      throw error;
    }
  }

  private injectCodeValues(html: string, data: any): string {
    let rendered = html;

    const replacements: Record<string, string> = {
      '{{hook}}': this.escapeHtml(data.hook),
      '{{code}}': this.escapeHtml(data.code || ''),
      '{{footer}}': this.escapeHtml(data.footer),
      '{{options}}': this.renderOptions(data.options),
    };

    for (const [key, value] of Object.entries(replacements)) {
      rendered = rendered.split(key).join(value);
    }

    return rendered;
  }

  private renderOptions(options: string[]): string {
    return options
      .map((opt) => `<li>${this.escapeHtml(opt)}</li>`)
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
