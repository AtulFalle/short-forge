import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PuzzleController } from './puzzle/puzzle.controller';
import { VideoController } from './video/video.controller';
import { PuzzleService } from './puzzle/puzzle.service';
import { OllamaService } from './puzzle/ollama.service';
import { PromptBuilder } from './puzzle/prompt.builder';
import { RendererService } from './renderer/renderer.service';
import { TemplateService } from './renderer/template.service';
import { FrameService } from './renderer/frame.service';
import { FfmpegService } from './renderer/ffmpeg.service';
import { ThemeService } from './renderer/theme.service';
import { BackgroundService } from './renderer/background.service';
import { ScriptVideoController } from './script-video/script-video.controller';
import { ScriptVideoPromptBuilder } from './script-video/script-video.prompt-builder';
import { ScriptVideoJobStore } from './script-video/script-video-job.store';
import { ScriptVideoService } from './script-video/script-video.service';
import { ScriptVideoRendererService } from './script-video/script-video-renderer.service';

@Module({
  imports: [],
  controllers: [AppController, PuzzleController, VideoController, ScriptVideoController],
  providers: [
    AppService,
    PuzzleService,
    OllamaService,
    PromptBuilder,
    ScriptVideoPromptBuilder,
    ScriptVideoJobStore,
    ScriptVideoService,
    ScriptVideoRendererService,
    RendererService,
    TemplateService,
    ThemeService,
    BackgroundService,
    FrameService,
    FfmpegService,
  ],
})
export class AppModule {}
