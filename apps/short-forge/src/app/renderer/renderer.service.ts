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
    const jobId = uuidv4();
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const formattedDate = `${dd}-${mm}-${yyyy}`;
    
    // Normalize topic and difficulty for filename
    const safeTopic = puzzle.topic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const safeDifficulty = puzzle.difficulty.toLowerCase();
    const outputFileName = `${safeTopic}-${safeDifficulty}-${formattedDate}`;
    
    try {
      this.logger.log(`Starting rendering for puzzle: ${outputFileName} (Job: ${jobId})`);
      
      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Phase 1: Question (Frames 0-9, 10 frames)
      this.logger.log(`Creating question frames (0-9) for ${jobId}`);
      const questionHtml = await this.templateService.loadCodeTemplate({
        hook: puzzle.hook,
        question: puzzle.question,
        code: puzzle.code,
      });
      const firstQuestionFrame = path.join(this.outputDir, `${jobId}_0.png`);
      await this.frameService.captureFrame(questionHtml, firstQuestionFrame);
      
      for (let i = 1; i <= 9; i++) {
        await fs.copyFile(firstQuestionFrame, path.join(this.outputDir, `${jobId}_${i}.png`));
      }

      // Phase 2: Options & Timer (Frames 10-19, 10 frames)
      this.logger.log(`Creating options frames (10-19) for ${jobId}`);
      for (let i = 0; i <= 9; i++) {
        const remaining = 10 - i;
        const optionsHtml = await this.templateService.loadOptionsTemplate({
          hook: puzzle.hook,
          options: puzzle.options,
          timer: remaining,
        });
        await this.frameService.captureFrame(
          optionsHtml,
          path.join(this.outputDir, `${jobId}_${10 + i}.png`)
        );
      }

      // Phase 3: Answer (Frames 20-24, 5 frames)
      this.logger.log(`Creating answer frames (20-24) for ${jobId}`);
      const answerHtml = await this.templateService.loadAnswerTemplate(puzzle.answer, puzzle.explanation);
      const firstAnswerFrame = path.join(this.outputDir, `${jobId}_20.png`);
      await this.frameService.captureFrame(answerHtml, firstAnswerFrame);
      
      for (let i = 21; i <= 24; i++) {
        await fs.copyFile(firstAnswerFrame, path.join(this.outputDir, `${jobId}_${i}.png`));
      }

      // Generate Video
      const inputPattern = path.join(this.outputDir, `${jobId}_%d.png`);
      const videoOutput = path.join(this.outputDir, `${outputFileName}.mp4`);
      
      this.logger.log(`Stitching video for ${outputFileName}`);
      await this.ffmpegService.generateVideo(inputPattern, videoOutput);

      this.logger.log(`Video generation complete: ${videoOutput}`);
      
      // Cleanup frames (Total 25 frames: 0 to 24)
      this.logger.log(`Cleaning up 25 frames for ${jobId}`);
      for (let i = 0; i <= 24; i++) {
        const framePath = path.join(this.outputDir, `${jobId}_${i}.png`);
        await fs.unlink(framePath).catch((err) => 
          this.logger.debug(`Could not delete temporary frame ${framePath}: ${err.message}`)
        );
      }

      return `output/${outputFileName}.mp4`;
    } catch (error) {
      this.logger.error(`Rendering failed for puzzle ${jobId}: ${error.message}`);
      throw error;
    }
  }
}
