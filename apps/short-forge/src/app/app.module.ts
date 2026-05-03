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

@Module({
  imports: [],
  controllers: [AppController, PuzzleController, VideoController],
  providers: [
    AppService,
    PuzzleService,
    OllamaService,
    PromptBuilder,
    RendererService,
    TemplateService,
    FrameService,
    FfmpegService,
  ],
})
export class AppModule {}
