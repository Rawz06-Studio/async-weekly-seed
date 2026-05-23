import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Leaderboard } from '../entities/leaderboard.entity';
import { PresetQueueItem } from '../entities/preset-queue-item.entity';
import { WeeklySeed } from '../entities/weekly-seed.entity';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Leaderboard, PresetQueueItem, WeeklySeed]),
  ],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
