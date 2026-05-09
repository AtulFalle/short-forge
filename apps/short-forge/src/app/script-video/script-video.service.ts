import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OllamaService } from '../puzzle/ollama.service';
import { ScriptVideoPromptBuilder } from './script-video.prompt-builder';
import { ScriptVideoJobStore } from './script-video-job.store';
import { ScriptVideoRendererService } from './script-video-renderer.service';
import {
  CreateScriptVideoJobInput,
  CreateScriptVideoJobSchema,
  ScriptVideoBrief,
  ScriptVideoBriefSchema,
  ScriptVideoJob,
  ScriptVideoOutline,
  ScriptVideoOutlineSchema,
  ScriptVideoScript,
  ScriptVideoScriptSchema,
  ScriptVideoStage,
  ScriptVideoStoryboard,
  ScriptVideoStoryboardSchema,
} from './script-video.validator';
import { SCRIPT_VIDEO_LIMITS } from './script-video.limits';
import { CreateScriptVideoJobDto } from './dto/create-script-video-job.dto';

const STAGE_ORDER: ScriptVideoStage[] = [
  'brief_created',
  'outline_generated',
  'outline_approved',
  'script_generated',
  'script_approved',
  'storyboard_generated',
  'storyboard_approved',
  'preview_rendered',
  'final_rendered',
  'failed',
];

@Injectable()
export class ScriptVideoService {
  private readonly logger = new Logger(ScriptVideoService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly promptBuilder: ScriptVideoPromptBuilder,
    private readonly jobStore: ScriptVideoJobStore,
    private readonly rendererService: ScriptVideoRendererService,
  ) {}

  async createJob(body: CreateScriptVideoJobDto): Promise<{ job: ScriptVideoJob; brief: ScriptVideoBrief }> {
    const input = this.parseInput(body);
    const brief = ScriptVideoBriefSchema.parse({
      sourceType: input.script ? 'script' : 'prompt',
      prompt: input.prompt,
      suppliedScript: input.script,
      topic: this.deriveTopic(input),
      tone: input.tone,
      style: input.style,
      audience: input.audience,
      durationSec: input.durationSec,
      language: 'English',
      sourceNotes: [],
    });
    const job = await this.jobStore.createJob(brief);

    return { job, brief };
  }

  async generateFromInput(body: CreateScriptVideoJobDto) {
    const created = await this.createJob(body);

    await this.generateOutline(created.job.id);
    await this.approveOutline(created.job.id);
    await this.generateScript(created.job.id);
    await this.approveScript(created.job.id);
    await this.generateStoryboard(created.job.id);
    await this.approveStoryboard(created.job.id);
    await this.renderPreview(created.job.id);
    await this.renderFinal(created.job.id);

    return this.getJob(created.job.id);
  }

  async getJob(jobId: string) {
    const job = await this.jobStore.getJob(jobId);
    const artifacts = await this.jobStore.getJobArtifacts(jobId);

    return { job, artifacts };
  }

  async generateOutline(jobId: string): Promise<{ job: ScriptVideoJob; outline: ScriptVideoOutline }> {
    await this.assertStageBefore(jobId, 'outline_approved', 'Outline is already approved. Use PATCH to edit it.');
    return this.withFailureState(jobId, async () => {
      const brief = await this.jobStore.readBrief(jobId);
      const outline = await this.generateJsonWithRepair(
        this.promptBuilder.buildOutlinePrompt(brief),
        ScriptVideoOutlineSchema,
        'ScriptVideoOutline { title, hook, beats[3..6], closing }',
      );
      const job = await this.jobStore.saveArtifact(jobId, 'outline', outline, 'outline_generated');

      return { job, outline };
    });
  }

  async updateOutline(jobId: string, body: unknown): Promise<{ job: ScriptVideoJob; outline: ScriptVideoOutline }> {
    const outline = ScriptVideoOutlineSchema.parse(body);
    const job = await this.jobStore.saveArtifact(jobId, 'outline', outline, 'outline_generated');

    return { job, outline };
  }

