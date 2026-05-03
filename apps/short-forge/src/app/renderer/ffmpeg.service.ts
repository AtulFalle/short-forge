import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

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
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('frame=')) {
        this.logger.debug(`FFmpeg output: ${stderr}`);
      }

      return outputPath;
    } catch (error) {
      this.logger.error(`FFmpeg execution failed: ${error.message}`);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }
}
