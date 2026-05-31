import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { WeeklySeed } from '../entities/weekly-seed.entity';
import { Leaderboard } from '../entities/leaderboard.entity';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { DiscordService } from '../discord/discord.service';

interface SeedApiResponse {
  seedUrl: string;
  version: string;
  usedSettings: any;
}

interface FrancoApiOption {
  label: string;
  description: string;
  settingsToApply: Record<string, unknown>;
  [key: string]: unknown;
}

interface FrancoApiResponse {
  seed: {
    seedUrl: string;
    version: string;
    usedSettings: any;
  };
  options: FrancoApiOption[];
}

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(WeeklySeed)
    private seedRepository: Repository<WeeklySeed>,
    private leaderboardService: LeaderboardService,
    private discordService: DiscordService,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.leaderboardService.ensureDefaultLeaderboard();
    await this.leaderboardService.fillAllQueues();

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

    const leaderboards = await this.leaderboardService.getAll();
    for (const lb of leaderboards) {
      const current = await this.getCurrentSeedForLeaderboard(lb.id);
      if (!current) {
        this.logger.log(`No active seed for "${lb.name}", generating...`);
        await this.generateNewSeed(lb);
      }
    }
  }

  getNextSeedDate(): Date | null {
    try {
      const job = this.schedulerRegistry.getCronJob('weekly-seed');
      return new Date(Number(job.nextDate().toMillis()));
    } catch {
      return null;
    }
  }

  async getCurrentSeedForLeaderboard(
    leaderboardId: number,
  ): Promise<WeeklySeed | null> {
    return this.seedRepository
      .createQueryBuilder('seed')
      .leftJoinAndSelect('seed.scores', 'score')
      .where('seed.isActive = :isActive AND seed.leaderboardId = :lbId', {
        isActive: true,
        lbId: leaderboardId,
      })
      .orderBy('seed.createdAt', 'DESC')
      .addOrderBy('score.time', 'ASC', 'NULLS LAST')
      .getOne();
  }

  async getLeaderboardsWithActiveSeeds() {
    const leaderboards = await this.leaderboardService.getAll();
    return Promise.all(
      leaderboards.map(async (lb) => ({
        ...lb,
        seed: await this.getCurrentSeedForLeaderboard(lb.id),
      })),
    );
  }

  async getArchives(): Promise<WeeklySeed[]> {
    return this.seedRepository.find({
      where: { isActive: false },
      order: { createdAt: 'DESC' },
      relations: ['scores'],
    });
  }

  async getArchiveById(id: number): Promise<WeeklySeed | null> {
    return this.seedRepository
      .createQueryBuilder('seed')
      .leftJoinAndSelect('seed.scores', 'score')
      .where('seed.id = :id', { id })
      .addOrderBy('score.time', 'ASC', 'NULLS LAST')
      .getOne();
  }

  async getUpcomingPresets() {
    const leaderboards = await this.leaderboardService.getAll();
    const nextDate = this.getNextSeedDate();
    if (!nextDate || leaderboards.length === 0)
      return { leaderboards: [], rows: [] };

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    const lbsWithItems = await Promise.all(
      leaderboards.map(async (lb) => {
        const items = await this.leaderboardService.getQueueItems(lb.id);
        return {
          id: lb.id,
          name: lb.name,
          items: items.map((item, i) => ({
            preset: item.preset,
            name: item.preset.replace('seed_', '').toUpperCase(),
            date: new Date(nextDate.getTime() + i * WEEK_MS),
          })),
        };
      }),
    );

    const maxLen = Math.max(...lbsWithItems.map((lb) => lb.items.length), 0);
    const rows = Array.from({ length: maxLen }, (_, i) => ({
      date: new Date(nextDate.getTime() + i * WEEK_MS),
      presets: lbsWithItems.map((lb) => lb.items[i] ?? null),
    }));

    return { leaderboards: lbsWithItems, rows };
  }

  async handleCron() {
    const leaderboards = await this.leaderboardService.getAll();
    for (const lb of leaderboards) {
      await this.generateNewSeed(lb);
    }
  }

  async generateNewSeed(leaderboard: Leaderboard) {
    await this.seedRepository
      .createQueryBuilder()
      .update(WeeklySeed)
      .set({ isActive: false })
      .where('leaderboardId = :lbId AND isActive = :active', {
        lbId: leaderboard.id,
        active: true,
      })
      .execute();

    const preset = await this.leaderboardService.popNextPreset(leaderboard);
    await this.leaderboardService.replenishQueue(leaderboard);

    const apiUrl = this.configService.get<string>('SEED_API_URL', '');
    try {
      this.logger.log(
        `Generating seed for "${leaderboard.name}" — preset: ${preset}`,
      );
      if (preset.startsWith('seed_franco_')) {
        await this.generateFrancoSeed(leaderboard, preset, apiUrl);
      } else {
        await this.generateRegularSeed(leaderboard, preset, apiUrl);
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate seed for "${leaderboard.name}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async generateRegularSeed(
    leaderboard: Leaderboard,
    preset: string,
    apiUrl: string,
  ) {
    const response = await fetch(`${apiUrl}/${preset}`);
    if (!response.ok)
      throw new Error(`API responded with status: ${response.status}`);
    const data = (await response.json()) as SeedApiResponse;
    const newSeed = this.seedRepository.create({
      seedUrl: data.seedUrl,
      preset,
      version: data.version,
      settings: JSON.stringify(data.usedSettings),
      francoOptions: null,
      isActive: true,
      leaderboard,
    });
    await this.seedRepository.save(newSeed);
    this.logger.log(
      `New seed generated for "${leaderboard.name}": ${data.seedUrl}`,
    );
    void this.discordService.notifySeedGenerated(
      leaderboard.name,
      preset,
      this.getNextSeedDate(),
    );
  }

  private async generateFrancoSeed(
    leaderboard: Leaderboard,
    preset: string,
    apiUrl: string,
  ) {
    const level = preset.replace('seed_franco_', '');
    const url = `${apiUrl}/franco?level=${level}`;
    this.logger.log(`Franco fetch: ${url}`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`API responded with status: ${response.status}`);
    const data = (await response.json()) as FrancoApiResponse;
    const francoOptions = JSON.stringify(
      data.options.map(({ label, description, settingsToApply }) => ({
        label,
        description,
        settingsToApply,
      })),
    );
    const newSeed = this.seedRepository.create({
      seedUrl: data.seed.seedUrl,
      preset,
      version: data.seed.version,
      settings: JSON.stringify(data.seed.usedSettings),
      francoOptions,
      isActive: true,
      leaderboard,
    });
    await this.seedRepository.save(newSeed);
    this.logger.log(
      `New seed generated for "${leaderboard.name}": ${data.seed.seedUrl}`,
    );
    void this.discordService.notifySeedGenerated(
      leaderboard.name,
      preset,
      this.getNextSeedDate(),
    );
  }
}
