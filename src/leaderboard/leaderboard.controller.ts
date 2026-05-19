import { Controller, Get, Render } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('rulesets')
  @Render('rulesets')
  async getRulesets() {
    return {
      leaderboards: await this.leaderboardService.getLeaderboardsWithRulesets(),
    };
  }
}
