import {
  Controller,
  Get,
  Post,
  Body,
  Render,
  Redirect,
  Param,
} from '@nestjs/common';
import { AppService } from './app.service';
import { secondsToTimeString } from './utils/time';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  async getHome() {
    const currentSeed = await this.appService.getCurrentSeed();
    return { seed: currentSeed, formatTime: secondsToTimeString };
  }

  @Post('score')
  @Redirect('/')
  async postScore(
    @Body('playerName') playerName: string,
    @Body('time') time: string,
    @Body('comment') comment: string,
    @Body('vodUrl') vodUrl: string,
  ) {
    if (!playerName) return;
    await this.appService.addScore(playerName, time, comment, vodUrl);
  }

  @Get('archives')
  @Render('archives')
  async getArchives() {
    const archives = await this.appService.getArchives();
    return { archives };
  }

  @Get('archive/:id')
  @Render('archive-detail')
  async getArchive(@Param('id') id: number) {
    const seed = await this.appService.getArchiveById(id);
    return { seed, formatTime: secondsToTimeString };
  }

  @Post('admin/generate-seed')
  @Redirect('/')
  async forceGenerateSeed() {
    await this.appService.generateNewSeed();
  }
}
