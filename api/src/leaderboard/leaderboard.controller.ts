import { Controller, Get } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('rulesets')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getRulesets() {
    return this.leaderboardService.getLeaderboardsWithRulesets();
  }
}
