import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Leaderboard } from '../entities/leaderboard.entity';
import { PresetQueueItem } from '../entities/preset-queue-item.entity';
import { WeeklySeed } from '../entities/weekly-seed.entity';

const DEFAULT_PRESET_WEIGHTS =
  '{"seed_s9": 40, "seed_tot": 20, "seed_mixed": 20, "seed_rot": 20, "seed_rsl": 20}';

const PRESET_DESCRIPTIONS: Record<string, string> = {
  seed_s9:
    'Standard Season 9 — the main competitive tournament ruleset. Fixed, well-balanced settings used as the reference format for the weekly async.',
  seed_tot:
    'Tournament of Truth — the flagship tournament of the French-speaking OoTR community, with its own curated ruleset and competitive spirit.',
  seed_mixed:
    'Mixed Pools — all entrances are randomised across the board, turning every seed into an unpredictable adventure where nothing is where you expect it.',
  seed_rot:
    'Rupee of Time — an RSL tournament where rupees are in the spotlight.',
  seed_rsl:
    'Random Settings League — each seed rolls a random combination of settings, keeping every run fresh. Currently running Season 7; presets will be updated as soon as Season 8 is announced.',
  seed_franco_easy:
    'Francophone Tournament (Easy) — the French-speaking community tournament preset on easy difficulty, with randomly drawn options applied to each seed.',
  seed_franco_hard:
    'Francophone Tournament (Hard) — the French-speaking community tournament preset on hard difficulty, with randomly drawn options applied to each seed.',
};

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
    @InjectRepository(PresetQueueItem)
    private presetQueueRepository: Repository<PresetQueueItem>,
    @InjectRepository(WeeklySeed)
    private seedRepository: Repository<WeeklySeed>,
    private configService: ConfigService,
  ) {}

  async getAll(): Promise<Leaderboard[]> {
    return this.leaderboardRepository.find({ order: { id: 'ASC' } });
  }

  async ensureDefaultLeaderboard(): Promise<void> {
    const count = await this.leaderboardRepository.count();
    if (count > 0) return;

    const lb = await this.leaderboardRepository.save(
      this.leaderboardRepository.create({
        name: 'Weekly',
        presetWeights: DEFAULT_PRESET_WEIGHTS,
      }),
    );
    this.logger.log('Created default leaderboard with default preset weights');

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

  async getLeaderboardsWithRulesets() {
    const leaderboards = await this.getAll();
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

  async getQueueItems(leaderboardId: number): Promise<PresetQueueItem[]> {
    return this.presetQueueRepository.find({
      where: { leaderboard: { id: leaderboardId } },
      order: { createdAt: 'ASC' },
    });
  }

  async popNextPreset(leaderboard: Leaderboard): Promise<string> {
    const nextItem = await this.presetQueueRepository.findOne({
      where: { leaderboard: { id: leaderboard.id } },
      order: { createdAt: 'ASC' },
    });

    if (nextItem) {
      await this.presetQueueRepository.delete(nextItem.id);
      return nextItem.preset;
    }

    this.logger.warn(
      `Queue empty for "${leaderboard.name}", falling back to weighted random`,
    );
    return this.weightedRandom(
      JSON.parse(leaderboard.presetWeights) as Record<string, number>,
    );
  }

  async replenishQueue(leaderboard: Leaderboard): Promise<void> {
    await this.pushToQueue(leaderboard, 1);
  }

  async fillAllQueues(): Promise<void> {
    const leaderboards = await this.leaderboardRepository.find();
    for (const lb of leaderboards) {
      await this.fillQueue(lb);
    }
  }

  private async fillQueue(leaderboard: Leaderboard): Promise<void> {
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

  private async pushToQueue(
    leaderboard: Leaderboard,
    count: number,
  ): Promise<void> {
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

  private weightedRandom(weights: Record<string, number>): string {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (const [preset, weight] of Object.entries(weights)) {
      if (random < weight) return preset;
      random -= weight;
    }
    return Object.keys(weights)[0];
  }
}
