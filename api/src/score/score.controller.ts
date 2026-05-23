import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ScoreService } from './score.service';

@Controller()
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

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
      await this.scoreService.addScore(playerName, time, comment, vodUrl, lbId);
      return res.redirect(`/?lbId=${lbId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      return res.redirect(
        `/?error=${encodeURIComponent(message)}&lbId=${lbId}`,
      );
    }
  }
}
