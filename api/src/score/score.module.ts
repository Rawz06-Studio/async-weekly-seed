import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from '../entities/score.entity';
import { ScoreService } from './score.service';
import { ScoreController } from './score.controller';
import { SeedModule } from '../seed/seed.module';

@Module({
  imports: [TypeOrmModule.forFeature([Score]), SeedModule],
  providers: [ScoreService],
  controllers: [ScoreController],
  exports: [ScoreService],
})
export class ScoreModule {}
