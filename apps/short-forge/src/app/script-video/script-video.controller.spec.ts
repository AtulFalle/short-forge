import { Test, TestingModule } from '@nestjs/testing';
import { ScriptVideoController } from './script-video.controller';
import { ScriptVideoService } from './script-video.service';

describe('ScriptVideoController', () => {
  let controller: ScriptVideoController;
  let service: jest.Mocked<ScriptVideoService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScriptVideoController],
      providers: [
        {
          provide: ScriptVideoService,
          useValue: {
            createJob: jest.fn().mockResolvedValue({
              job: {
                id: '00000000-0000-4000-8000-000000000001',
                stage: 'brief_created',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
              brief: { sourceType: 'prompt' },
            }),
            getJob: jest.fn(),
            generateOutline: jest.fn(),
            updateOutline: jest.fn(),
            approveOutline: jest.fn(),
            generateScript: jest.fn(),
            updateScript: jest.fn(),
            approveScript: jest.fn(),
            generateStoryboard: jest.fn(),
            updateStoryboard: jest.fn(),
            approveStoryboard: jest.fn(),
            renderPreview: jest.fn(),
            renderFinal: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ScriptVideoController);
    service = module.get(ScriptVideoService);
  });

  it('creates a job from a prompt', async () => {
    const response = await controller.createJob({ prompt: 'Why small habits matter' });
    expect(service.createJob).toHaveBeenCalledWith({ prompt: 'Why small habits matter' });
    expect(response.status).toBe('success');
    expect(response.job.stage).toBe('brief_created');
  });
});

