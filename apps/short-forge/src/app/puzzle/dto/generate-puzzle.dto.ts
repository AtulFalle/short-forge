import { ApiProperty } from '@nestjs/swagger';

export class GeneratePuzzleDto {
  @ApiProperty({
    description: 'The topic of the puzzle (e.g., javascript, rust, nestjs)',
    example: 'javascript',
  })
  topic: string;

  @ApiProperty({
    description: 'The difficulty level of the puzzle',
    enum: ['easy', 'medium', 'hard'],
    example: 'medium',
  })
  difficulty: 'easy' | 'medium' | 'hard';
}
