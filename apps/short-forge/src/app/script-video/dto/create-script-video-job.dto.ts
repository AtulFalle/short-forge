import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScriptVideoJobDto {
  @ApiPropertyOptional({ example: 'Explain why procrastination is not laziness.' })
  prompt?: string;

  @ApiPropertyOptional({ example: 'Most people think procrastination is laziness, but often it is avoidance...' })
  script?: string;

  @ApiPropertyOptional({ example: 'curious' })
  tone?: string;

  @ApiPropertyOptional({ example: 'mini-blog' })
  style?: string;

  @ApiPropertyOptional({ example: 'general' })
  audience?: string;

  @ApiPropertyOptional({ example: 35 })
  durationSec?: number;

  @ApiPropertyOptional({ example: 'English' })
  language?: string;
}