  async approveOutline(jobId: string): Promise<{ job: ScriptVideoJob; outline: ScriptVideoOutline }> {
    const outline = ScriptVideoOutlineSchema.parse(await this.jobStore.readOutline(jobId));
    const job = await this.jobStore.updateStage(jobId, 'outline_approved');

    return { job, outline };
  }

  async generateScript(jobId: string): Promise<{ job: ScriptVideoJob; script: ScriptVideoScript }> {
    await this.assertStageAtLeast(jobId, 'outline_approved', 'Approve outline before generating script.');
    await this.assertStageBefore(jobId, 'script_approved', 'Script is already approved. Use PATCH to edit it.');
    return this.withFailureState(jobId, async () => {
      const brief = await this.jobStore.readBrief(jobId);
      const outline = await this.jobStore.readOutline(jobId);
      const script = await this.generateJsonWithRepair(
        this.promptBuilder.buildScriptPrompt(brief, outline),
        ScriptVideoScriptSchema,
        'ScriptVideoScript { title, narration[3..8], closing }',
      );
      const job = await this.jobStore.saveArtifact(jobId, 'script', script, 'script_generated');

      return { job, script };
    });
  }

  async updateScript(jobId: string, body: unknown): Promise<{ job: ScriptVideoJob; script: ScriptVideoScript }> {
    const script = ScriptVideoScriptSchema.parse(body);
    const job = await this.jobStore.saveArtifact(jobId, 'script', script, 'script_generated');

    return { job, script };
  }

  async approveScript(jobId: string): Promise<{ job: ScriptVideoJob; script: ScriptVideoScript }> {
    const script = ScriptVideoScriptSchema.parse(await this.jobStore.readScript(jobId));
    const job = await this.jobStore.updateStage(jobId, 'script_approved');

    return { job, script };
  }

  async generateStoryboard(jobId: string): Promise<{ job: ScriptVideoJob; storyboard: ScriptVideoStoryboard }> {
    await this.assertStageAtLeast(jobId, 'script_approved', 'Approve script before generating storyboard.');
    await this.assertStageBefore(jobId, 'storyboard_approved', 'Storyboard is already approved. Use PATCH to edit it.');
    return this.withFailureState(jobId, async () => {
      const brief = await this.jobStore.readBrief(jobId);
      const script = await this.jobStore.readScript(jobId);
      const baseStoryboard = this.buildDeterministicStoryboard(brief, script);
      const storyboard = await this.tryEnhanceStoryboard(brief, baseStoryboard);
      const job = await this.jobStore.saveArtifact(jobId, 'storyboard', storyboard, 'storyboard_generated');

      return { job, storyboard };
    });
  }

  async updateStoryboard(jobId: string, body: unknown): Promise<{ job: ScriptVideoJob; storyboard: ScriptVideoStoryboard }> {
    const storyboard = ScriptVideoStoryboardSchema.parse(body);
    const job = await this.jobStore.saveArtifact(jobId, 'storyboard', storyboard, 'storyboard_generated');

    return { job, storyboard };
  }

  async approveStoryboard(jobId: string): Promise<{ job: ScriptVideoJob; storyboard: ScriptVideoStoryboard }> {
    const storyboard = ScriptVideoStoryboardSchema.parse(await this.jobStore.readStoryboard(jobId));
    const job = await this.jobStore.updateStage(jobId, 'storyboard_approved');

    return { job, storyboard };
  }

  async renderPreview(jobId: string): Promise<{ job: ScriptVideoJob; video: string }> {
    await this.assertStageAtLeast(jobId, 'storyboard_approved', 'Approve storyboard before rendering preview.');
    return this.withFailureState(jobId, async () => {
      const brief = await this.jobStore.readBrief(jobId);
      const storyboard = await this.jobStore.readStoryboard(jobId);
      const videoPath = await this.rendererService.render(jobId, brief, storyboard, 'preview.mp4');
      const job = await this.jobStore.updateStage(jobId, 'preview_rendered');

      return { job, video: this.toRelativeOutputPath(videoPath) };
    });
  }

