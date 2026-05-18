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
  async getHome(@Query('error') error?: string, @Query('lbId') lbId?: string) {
    const leaderboards = await this.appService.getLeaderboardsWithActiveSeeds();
    const nextSeedDate = this.appService.getNextSeedDate();
    return {
      leaderboards,
      nextSeedDate,
      formatTime: secondsToTimeString,
      error,
      activeLbId: lbId ? parseInt(lbId, 10) : null,
    };
  }

  @Post('score')
  async postScore(
    @Body('playerName') playerName: string,
    @Body('time') time: string,
    @Body('comment') comment: string,
    @Body('vodUrl') vodUrl: string,
    @Body('leaderboardId') leaderboardId: string,
    @Res() res: Response,
  ) {
    const lbId = parseInt(leaderboardId, 10);
    if (!playerName) {
      return res.redirect(
        `/?error=${encodeURIComponent('Player name is required')}&lbId=${lbId}`,
      );
    }
    try {
      await this.appService.addScore(playerName, time, comment, vodUrl, lbId);
      return res.redirect(`/?lbId=${lbId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      return res.redirect(
        `/?error=${encodeURIComponent(message)}&lbId=${lbId}`,
      );
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
  async getRulesets() {
    return {
      leaderboards: await this.appService.getLeaderboardsWithRulesets(),
    };
  }

  @Get('upcoming')
  @Render('upcoming')
  async getUpcoming() {
    return await this.appService.getUpcomingPresets();
  }

  @Post('admin/generate-seed')
  @Redirect('/')
  async forceGenerateSeed() {
    await this.appService.handleCron();
  }
}
