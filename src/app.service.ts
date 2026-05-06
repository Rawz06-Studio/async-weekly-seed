import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklySeed } from './entities/weekly-seed.entity';
import { Score } from './entities/score.entity';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

interface SeedApiResponse {
  seedUrl: string;
  version: string;
  usedSettings: any;
}

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(WeeklySeed)
    private seedRepository: Repository<WeeklySeed>,
    @InjectRepository(Score)
    private scoreRepository: Repository<Score>,
    private configService: ConfigService,
  ) { }

  async onModuleInit() {
    const currentSeed = await this.getCurrentSeed();
    if (!currentSeed) {
      this.logger.log('No seed found, generating initial seed...');
      await this.generateNewSeed();
    }
  }

  async getCurrentSeed() {
    return await this.seedRepository.findOne({
      where: { isActive: true },
      relations: ['scores'],
      order: { createdAt: 'DESC' },
    });
  }

  async getArchives() {
    return await this.seedRepository.find({
      where: { isActive: false },
      order: { createdAt: 'DESC' },
      relations: ['scores'],
    });
  }

  async getArchiveById(id: number) {
    return await this.seedRepository.findOne({
      where: { id },
      relations: ['scores'],
    });
  }

  @Cron('0 20 * * 3', {
    timeZone: 'Europe/Paris',
  })
  async handleCron() {
    await this.generateNewSeed();
  }

  async generateNewSeed() {
    // 1. Disable current seed
    await this.seedRepository.update({ isActive: true }, { isActive: false });

    // 2. Choose a preset based on weights
    const presetWeights = JSON.parse(
      this.configService.get<string>(
        'PRESET_WEIGHTS',
        '{"seed_s9": 40, "seed_tot": 20, "seed_mixed": 20, "seed_rsl": 20}',
      ),
    ) as Record<string, number>;
    const preset = this.weightedRandom(presetWeights);

    // 3. Call API to generate seed
    const apiUrl = this.configService.get<string>('SEED_API_URL');
    try {
      this.logger.log(`Generating seed for preset: ${preset}`);
      const response = await fetch(`${apiUrl}/${preset}`);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = (await response.json()) as SeedApiResponse;

      // 4. Save new seed
      const newSeed = this.seedRepository.create({
        seedUrl: data.seedUrl,
        preset: preset,
        version: data.version,
        settings: JSON.stringify(data.usedSettings),
        isActive: true,
      });

      await this.seedRepository.save(newSeed);
      this.logger.log(`New seed generated: ${data.seedUrl}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate seed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private weightedRandom(weights: Record<string, number>): string {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (const [preset, weight] of Object.entries(weights)) {
      if (random < weight) return preset;
      random -= weight;
    }
    return Object.keys(weights)[0];
  }

  async addScore(
    playerName: string,
    time: string,
    comment: string,
    vodUrl?: string,
  ) {
    const currentSeed = await this.getCurrentSeed();
    if (!currentSeed) throw new Error('No active seed found');

    let normalizedTime = time.trim().toLowerCase();

    // Support empty time, ff, forfeit
    if (
      normalizedTime === '' ||
      normalizedTime === 'ff' ||
      normalizedTime === 'forfeit'
    ) {
      normalizedTime = 'Forfeit';
    } else {
      // Basic time format validation (HH:MM:SS or MM:SS)
      const timeRegex = /^(\d{1,2}:)?([0-5]?\d):([0-5]?\d)$/;
      if (!timeRegex.test(normalizedTime)) {
        throw new Error(
          'Invalid time format. Use HH:MM:SS or MM:SS, or "ff" for forfeit',
        );
      }
    }

    const newScore = this.scoreRepository.create({
      playerName,
      time: normalizedTime,
      comment,
      vodUrl,
      seed: currentSeed,
    } as Partial<Score>);

    return await this.scoreRepository.save(newScore);
  }
}
