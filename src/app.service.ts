import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklySeed } from './entities/weekly-seed.entity';
import { Score } from './entities/score.entity';
import { PresetQueueItem } from './entities/preset-queue-item.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { timeStringToSeconds } from './utils/time';

interface SeedApiResponse {
  seedUrl: string;
  version: string;
  usedSettings: any;
}

const DEFAULT_PRESET_WEIGHTS =
  '{"seed_s9": 40, "seed_tot": 20, "seed_mixed": 20, "seed_rsl": 20}';

const PRESET_DESCRIPTIONS: Record<string, string> = {
  seed_s9:
    'Standard Season 9 — the main competitive tournament ruleset. Fixed, well-balanced settings used as the reference format for the weekly async.',
  seed_tot:
    'Tournament of Truth — the flagship tournament of the French-speaking OoTR community, with its own curated ruleset and competitive spirit.',
  seed_mixed:
    'Mixed Pools — all entrances are randomised across the board, turning every seed into an unpredictable adventure where nothing is where you expect it.',
  seed_rsl:
    'Random Settings League — each seed rolls a random combination of settings, keeping every run fresh. Currently running Season 7; presets will be updated as soon as Season 8 is announced.',
};

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
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
    private configService: ConfigService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultLeaderboard();
    await this.fillAllQueues();

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

    const leaderboards = await this.leaderboardRepository.find();
    for (const lb of leaderboards) {
      const current = await this.getCurrentSeedForLeaderboard(lb.id);
      if (!current) {
        this.logger.log(`No active seed for "${lb.name}", generating...`);
        await this.generateNewSeed(lb);
      }
    }
  }

  private async ensureDefaultLeaderboard() {
    const count = await this.leaderboardRepository.count();
    if (count > 0) return;

    const lb = await this.leaderboardRepository.save(
      this.leaderboardRepository.create({
        name: 'Weekly',
        presetWeights: DEFAULT_PRESET_WEIGHTS,
      }),
    );
    this.logger.log('Created default leaderboard with default preset weights');

    // Migrate existing seeds and queue items that have no leaderboard yet
    const orphanSeeds = await this.seedRepository
      .createQueryBuilder('seed')
      .where('seed.leaderboardId IS NULL')
      .getMany();
    for (const seed of orphanSeeds) {
      await this.seedRepository.save({ ...seed, leaderboard: lb });
    }

    const orphanQueue = await this.presetQueueRepository
      .createQueryBuilder('item')
      .where('item.leaderboardId IS NULL')
      .getMany();
    for (const item of orphanQueue) {
      await this.presetQueueRepository.save({ ...item, leaderboard: lb });
    }

    if (orphanSeeds.length + orphanQueue.length > 0) {
      this.logger.log(
        `Migrated ${orphanSeeds.length} seed(s) and ${orphanQueue.length} queue item(s) to default leaderboard`,
      );
    }
  }

  async getCurrentSeedForLeaderboard(leaderboardId: number) {
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
    const leaderboards = await this.leaderboardRepository.find({
      order: { id: 'ASC' },
    });
    return Promise.all(
      leaderboards.map(async (lb) => ({
        ...lb,
        seed: await this.getCurrentSeedForLeaderboard(lb.id),
      })),
    );
  }

  async getArchives() {
    return this.seedRepository.find({
      where: { isActive: false },
      order: { createdAt: 'DESC' },
      relations: ['scores'],
    });
  }

  async getArchiveById(id: number) {
    return this.seedRepository
      .createQueryBuilder('seed')
      .leftJoinAndSelect('seed.scores', 'score')
      .where('seed.id = :id', { id })
      .addOrderBy('score.time', 'ASC', 'NULLS LAST')
      .getOne();
  }

  async handleCron() {
    const leaderboards = await this.leaderboardRepository.find();
    for (const lb of leaderboards) {
      await this.generateNewSeed(lb);
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

  async generateNewSeed(leaderboard: Leaderboard) {
    // 1. Deactivate current seed for this leaderboard only
    await this.seedRepository
      .createQueryBuilder()
      .update(WeeklySeed)
      .set({ isActive: false })
      .where('leaderboardId = :lbId AND isActive = :active', {
        lbId: leaderboard.id,
        active: true,
      })
      .execute();

    // 2. Pop next preset from this leaderboard's queue
    const nextItem = await this.presetQueueRepository.findOne({
      where: { leaderboard: { id: leaderboard.id } },
      order: { createdAt: 'ASC' },
    });

    let preset: string;
    if (nextItem) {
      preset = nextItem.preset;
      await this.presetQueueRepository.delete(nextItem.id);
    } else {
      this.logger.warn(
        `Queue empty for "${leaderboard.name}", falling back to weighted random`,
      );
      preset = this.weightedRandom(
        JSON.parse(leaderboard.presetWeights) as Record<string, number>,
      );
    }

    // 3. Replenish queue by one to maintain target size
    await this.pushToQueue(leaderboard, 1);

    // 4. Call API and save
    const apiUrl = this.configService.get<string>('SEED_API_URL');
    try {
      this.logger.log(
        `Generating seed for "${leaderboard.name}" — preset: ${preset}`,
      );
      const response = await fetch(`${apiUrl}/${preset}`);
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      const data = (await response.json()) as SeedApiResponse;
      const newSeed = this.seedRepository.create({
        seedUrl: data.seedUrl,
        preset,
        version: data.version,
        settings: JSON.stringify(data.usedSettings),
        isActive: true,
        leaderboard,
      });
      await this.seedRepository.save(newSeed);
      this.logger.log(
        `New seed generated for "${leaderboard.name}": ${data.seedUrl}`,
      );
      void this.sendDiscordNotifications(leaderboard.name, preset);
    } catch (error) {
      this.logger.error(
        `Failed to generate seed for "${leaderboard.name}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendDiscordNotifications(
    leaderboardName: string,
    preset: string,
  ): Promise<void> {
    const raw = this.configService.get<string>('DISCORD_WEBHOOKS', '');
    const webhooks = raw
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    if (webhooks.length === 0) return;

    const presetName = preset.replace('seed_', '').toUpperCase();
    const nextDate = this.getNextSeedDate();
    const appUrl = this.configService.get<string>('APP_URL', '');

    const presetColors: Record<string, number> = {
      seed_s9: 0xd97706,
      seed_tot: 0x7c3aed,
      seed_mixed: 0x059669,
      seed_rsl: 0xdc2626,
    };
    const color = presetColors[preset] ?? 0xd97706;

    const now = new Date();
    const nowTs = Math.floor(now.getTime() / 1000);

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Preset', value: presetName, inline: true },
      { name: 'Available from', value: `<t:${nowTs}:F>`, inline: true },
      ...(nextDate
        ? [
            {
              name: 'Until',
              value: `<t:${Math.floor(nextDate.getTime() / 1000)}:F>`,
              inline: true as const,
            },
          ]
        : []),
    ];
    if (appUrl) {
      fields.push({
        name: 'Website',
        value: `[Go to ${leaderboardName}](${appUrl})`,
        inline: true,
      });
    }

    const payload = {
      embeds: [
        {
          title: `🗡️ New seed available — ${leaderboardName}`,
          description: `This week's **${presetName}** seed is live! Jump in and race it before the next rotation.`,
          color,
          ...(appUrl ? { url: appUrl } : {}),
          fields,
          footer: { text: 'OoTR Async Weekly' },
          timestamp: now.toISOString(),
        },
      ],
    };

    await Promise.all(
      webhooks.map(async (url) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            this.logger.warn(
              `Discord webhook responded with status ${res.status} for "${leaderboardName}"`,
            );
          }
        } catch (err) {
          this.logger.warn(
            `Failed to send Discord notification for "${leaderboardName}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }

  async getUpcomingPresets() {
    const leaderboards = await this.leaderboardRepository.find({
      order: { id: 'ASC' },
    });
    const nextDate = this.getNextSeedDate();
    if (!nextDate || leaderboards.length === 0)
      return { leaderboards: [], rows: [] };

    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    const lbsWithItems = await Promise.all(
      leaderboards.map(async (lb) => {
        const items = await this.presetQueueRepository.find({
          where: { leaderboard: { id: lb.id } },
          order: { createdAt: 'ASC' },
        });
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

  private async fillAllQueues() {
    const leaderboards = await this.leaderboardRepository.find();
    for (const lb of leaderboards) {
      await this.fillQueue(lb);
    }
  }

  private async fillQueue(leaderboard: Leaderboard) {
    const targetSize = this.configService.get<number>('PRESET_QUEUE_SIZE', 5);
    const currentCount = await this.presetQueueRepository.count({
      where: { leaderboard: { id: leaderboard.id } },
    });
    const toAdd = targetSize - currentCount;
    if (toAdd > 0) {
      this.logger.log(
        `Filling queue for "${leaderboard.name}": adding ${toAdd} item(s) (target: ${targetSize})`,
      );
      await this.pushToQueue(leaderboard, toAdd);
    }
  }

  private async pushToQueue(leaderboard: Leaderboard, count: number) {
    const weights = JSON.parse(leaderboard.presetWeights) as Record<
      string,
      number
    >;
    for (let i = 0; i < count; i++) {
      await this.presetQueueRepository.save(
        this.presetQueueRepository.create({
          preset: this.weightedRandom(weights),
          leaderboard,
        }),
      );
    }
  }

  async getLeaderboardsWithRulesets() {
    const leaderboards = await this.leaderboardRepository.find({
      order: { id: 'ASC' },
    });
    return leaderboards.map((lb) => {
      const weights = JSON.parse(lb.presetWeights) as Record<string, number>;
      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      const rulesets = Object.entries(weights).map(([key, weight]) => ({
        key,
        name: key.replace('seed_', '').toUpperCase(),
        weight,
        probability: Math.round((weight / totalWeight) * 100),
        description: PRESET_DESCRIPTIONS[key] ?? 'No description available.',
      }));
      return { id: lb.id, name: lb.name, rulesets };
    });
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
    leaderboardId?: number,
  ) {
    const currentSeed = leaderboardId
      ? await this.getCurrentSeedForLeaderboard(leaderboardId)
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
}
