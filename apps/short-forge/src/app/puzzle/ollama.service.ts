import { Injectable, InternalServerErrorException } from '@nestjs/common';

export type OllamaGenerateOptions = {
  temperature?: number;
  format?: 'json';
};

@Injectable()
export class OllamaService {
  private readonly baseUrl =
    process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434/api/generate';
  private readonly model = process.env.OLLAMA_MODEL?.trim() || 'gemma4:e4b';

  async generate(prompt: string, options: OllamaGenerateOptions = {}): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
          },
          ...(options.format ? { format: options.format } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to connect to Ollama: ${error.message}`);
    }
  }
}
