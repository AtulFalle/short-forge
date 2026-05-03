import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class OllamaService {
  private readonly baseUrl = 'http://localhost:11434/api/generate';

  async generate(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma4:e4b',
          prompt,
          stream: false,
        }),
      }); ``

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
