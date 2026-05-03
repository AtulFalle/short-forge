import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { PuzzleService } from './puzzle.service';
import { GeneratePuzzleDto } from './dto/generate-puzzle.dto';
import { GeneratePuzzleSchema } from './puzzle.validator';

class PuzzleResponse {
  @ApiProperty()
  hook: string;

  @ApiProperty()
  question: string;

  @ApiProperty()
  code: string;

  @ApiProperty({ type: [String] })
  options: string[];

  @ApiProperty()
  answer: string;

  @ApiProperty()
  explanation: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @ApiProperty({ type: [String] })
  tags: string[];
}

@ApiTags('puzzles')
@Controller('api/v1/puzzles')
export class PuzzleController {
  constructor(private readonly puzzleService: PuzzleService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new coding puzzle' })
  @ApiResponse({ status: 201, description: 'Puzzle generated successfully', type: PuzzleResponse })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Failed to generate puzzle' })
  async generate(@Body() body: GeneratePuzzleDto) {
    const validation = GeneratePuzzleSchema.safeParse(body);
    
    if (!validation.success) {
      throw new BadRequestException(validation.error.format());
    }

    const { topic, difficulty } = validation.data;
    return await this.puzzleService.generate(topic, difficulty);
  }
}
