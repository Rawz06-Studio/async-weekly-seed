import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WeeklySeed } from './entities/weekly-seed.entity';
import { Score } from './entities/score.entity';
import { PresetQueueItem } from './entities/preset-queue-item.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { SeedModule } from './seed/seed.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ScoreModule } from './score/score.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        if (process.env.NODE_ENV === 'test') {
          return {
            type: 'sqljs',
            location: ':memory:',
            entities: [WeeklySeed, Score, PresetQueueItem, Leaderboard],
            synchronize: true,
          };
        }
        return {
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10),
          username: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'postgres',
          database: process.env.DATABASE_NAME || 'async_weekly_seed',
          entities: [WeeklySeed, Score, PresetQueueItem, Leaderboard],
          synchronize: true,
        };
      },
    }),
    ScheduleModule.forRoot(),
    SeedModule,
    LeaderboardModule,
    ScoreModule,
    DiscordModule,
  ],
})
export class AppModule {}
