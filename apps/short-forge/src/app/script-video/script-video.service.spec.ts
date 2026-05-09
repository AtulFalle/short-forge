import * as fs from 'fs/promises';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { ScriptVideoJobStore } from './script-video-job.store';
import { ScriptVideoPromptBuilder } from './script-video.prompt-builder';
import { ScriptVideoRendererService } from './script-video-renderer.service';
import { ScriptVideoService } from './script-video.service';

describe('ScriptVideoService', () => {
  let service: ScriptVideoService;
  let store: ScriptVideoJobStore;
  let renderer: jest.Mocked<ScriptVideoRendererService>;

  beforeEach(() => {
    store = new ScriptVideoJobStore();
    renderer = {
      render: jest.fn().mockResolvedValue(path.join(process.cwd(), 'output', 'jobs', 'fake', 'preview.mp4')),
    } as unknown as jest.Mocked<ScriptVideoRendererService>;

    service = new ScriptVideoService(
      {
        generate: jest.fn(),
      } as any,
      new ScriptVideoPromptBuilder(),
      store,
      renderer,
    );
  });

  afterEach(async () => {
    const jobsDir = path.join(process.cwd(), 'output', 'jobs');
    await fs.rm(jobsDir, { recursive: true, force: true });
  });

  it('creates a brief-first job from a prompt', async () => {
    const result = await service.createJob({ prompt: 'Why habits matter' });

    expect(result.job.stage).toBe('brief_created');
    expect(result.brief.sourceType).toBe('prompt');
    expect(result.brief.language).toBe('English');
  });

  it('prevents script generation before outline approval', async () => {
    const result = await service.createJob({ prompt: 'Why habits matter' });

    await expect(service.generateScript(result.job.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds a storyboard from an approved script and preserves the duration budget', async () => {
    const job = await service.createJob({ prompt: 'Why habits matter', durationSec: 35 });
    await service.updateOutline(job.job.id, {
      title: 'Why habits matter',
      hook: 'Start tiny',
      beats: ['Small choices compound.', 'Consistency beats intensity.', 'Identity follows repetition.'],
      closing: 'Tiny steps count.',
    });
    await service.approveOutline(job.job.id);
    await service.updateScript(job.job.id, {
      title: 'Why habits matter',
      narration: [
        'Big change usually looks small at the beginning.',
        'When a habit is easy to repeat, it survives bad days.',
        'That is how consistency quietly changes identity.',
      ],
      closing: 'Start smaller than your ego wants.',
    });
    await service.approveScript(job.job.id);

    const result = await service.generateStoryboard(job.job.id);
    const totalDuration = result.storyboard.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);

    expect(result.job.stage).toBe('storyboard_generated');
    expect(totalDuration).toBe(35);
    expect(result.storyboard.scenes.length).toBeGreaterThanOrEqual(3);
  });
});

