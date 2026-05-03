import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilder {
  build(topic: string, difficulty: string): string {
    return `Generate a coding puzzle about ${topic} with ${difficulty} difficulty.
Return ONLY a valid JSON object with the following structure:
{
  "hook": "a short catchy intro",
  "question": "the puzzle question",
  "code": "relevant code snippet",
  "options": ["option1", "option2", "option3"],
  "answer": "the correct option (must be one of the options)",
  "explanation": "why the answer is correct",
  "difficulty": "${difficulty}",
  "tags": ["tag1", "tag2"]
}
Ensure the JSON is valid and the answer is present in the options array.

STRICT:
- EXACTLY 3 options, no more, no less
- If more than 3 options, reduce to 3
- Answer MUST be one of the options`;
  }
}