  async renderFinal(jobId: string): Promise<{ job: ScriptVideoJob; video: string }> {
    await this.assertStageAtLeast(jobId, 'storyboard_approved', 'Approve storyboard before final render.');
    return this.withFailureState(jobId, async () => {
      const brief = await this.jobStore.readBrief(jobId);
      const storyboard = await this.jobStore.readStoryboard(jobId);
      const videoPath = await this.rendererService.render(jobId, brief, storyboard, 'final.mp4');
      const job = await this.jobStore.updateStage(jobId, 'final_rendered');

      return { job, video: this.toRelativeOutputPath(videoPath) };
    });
  }

  private parseInput(body: CreateScriptVideoJobDto): CreateScriptVideoJobInput {
    const validation = CreateScriptVideoJobSchema.safeParse(body);
    if (!validation.success) {
      throw new BadRequestException({
        status: 'error',
        message: 'Invalid script video job input',
        errors: validation.error.format(),
      });
    }

    return validation.data;
  }

  private deriveTopic(input: CreateScriptVideoJobInput): string {
    const source = input.prompt ?? input.script ?? 'Untitled short video';
    return source.replace(/\s+/g, ' ').trim().slice(0, 90);
  }

  private async generateJsonWithRepair<T>(
    prompt: string,
    schema: { parse: (value: unknown) => T },
    schemaDescription: string,
  ): Promise<T> {
    let rawText = '';

    for (let attempt = 1; attempt <= SCRIPT_VIDEO_LIMITS.maxRetries; attempt++) {
      try {
        const finalPrompt =
          attempt === 1 ? prompt : this.promptBuilder.buildRepairPrompt(rawText, schemaDescription);
        rawText = await this.ollamaService.generate(finalPrompt, { temperature: 0.25, format: 'json' });
        const json = this.extractJson(rawText);
        return schema.parse(json);
      } catch (error: any) {
        this.logger.warn(`Script video LLM attempt ${attempt} failed: ${error.message}`);
        if (attempt === SCRIPT_VIDEO_LIMITS.maxRetries) {
          throw new BadRequestException(`Generation failed validation: ${error.message}`);
        }
      }
    }

    throw new BadRequestException('Generation failed validation.');
  }

