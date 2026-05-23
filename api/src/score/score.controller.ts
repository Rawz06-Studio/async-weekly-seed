import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { ScoreService } from './score.service';

@Controller('scores')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async postScore(
    @Body('playerName') playerName: string,
    @Body('time') time: string,
    @Body('comment') comment: string,
    @Body('vodUrl') vodUrl: string,
    @Body('leaderboardId') leaderboardId: string | number,
  ) {
    if (!playerName?.trim()) {
      throw new BadRequestException('Player name is required');
    }
    const lbId = Number(leaderboardId);
    await this.scoreService.addScore(playerName, time, comment, vodUrl, lbId);
    return { success: true };
  }
}
