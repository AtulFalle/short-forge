import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  async generateVideo(inputPattern: string, outputPath: string): Promise<string> {
    try {
      // Normalize paths for FFmpeg (forward slashes are safer even on Windows)
      const normalizedInput = inputPattern.replace(/\\/g, '/');
      const normalizedOutput = outputPath.replace(/\\/g, '/');

      this.logger.log(`Generating video from frames: ${normalizedInput} -> ${normalizedOutput}`);
      
      const command = `ffmpeg -y -framerate 1 -i "${normalizedInput}" -c:v libx264 -r 30 -pix_fmt yuv420p "${normalizedOutput}"`;
      
      this.logger.log(`Executing FFmpeg command: ${command}`);
      
      const { stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('frame=')) {
        this.logger.debug(`FFmpeg output: ${stderr}`);
      }

      return outputPath;
    } catch (error) {
      this.logger.error(`FFmpeg execution failed: ${error.message}`);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  async generateVideoFromScenes(
    scenes: Array<{ imagePath: string; durationSec: number }>,
    outputPath: string,
  ): Promise<string> {
    if (scenes.length === 0) {
      throw new Error('At least one scene is required to generate a video.');
    }

    const listPath = `${outputPath}.concat.txt`;

    try {
      const concatFile = this.renderConcatFile(scenes);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(listPath, concatFile, 'utf-8');

      const normalizedList = listPath.replace(/\\/g, '/');
      const normalizedOutput = outputPath.replace(/\\/g, '/');
      const command = `ffmpeg -y -f concat -safe 0 -i "${normalizedList}" -vf "fps=30,format=yuv420p" -c:v libx264 -movflags +faststart "${normalizedOutput}"`;

      this.logger.log(`Generating scene video: ${normalizedList} -> ${normalizedOutput}`);
      const { stderr } = await execAsync(command);

      if (stderr && !stderr.includes('frame=')) {
        this.logger.debug(`FFmpeg output: ${stderr}`);
      }

      return outputPath;
    } catch (error) {
      this.logger.error(`FFmpeg scene video generation failed: ${error.message}`);
      throw new Error(`Scene video generation failed: ${error.message}`);
    } finally {
      await fs.unlink(listPath).catch((err) =>
        this.logger.debug(`Could not delete temporary concat file ${listPath}: ${err.message}`),
      );
    }
  }

  private renderConcatFile(scenes: Array<{ imagePath: string; durationSec: number }>): string {
    const lines: string[] = [];

    for (const scene of scenes) {
      const normalizedPath = scene.imagePath.replace(/\\/g, '/').replace(/'/g, "'\\''");
      lines.push(`file '${normalizedPath}'`);
      lines.push(`duration ${Math.max(1, scene.durationSec).toFixed(3)}`);
    }

    const lastPath = scenes[scenes.length - 1].imagePath.replace(/\\/g, '/').replace(/'/g, "'\\''");
    lines.push(`file '${lastPath}'`);

    return `${lines.join('\n')}\n`;
  }
}