  private extractJson(rawText: string): unknown {
    try {
      return JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('No JSON object found in response.');
      }
      return JSON.parse(match[0]);
    }
  }

  private buildDeterministicStoryboard(
    brief: ScriptVideoBrief,
    script: ScriptVideoScript,
  ): ScriptVideoStoryboard {
    const narration = [...script.narration];
    if (script.closing) {
      narration[narration.length - 1] = narration[narration.length - 1]
        ? `${narration[narration.length - 1]} ${script.closing}`.trim()
        : script.closing;
    }
    const targetSceneCount = Math.min(
      SCRIPT_VIDEO_LIMITS.maxScenes,
      Math.max(SCRIPT_VIDEO_LIMITS.minScenes, narration.length),
    );
    const rawDurations = narration.slice(0, targetSceneCount).map((text) =>
      this.calculateSceneDuration(text, brief.durationSec, targetSceneCount),
    );
    const durations = this.normalizeDurations(rawDurations, brief.durationSec);
    const scenes = narration.slice(0, targetSceneCount).map((text, index) => ({
      narration: text,
      visualText: this.makeVisualText(text, index),
      backgroundPrompt: `Vertical 1080x1920 cinematic background for ${brief.topic}, ${brief.style} style, ${brief.tone} tone, readable center, no text.`,
      mood: index === 0 ? 'hook' : index === targetSceneCount - 1 ? 'closing' : 'reflective',
      durationSec: durations[index],
    }));

    return ScriptVideoStoryboardSchema.parse({
      title: script.title,
      hook: this.makeVisualText(script.narration[0] ?? script.title, 0).slice(0, SCRIPT_VIDEO_LIMITS.maxHookChars),
      scenes,
      closing: script.closing,
    });
  }

  private async tryEnhanceStoryboard(
    brief: ScriptVideoBrief,
    storyboard: ScriptVideoStoryboard,
  ): Promise<ScriptVideoStoryboard> {
    try {
      const enhanced = await this.generateJsonWithRepair(
        this.promptBuilder.buildStoryboardEnhancementPrompt(brief, storyboard),
        ScriptVideoStoryboardSchema,
        'ScriptVideoStoryboard { title, hook, scenes[{narration, visualText, backgroundPrompt, mood, durationSec}], closing }',
      );

      if (enhanced.scenes.length !== storyboard.scenes.length) {
        throw new Error('Enhanced storyboard changed scene count.');
      }

      return enhanced;
    } catch (error: any) {
      this.logger.warn(`Storyboard enhancement failed, using deterministic storyboard: ${error.message}`);
      return storyboard;
    }
  }

  private makeVisualText(text: string, index: number): string {
    const firstSentence = text.split(/[.!?]/)[0].replace(/\s+/g, ' ').trim();
    const fallback = index === 0 ? 'A small thought' : 'Look closer';
    return (firstSentence || fallback).slice(0, SCRIPT_VIDEO_LIMITS.maxVisualTextChars);
  }

  private calculateSceneDuration(text: string, targetDurationSec: number, sceneCount: number): number {
    const wordEstimate = Math.max(1, text.trim().split(/\s+/).length);
    const readingDuration = Math.ceil(wordEstimate / 2.4);
    const evenShare = Math.ceil(targetDurationSec / sceneCount);

    return Math.max(2, Math.min(20, Math.round((readingDuration + evenShare) / 2)));
  }

  private normalizeDurations(durations: number[], targetDurationSec: number): number[] {
    const currentTotal = durations.reduce((sum, value) => sum + value, 0);
    if (currentTotal === targetDurationSec || currentTotal === 0) {
      return durations;
    }

    const scale = targetDurationSec / currentTotal;
    const normalized = durations.map((value) => Math.max(2, Math.min(20, Math.round(value * scale))));
    const difference = targetDurationSec - normalized.reduce((sum, value) => sum + value, 0);

    if (difference === 0) {
      return normalized;
    }

    const adjusted = [...normalized];
    const step = difference > 0 ? 1 : -1;

    for (let i = 0; i < Math.abs(difference); i++) {
      const index = i % adjusted.length;
      const nextValue = adjusted[index] + step;
      if (nextValue >= 2 && nextValue <= 20) {
        adjusted[index] = nextValue;
      }
    }

    return adjusted;
  }

  private async assertStageAtLeast(jobId: string, required: ScriptVideoStage, message: string): Promise<void> {
    const job = await this.jobStore.getJob(jobId);
    if (this.stageIndex(job.stage) < this.stageIndex(required)) {
      throw new BadRequestException(message);
    }
  }

  private async assertStageBefore(jobId: string, stage: ScriptVideoStage, message: string): Promise<void> {
    const job = await this.jobStore.getJob(jobId);
    if (this.stageIndex(job.stage) >= this.stageIndex(stage)) {
      throw new BadRequestException(message);
    }
  }

  private stageIndex(stage: ScriptVideoStage): number {
    return STAGE_ORDER.indexOf(stage);
  }

  private async withFailureState<T>(jobId: string, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown script video failure';
      await this.jobStore.updateStage(jobId, 'failed', message).catch(() => undefined);
      throw error;
    }
  }

  private toRelativeOutputPath(absolutePath: string): string {
    return absolutePath.startsWith(process.cwd())
      ? absolutePath.slice(process.cwd().length + 1).replace(/\\/g, '/')
      : absolutePath.replace(/\\/g, '/');
  }
}
