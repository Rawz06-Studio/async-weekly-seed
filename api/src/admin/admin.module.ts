import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AdminController } from './admin.controller';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { ScoreModule } from '../score/score.module';
import { SeedModule } from '../seed/seed.module';

@Module({
  imports: [LeaderboardModule, ScoreModule, SeedModule],
  providers: [AdminService, AdminGuard],
  controllers: [AdminController],
})
export class AdminModule {}
