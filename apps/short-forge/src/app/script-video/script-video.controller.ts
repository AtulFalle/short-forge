import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateScriptVideoJobDto } from './dto/create-script-video-job.dto';
import { ScriptVideoService } from './script-video.service';
import {
  ScriptVideoOutlineSchema,
  ScriptVideoScriptSchema,
  ScriptVideoStoryboardSchema,
} from './script-video.validator';

class ScriptVideoJobDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  stage: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ required: false })
  error?: string;
}

class ScriptVideoOutlineDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  hook: string;

  @ApiProperty({ type: [String] })
  beats: string[];

  @ApiProperty()
  closing: string;
}

class ScriptVideoBriefDto {
  @ApiProperty({ enum: ['prompt', 'script'] })
  sourceType: 'prompt' | 'script';

  @ApiProperty({ required: false })
  prompt?: string;

  @ApiProperty({ required: false })
  suppliedScript?: string;

  @ApiProperty()
  topic: string;

  @ApiProperty()
  tone: string;

  @ApiProperty()
  style: string;

  @ApiProperty()
  audience: string;

  @ApiProperty()
  durationSec: number;

  @ApiProperty({ example: 'English' })
  language: string;

  @ApiProperty({ type: [String] })
  sourceNotes: string[];
}

class ScriptVideoScriptDto {
  @ApiProperty()
  title: string;

  @ApiProperty({ type: [String] })
  narration: string[];

  @ApiProperty()
  closing: string;
}

class ScriptVideoSceneDto {
  @ApiProperty()
  narration: string;

  @ApiProperty()
  visualText: string;

  @ApiProperty()
  backgroundPrompt: string;

  @ApiProperty()
  mood: string;

  @ApiProperty()
  durationSec: number;
}

class ScriptVideoStoryboardDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  hook: string;

  @ApiProperty({ type: [ScriptVideoSceneDto] })
  scenes: ScriptVideoSceneDto[];

  @ApiProperty()
  closing: string;
}

class ScriptVideoJobResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: ScriptVideoJobDto })
  job: ScriptVideoJobDto;

  @ApiProperty({ type: 'object', additionalProperties: true })
  data: Record<string, unknown>;
}

class ScriptVideoGenerateResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ type: ScriptVideoJobDto })
  job: ScriptVideoJobDto;

  @ApiProperty({ type: ScriptVideoBriefDto })
  brief: ScriptVideoBriefDto;

  @ApiProperty({ type: ScriptVideoOutlineDto, nullable: true })
  outline: ScriptVideoOutlineDto | null;

  @ApiProperty({ type: ScriptVideoScriptDto, nullable: true })
  script: ScriptVideoScriptDto | null;

  @ApiProperty({ type: ScriptVideoStoryboardDto, nullable: true })
  storyboard: ScriptVideoStoryboardDto | null;

  @ApiProperty({ nullable: true })
  previewVideo: string | null;

  @ApiProperty({ nullable: true })
  finalVideo: string | null;
}

