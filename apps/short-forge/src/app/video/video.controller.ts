import { Controller, Post, Body, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { PuzzleService } from '../puzzle/puzzle.service';
import { RendererService } from '../renderer/renderer.service';
import { GeneratePuzzleSchema } from '../puzzle/puzzle.validator';
import { GeneratePuzzleDto } from '../puzzle/dto/generate-puzzle.dto';

class VideoResponseData {
  @ApiProperty({ description: 'The path to the generated video file', example: 'output/123e4567-e89b-12d3-a456-426614174000.mp4' })
  video: string;
}

class VideoResponse {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: VideoResponseData })
  data: VideoResponseData;
}

@ApiTags('videos')
@Controller('api/v1/videos')
export class VideoController {
  private readonly logger = new Logger(VideoController.name);

  constructor(
    private readonly puzzleService: PuzzleService,
    private readonly rendererService: RendererService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a coding puzzle and render it into a video' })
  @ApiResponse({ status: 201, description: 'Video generated successfully', type: VideoResponse })
  @ApiResponse({ status: 400, description: 'Invalid input or puzzle generation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error or rendering failed' })
  async generate(@Body() body: GeneratePuzzleDto) {
    this.logger.log(`Received video generation request: ${JSON.stringify(body)}`);

    const validation = GeneratePuzzleSchema.safeParse(body);
    if (!validation.success) {
      this.logger.warn(`Validation failed: ${JSON.stringify(validation.error.format())}`);
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid input',
        errors: validation.error.format(),
      });
    }

    const { topic, difficulty } = validation.data;

    // 1. Generate Puzzle
    let puzzle;
    try {
      this.logger.log(`Step 1: Generating puzzle for topic: ${topic}`);
      puzzle = await this.puzzleService.generate(topic, difficulty);
    } catch (error) {
      this.logger.error(`Puzzle generation failed: ${error.message}`);
      throw new BadRequestException({
        status: 'error',
        message: 'Failed to generate puzzle',
      });
    }

    // 2. Render Video
    let videoPath;
    try {
      this.logger.log(`Step 2: Rendering video for puzzle`);
      videoPath = await this.rendererService.render(puzzle);
    } catch (error) {
      this.logger.error(`Video rendering failed: ${error.message}`);
      throw new InternalServerErrorException({
        status: 'error',
        message: 'Failed to render video',
      });
    }

    this.logger.log(`Video generation successful: ${videoPath}`);

    return {
      status: 'success',
      data: {
        video: videoPath,
      },
    };
  }
}
