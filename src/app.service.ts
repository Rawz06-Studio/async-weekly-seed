import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklySeed } from './entities/weekly-seed.entity';
import { Score } from './entities/score.entity';
import { PresetQueueItem } from './entities/preset-queue-item.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { timeStringToSeconds } from './utils/time';

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
    @InjectRepository(PresetQueueItem)
    private presetQueueRepository: Repository<PresetQueueItem>,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.fillQueue();

    const currentSeed = await this.getCurrentSeed();
    if (!currentSeed) {
      this.logger.log('No seed found, generating initial seed...');
      await this.generateNewSeed();
    }

    const day = this.configService.get<number>('SEED_CHANGE_DAY', 3);
    const hour = this.configService.get<number>('SEED_CHANGE_HOUR', 20);
    const cronExpression = `0 ${hour} * * ${day}`;

    this.logger.log(
      `Registering weekly cron: "${cronExpression}" (Europe/Paris)`,
    );

    const job = new CronJob(
      cronExpression,
      () => void this.handleCron(),
      null,
      true,
      'Europe/Paris',
    );

    this.schedulerRegistry.addCronJob('weekly-seed', job);
  }

  async getCurrentSeed() {
    return await this.seedRepository
      .createQueryBuilder('seed')
      .leftJoinAndSelect('seed.scores', 'score')
      .where('seed.isActive = :isActive', { isActive: true })
      .orderBy('seed.createdAt', 'DESC')
      .addOrderBy('score.time', 'ASC', 'NULLS LAST')
      .getOne();
  }

  async getArchives() {
    return await this.seedRepository.find({
      where: { isActive: false },
      order: { createdAt: 'DESC' },
      relations: ['scores'],
    });
  }

  async getArchiveById(id: number) {
    return await this.seedRepository
      .createQueryBuilder('seed')
      .leftJoinAndSelect('seed.scores', 'score')
      .where('seed.id = :id', { id })
      .addOrderBy('score.time', 'ASC', 'NULLS LAST')
      .getOne();
  }

  async handleCron() {
    await this.generateNewSeed();
  }

  getNextSeedDate(): Date | null {
    try {
      const job = this.schedulerRegistry.getCronJob('weekly-seed');
      return new Date(Number(job.nextDate().toMillis()));
    } catch {
      return null;
    }
  }

  async generateNewSeed() {
    // 1. Disable current seed
    await this.seedRepository.update({ isActive: true }, { isActive: false });

    // 2. Pop next preset from queue
    const nextItem = await this.presetQueueRepository.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });

    let preset: string;
    if (nextItem) {
      preset = nextItem.preset;
      await this.presetQueueRepository.delete(nextItem.id);
    } else {
      this.logger.warn(
        'Preset queue was empty, falling back to weighted random',
      );
      preset = this.weightedRandom(this.getPresetWeights());
    }

    // 3. Replenish queue by one to maintain target size
    await this.pushToQueue(1);

    // 4. Call API to generate seed
    const apiUrl = this.configService.get<string>('SEED_API_URL');
    try {
      this.logger.log(`Generating seed for preset: ${preset}`);
      const response = await fetch(`${apiUrl}/${preset}`);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = (await response.json()) as SeedApiResponse;

      // 5. Save new seed
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

  async getUpcomingPresets() {
    const items = await this.presetQueueRepository.find({
      order: { createdAt: 'ASC' },
    });

    const nextDate = this.getNextSeedDate();
    if (!nextDate) return [];

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    return items.map((item, index) => ({
      preset: item.preset,
      name: item.preset.replace('seed_', '').toUpperCase(),
      date: new Date(nextDate.getTime() + index * WEEK_MS),
    }));
  }

  private getPresetWeights(): Record<string, number> {
    return JSON.parse(
      this.configService.get<string>(
        'PRESET_WEIGHTS',
        '{"seed_s9": 40, "seed_tot": 20, "seed_mixed": 20, "seed_rsl": 20}',
      ),
    ) as Record<string, number>;
  }

  private async fillQueue() {
    const targetSize = this.configService.get<number>('PRESET_QUEUE_SIZE', 5);
    const currentCount = await this.presetQueueRepository.count();
    const toAdd = targetSize - currentCount;
    if (toAdd > 0) {
      this.logger.log(
        `Filling preset queue: adding ${toAdd} item(s) (target: ${targetSize})`,
      );
      await this.pushToQueue(toAdd);
    }
  }

  private async pushToQueue(count: number) {
    const weights = this.getPresetWeights();
    for (let i = 0; i < count; i++) {
      await this.presetQueueRepository.save(
        this.presetQueueRepository.create({
          preset: this.weightedRandom(weights),
        }),
      );
    }
  }

  getRulesets() {
    const presetWeights = this.getPresetWeights();

    const descriptions: Record<string, string> = {
      seed_s9:
        'Standard Season 9 — the main competitive tournament ruleset. Fixed, well-balanced settings used as the reference format for the weekly async.',
      seed_tot:
        'Tournament of Truth — the flagship tournament of the French-speaking OoTR community, with its own curated ruleset and competitive spirit.',
      seed_mixed:
        'Mixed Pools — all entrances are randomised across the board, turning every seed into an unpredictable adventure where nothing is where you expect it.',
      seed_rsl:
        'Random Settings League — each seed rolls a random combination of settings, keeping every run fresh. Currently running Season 7; presets will be updated as soon as Season 8 is announced.',
    };

    const totalWeight = Object.values(presetWeights).reduce((a, b) => a + b, 0);

    return Object.entries(presetWeights).map(([key, weight]) => ({
      key,
      name: key.replace('seed_', '').toUpperCase(),
      weight,
      probability: Math.round((weight / totalWeight) * 100),
      description: descriptions[key] ?? 'No description available.',
    }));
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

    return await this.scoreRepository.save(newScore);
  }
}
