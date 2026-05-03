import { Injectable, Logger } from '@nestjs/common';
import { TemplateService } from './template.service';
import { FrameService } from './frame.service';
import { FfmpegService } from './ffmpeg.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

import { Puzzle } from '../puzzle/puzzle.validator';

@Injectable()
export class RendererService {
  private readonly logger = new Logger(RendererService.name);
  private readonly outputDir = path.join(process.cwd(), 'output');

  constructor(
    private readonly templateService: TemplateService,
    private readonly frameService: FrameService,
    private readonly ffmpegService: FfmpegService,
  ) {}

  async render(puzzle: Puzzle): Promise<string> {
    const videoId = uuidv4();
    
    try {
      this.logger.log(`Starting rendering for puzzle: ${videoId}`);
      
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Frame 0: Question (full puzzle)
      this.logger.log(`Creating frame 0 for ${videoId}`);
      await this.createFrame(
        puzzle,
        'Pause & Think...',
        path.join(this.outputDir, `${videoId}_0.png`)
      );

      // Frames 1–10: Timer frames (countdown 10 to 1)
      for (let i = 1; i <= 10; i++) {
        const remaining = 11 - i;
        this.logger.log(`Creating timer frame ${i} for ${videoId} (${remaining}s remaining)`);
        await this.createFrame(
          puzzle,
          `⏳ ${remaining}s remaining`,
          path.join(this.outputDir, `${videoId}_${i}.png`)
        );
      }

      // Frame 11: Final Frame - Answer only (using dedicated answer template)
      this.logger.log(`Creating answer frame 11 for ${videoId}`);
      const answerHtml = await this.templateService.loadAnswerTemplate(puzzle.answer);
      await this.frameService.captureFrame(answerHtml, path.join(this.outputDir, `${videoId}_11.png`));

      // Generate Video
      const inputPattern = path.join(this.outputDir, `${videoId}_%d.png`);
      const videoOutput = path.join(this.outputDir, `${videoId}.mp4`);
      
      this.logger.log(`Stitching video for ${videoId}`);
      await this.ffmpegService.generateVideo(inputPattern, videoOutput);

      this.logger.log(`Video generation complete: ${videoOutput}`);
      
      // Cleanup frames
      this.logger.log(`Cleaning up frames for ${videoId}`);
      for (let i = 0; i <= 11; i++) {
        const framePath = path.join(this.outputDir, `${videoId}_${i}.png`);
        await fs.unlink(framePath).catch((err) => this.logger.debug(`Could not delete temporary frame ${framePath}: ${err.message}`));
      }

      return `output/${videoId}.mp4`;
    } catch (error) {
      this.logger.error(`Rendering failed for puzzle ${videoId}: ${error.message}`);
      throw error;
    }
  }

  private async createFrame(puzzle: Puzzle, footer: string, framePath: string): Promise<void> {
    try {
      const html = await this.templateService.loadCodeTemplate({
        ...puzzle,
        footer,
      });
      await this.frameService.captureFrame(html, framePath);
    } catch (error) {
      this.logger.error(`Failed to create frame at ${framePath}: ${error.message}`);
      throw error;
    }
  }
}
