import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklySeed } from '../entities/weekly-seed.entity';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WeeklySeed]),
    LeaderboardModule,
    DiscordModule,
  ],
  providers: [SeedService],
  controllers: [SeedController],
  exports: [SeedService],
})
export class SeedModule {}
