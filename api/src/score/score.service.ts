import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { SeedService } from '../seed/seed.service';
import { timeStringToSeconds } from '../utils/time';

@Injectable()
export class ScoreService {
  constructor(
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
    private seedService: SeedService,
  ) {}

  async addScore(
    playerName: string,
    time: string,
    comment: string,
    vodUrl?: string,
    leaderboardId?: number,
  ): Promise<Score> {
    const currentSeed = leaderboardId
      ? await this.seedService.getCurrentSeedForLeaderboard(leaderboardId)
      : null;

    if (!currentSeed) throw new Error('No active seed found');

    const normalizedTime = time.trim().toLowerCase();
    let timeInSeconds: number | null;

    if (
      !normalizedTime ||
      normalizedTime === 'ff' ||
      normalizedTime === 'forfeit'
    ) {
      timeInSeconds = null;
    } else {
      const timeRegex = /^(\d{1,2}:)?([0-5]?\d):([0-5]?\d)$/;
      if (!timeRegex.test(normalizedTime)) {
        throw new Error(
          'Invalid time format. Use HH:MM:SS or MM:SS, or "ff" for forfeit',
        );
      }
      timeInSeconds = timeStringToSeconds(normalizedTime);
    }

    const newScore = this.scoreRepository.create({
      playerName,
      time: timeInSeconds,
      comment,
      vodUrl,
      seed: currentSeed,
    } as Partial<Score>);

    return this.scoreRepository.save(newScore);
  }

  async getAllScoresAdmin(): Promise<Score[]> {
    return this.scoreRepository.find({
      relations: ['seed', 'seed.leaderboard'],
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async deleteScore(id: number): Promise<void> {
    await this.scoreRepository.delete(id);
  }

  async updateScore(
    id: number,
    data: { time?: number | null; comment?: string | null; vodUrl?: string | null },
  ): Promise<Score> {
    const score = await this.scoreRepository.findOneOrFail({ where: { id } });
    Object.assign(score, data);
    return this.scoreRepository.save(score);
  }
}
