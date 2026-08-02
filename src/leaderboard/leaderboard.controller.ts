import { Controller, Get, Param, Post, Render, Redirect } from '@nestjs/common';
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

  @Post('admin/leaderboards/:id/toggle')
  @Redirect('/')
  async toggleLeaderboard(@Param('id') id: number) {
    await this.leaderboardService.toggleActive(id);
  }
}
