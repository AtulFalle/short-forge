import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BackgroundService } from '../renderer/background.service';
import { FfmpegService } from '../renderer/ffmpeg.service';
import { FrameService } from '../renderer/frame.service';
import { TemplateService } from '../renderer/template.service';
import { ThemeService } from '../renderer/theme.service';
import { Puzzle } from '../puzzle/puzzle.validator';
import { ScriptVideoBrief, ScriptVideoStoryboard } from './script-video.validator';

@Injectable()
export class ScriptVideoRendererService {
  private readonly logger = new Logger(ScriptVideoRendererService.name);

  constructor(
    private readonly templateService: TemplateService,
    private readonly themeService: ThemeService,
    private readonly backgroundService: BackgroundService,
    private readonly frameService: FrameService,
    private readonly ffmpegService: FfmpegService,
  ) {}

  async render(
    jobId: string,
    brief: ScriptVideoBrief,
    storyboard: ScriptVideoStoryboard,
    outputFileName: 'preview.mp4' | 'final.mp4',
  ): Promise<string> {
    const jobDir = path.join(process.cwd(), 'output', 'jobs', jobId);
    const pseudoPuzzle = this.toPseudoPuzzle(brief, storyboard);
    await fs.mkdir(jobDir, { recursive: true });

    const theme = await this.themeService.generateTheme(pseudoPuzzle);
    const background = await this.backgroundService.generateBackground(pseudoPuzzle, theme, `${jobId}-${outputFileName}`);
    const sceneFiles: Array<{ imagePath: string; durationSec: number }> = [];

    try {
      for (const [index, scene] of storyboard.scenes.entries()) {
        const imagePath = path.join(jobDir, `scene-${index}.png`);
        const html = await this.templateService.loadStorySceneTemplate({
          title: storyboard.title,
          hook: index === 0 ? storyboard.hook : scene.mood,
          visualText: scene.visualText,
          narration: scene.narration,
          sceneIndex: index + 1,
          sceneCount: storyboard.scenes.length,
          theme,
          background,
        });

        await this.frameService.captureFrame(html, imagePath);
        sceneFiles.push({ imagePath, durationSec: scene.durationSec });
      }

      const outputPath = path.join(jobDir, outputFileName);
      await this.ffmpegService.generateVideoFromScenes(sceneFiles, outputPath);
      return outputPath;
    } finally {
      await Promise.all(
        sceneFiles.map(async (scene) =>
          fs.unlink(scene.imagePath).catch((error) =>
            this.logger.debug(`Could not delete temporary scene ${scene.imagePath}: ${error.message}`),
          ),
        ),
      );
    }
  }

  private toPseudoPuzzle(brief: ScriptVideoBrief, storyboard: ScriptVideoStoryboard): Puzzle {
    return {
      hook: storyboard.hook,
      question: storyboard.title,
      code: storyboard.scenes.map((scene) => scene.narration).join('\n\n'),
      options: ['story', 'reflection', 'insight'],
      answer: 'story',
      explanation: storyboard.closing,
      difficulty: 'medium',
      tags: [brief.style, brief.tone, brief.audience].filter(Boolean),
      topic: brief.topic,
    };
  }
}

