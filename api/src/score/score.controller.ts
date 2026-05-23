import { Controller, Post, Body, BadRequestException, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ScoreService } from './score.service';

@Controller('scores')
@UseGuards(ThrottlerGuard)
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 3600_000, limit: 5 } })
  async postScore(
    @Body('playerName') playerName: string,
    @Body('time') time: string,
    @Body('comment') comment: string,
    @Body('vodUrl') vodUrl: string,
    @Body('leaderboardId') leaderboardId: string | number,
    @Body('website') honeypot: string,
  ) {
    // Honeypot: silently succeed without saving if the field is filled (bot behavior)
    if (honeypot) {
      return { success: true };
    }

    if (!playerName?.trim()) {
      throw new BadRequestException('Player name is required');
    }
    const lbId = Number(leaderboardId);
    await this.scoreService.addScore(playerName, time, comment, vodUrl, lbId);
    return { success: true };
  }
}
