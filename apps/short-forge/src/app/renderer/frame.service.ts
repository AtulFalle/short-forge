import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class FrameService implements OnModuleDestroy {
  private readonly logger = new Logger(FrameService.name);
  private browser: puppeteer.Browser | null = null;

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async captureFrame(html: string, outputPath: string): Promise<void> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      this.logger.log(`Capturing frame: ${outputPath}`);
      
      await page.setViewport({
        width: 1080,
        height: 1920,
        deviceScaleFactor: 1,
      });

      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.screenshot({
        path: outputPath,
        type: 'png',
      });
    } catch (error) {
      this.logger.error(`Failed to capture frame: ${error.message}`);
      throw error;
    } finally {
      await page.close();
    }
  }
}
