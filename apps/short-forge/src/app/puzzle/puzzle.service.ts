import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { PromptBuilder } from './prompt.builder';
import { Puzzle, PuzzleSchema } from './puzzle.validator';

@Injectable()
export class PuzzleService {
  private readonly logger = new Logger(PuzzleService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async generate(topic: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<Puzzle> {
    this.logger.log(`Starting puzzle generation for topic: ${topic}, difficulty: ${difficulty}`);
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const prompt = this.promptBuilder.build(topic, difficulty);
        const responseText = await this.ollamaService.generate(prompt);
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        const rawPuzzle = JSON.parse(jsonMatch[0]);
        rawPuzzle.topic = topic;
        const validatedPuzzle = PuzzleSchema.parse(rawPuzzle);

        if (!validatedPuzzle.options.includes(validatedPuzzle.answer)) {
          throw new Error('Answer is not in options');
        }

        this.logger.log(`Puzzle generated successfully on attempt ${attempt}`);
        return validatedPuzzle;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        lastError = error;
      }
    }

    this.logger.error(`Failed to generate puzzle after ${maxRetries} attempts`);
    throw new InternalServerErrorException(
      `Failed to generate a valid puzzle after ${maxRetries} attempts. Last error: ${lastError?.message}`,
    );
  }
}