@ApiTags('script-videos')
@Controller('v1/script-videos')
export class ScriptVideoController {
  constructor(private readonly scriptVideoService: ScriptVideoService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Create a scripted video job and run all stages through final render' })
  @ApiBody({ type: CreateScriptVideoJobDto })
  @ApiResponse({ status: 201, type: ScriptVideoGenerateResponseDto })
  async generate(@Body() body: CreateScriptVideoJobDto) {
    const result = await this.scriptVideoService.generateFromInput(body);
    return { status: 'success', job: result.job, ...result.artifacts };
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a scripted video job from a prompt or script' })
  @ApiResponse({ status: 201, type: ScriptVideoJobResponseDto })
  async createJob(@Body() body: CreateScriptVideoJobDto) {
    const result = await this.scriptVideoService.createJob(body);
    return { status: 'success', job: result.job, data: { brief: result.brief } };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get a scripted video job and available artifacts' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async getJob(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.getJob(jobId);
    return { status: 'success', job: result.job, data: result.artifacts };
  }

  @Post('jobs/:jobId/outline')
  @ApiOperation({ summary: 'Generate an outline for a scripted video job' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 201, type: ScriptVideoJobResponseDto })
  async generateOutline(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.generateOutline(jobId);
    return { status: 'success', job: result.job, data: { outline: result.outline } };
  }

  @Patch('jobs/:jobId/outline')
  @ApiOperation({ summary: 'Replace the outline with a reviewed version' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiBody({ type: ScriptVideoOutlineDto })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async updateOutline(@Param('jobId') jobId: string, @Body() body: ScriptVideoOutlineDto) {
    this.ensureValidBody(body, ScriptVideoOutlineSchema, 'outline');
    const result = await this.scriptVideoService.updateOutline(jobId, body);
    return { status: 'success', job: result.job, data: { outline: result.outline } };
  }

  @Post('jobs/:jobId/outline/approve')
  @ApiOperation({ summary: 'Approve the current outline' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async approveOutline(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.approveOutline(jobId);
    return { status: 'success', job: result.job, data: { outline: result.outline } };
  }

  @Post('jobs/:jobId/script')
  @ApiOperation({ summary: 'Generate a narration script from an approved outline' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 201, type: ScriptVideoJobResponseDto })
  async generateScript(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.generateScript(jobId);
    return { status: 'success', job: result.job, data: { script: result.script } };
  }

  @Patch('jobs/:jobId/script')
  @ApiOperation({ summary: 'Replace the narration script with a reviewed version' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiBody({ type: ScriptVideoScriptDto })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async updateScript(@Param('jobId') jobId: string, @Body() body: ScriptVideoScriptDto) {
    this.ensureValidBody(body, ScriptVideoScriptSchema, 'script');
    const result = await this.scriptVideoService.updateScript(jobId, body);
    return { status: 'success', job: result.job, data: { script: result.script } };
  }

  @Post('jobs/:jobId/script/approve')
  @ApiOperation({ summary: 'Approve the current narration script' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async approveScript(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.approveScript(jobId);
    return { status: 'success', job: result.job, data: { script: result.script } };
  }

  @Post('jobs/:jobId/storyboard')
  @ApiOperation({ summary: 'Generate a storyboard from an approved script' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 201, type: ScriptVideoJobResponseDto })
  async generateStoryboard(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.generateStoryboard(jobId);
    return { status: 'success', job: result.job, data: { storyboard: result.storyboard } };
  }

  @Patch('jobs/:jobId/storyboard')
  @ApiOperation({ summary: 'Replace the storyboard with a reviewed version' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiBody({ type: ScriptVideoStoryboardDto })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async updateStoryboard(@Param('jobId') jobId: string, @Body() body: ScriptVideoStoryboardDto) {
    this.ensureValidBody(body, ScriptVideoStoryboardSchema, 'storyboard');
    const result = await this.scriptVideoService.updateStoryboard(jobId, body);
    return { status: 'success', job: result.job, data: { storyboard: result.storyboard } };
  }

  @Post('jobs/:jobId/storyboard/approve')
  @ApiOperation({ summary: 'Approve the current storyboard' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 200, type: ScriptVideoJobResponseDto })
  async approveStoryboard(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.approveStoryboard(jobId);
    return { status: 'success', job: result.job, data: { storyboard: result.storyboard } };
  }

  @Post('jobs/:jobId/preview')
  @ApiOperation({ summary: 'Render a preview MP4 from an approved storyboard' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 201, type: ScriptVideoJobResponseDto })
  async renderPreview(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.renderPreview(jobId);
    return { status: 'success', job: result.job, data: { video: result.video } };
  }

  @Post('jobs/:jobId/render')
  @ApiOperation({ summary: 'Render the final MP4 from an approved storyboard' })
  @ApiParam({ name: 'jobId', description: 'Script video job id' })
  @ApiResponse({ status: 201, type: ScriptVideoJobResponseDto })
  async renderFinal(@Param('jobId') jobId: string) {
    const result = await this.scriptVideoService.renderFinal(jobId);
    return { status: 'success', job: result.job, data: { video: result.video } };
  }

  private ensureValidBody(
    body: unknown,
    schema: { safeParse: (value: unknown) => { success: boolean; error?: { format: () => unknown } } },
    resource: string,
  ): void {
    const validation = schema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException({
        status: 'error',
        message: `Invalid ${resource}`,
        errors: validation.error?.format(),
      });
    }
  }
}
