import {
  Controller,
  Get,
  Post,
  Body,
  Render,
  Redirect,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { secondsToTimeString } from './utils/time';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  async getHome(@Query('error') error?: string) {
    const currentSeed = await this.appService.getCurrentSeed();
    const nextSeedDate = this.appService.getNextSeedDate();
    return { seed: currentSeed, nextSeedDate, formatTime: secondsToTimeString, error };
  }

  @Post('score')
  async postScore(
    @Body('playerName') playerName: string,
    @Body('time') time: string,
    @Body('comment') comment: string,
    @Body('vodUrl') vodUrl: string,
    @Res() res: Response,
  ) {
    if (!playerName) {
      return res.redirect('/?error=' + encodeURIComponent('Player name is required'));
    }
    try {
      await this.appService.addScore(playerName, time, comment, vodUrl);
      return res.redirect('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      return res.redirect('/?error=' + encodeURIComponent(message));
    }
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

  @Get('rulesets')
  @Render('rulesets')
  getRulesets() {
    return { rulesets: this.appService.getRulesets() };
  }

  @Get('upcoming')
  @Render('upcoming')
  async getUpcoming() {
    return { upcoming: await this.appService.getUpcomingPresets() };
  }

  @Post('admin/generate-seed')
  @Redirect('/')
  async forceGenerateSeed() {
    await this.appService.generateNewSeed();
  }
}
