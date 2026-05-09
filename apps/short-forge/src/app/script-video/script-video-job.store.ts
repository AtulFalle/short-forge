import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ScriptVideoBrief,
  ScriptVideoJob,
  ScriptVideoJobSchema,
  ScriptVideoOutline,
  ScriptVideoScript,
  ScriptVideoStage,
  ScriptVideoStoryboard,
} from './script-video.validator';

export type ScriptVideoArtifactName = 'brief' | 'outline' | 'script' | 'storyboard';

@Injectable()
export class ScriptVideoJobStore {
  private readonly rootDir = path.join(process.cwd(), 'output', 'jobs');

  async createJob(brief: ScriptVideoBrief): Promise<ScriptVideoJob> {
    const now = new Date().toISOString();
    const job: ScriptVideoJob = {
      id: uuidv4(),
      stage: 'brief_created',
      createdAt: now,
      updatedAt: now,
    };

    await fs.mkdir(this.getJobDir(job.id), { recursive: true });
    await this.writeJson(job.id, 'job', job);
    await this.writeJson(job.id, 'brief', brief);

    return job;
  }

  async getJob(jobId: string): Promise<ScriptVideoJob> {
    try {
      const job = await this.readJson<ScriptVideoJob>(jobId, 'job');
      return ScriptVideoJobSchema.parse(job);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException(`Script video job not found: ${jobId}`);
      }
      throw error;
    }
  }

  async updateStage(jobId: string, stage: ScriptVideoStage, error?: string): Promise<ScriptVideoJob> {
    const job = await this.getJob(jobId);
    const updated: ScriptVideoJob = {
      ...job,
      stage,
      updatedAt: new Date().toISOString(),
      ...(error ? { error } : { error: undefined }),
    };

    await this.writeJson(jobId, 'job', updated);
    return updated;
  }

  async readBrief(jobId: string): Promise<ScriptVideoBrief> {
    return this.readJson<ScriptVideoBrief>(jobId, 'brief');
  }

  async readOutline(jobId: string): Promise<ScriptVideoOutline> {
    return this.readJson<ScriptVideoOutline>(jobId, 'outline');
  }

  async readScript(jobId: string): Promise<ScriptVideoScript> {
    return this.readJson<ScriptVideoScript>(jobId, 'script');
  }

  async readStoryboard(jobId: string): Promise<ScriptVideoStoryboard> {
    return this.readJson<ScriptVideoStoryboard>(jobId, 'storyboard');
  }

  async getJobArtifacts(jobId: string): Promise<{
    brief: ScriptVideoBrief;
    outline: ScriptVideoOutline | null;
    script: ScriptVideoScript | null;
    storyboard: ScriptVideoStoryboard | null;
    previewVideo: string | null;
    finalVideo: string | null;
  }> {
    const jobDir = this.getJobDir(jobId);

    return {
      brief: await this.readBrief(jobId),
      outline: await this.readOptional(() => this.readOutline(jobId)),
      script: await this.readOptional(() => this.readScript(jobId)),
      storyboard: await this.readOptional(() => this.readStoryboard(jobId)),
      previewVideo: (await this.fileExists(path.join(jobDir, 'preview.mp4')))
        ? this.toRelativePath(path.join(jobDir, 'preview.mp4'))
        : null,
      finalVideo: (await this.fileExists(path.join(jobDir, 'final.mp4')))
        ? this.toRelativePath(path.join(jobDir, 'final.mp4'))
        : null,
    };
  }

  async saveArtifact(
    jobId: string,
    artifact: 'outline',
    value: ScriptVideoOutline,
    stage: ScriptVideoStage,
  ): Promise<ScriptVideoJob>;
  async saveArtifact(
    jobId: string,
    artifact: 'script',
    value: ScriptVideoScript,
    stage: ScriptVideoStage,
  ): Promise<ScriptVideoJob>;
  async saveArtifact(
    jobId: string,
    artifact: 'storyboard',
    value: ScriptVideoStoryboard,
    stage: ScriptVideoStage,
  ): Promise<ScriptVideoJob>;
  async saveArtifact(
    jobId: string,
    artifact: Exclude<ScriptVideoArtifactName, 'brief'>,
    value: ScriptVideoOutline | ScriptVideoScript | ScriptVideoStoryboard,
    stage: ScriptVideoStage,
  ): Promise<ScriptVideoJob> {
    await this.getJob(jobId);
    await this.writeJson(jobId, artifact, value);
    return this.updateStage(jobId, stage);
  }

  getJobDir(jobId: string): string {
    return path.join(this.rootDir, jobId);
  }

  private async readJson<T>(jobId: string, name: string): Promise<T> {
    const filePath = path.join(this.getJobDir(jobId), `${name}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }

  private async writeJson(jobId: string, name: string, value: unknown): Promise<void> {
    const filePath = path.join(this.getJobDir(jobId), `${name}.json`);
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
  }

  private async readOptional<T>(reader: () => Promise<T>): Promise<T | null> {
    try {
      return await reader();
    } catch (error) {
      return null;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private toRelativePath(absolutePath: string): string {
    return absolutePath.startsWith(process.cwd())
      ? absolutePath.slice(process.cwd().length + 1).replace(/\\/g, '/')
      : absolutePath.replace(/\\/g, '/');
  }
}
