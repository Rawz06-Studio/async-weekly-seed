import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeaderboardService } from './leaderboard.service';
import { Leaderboard } from '../entities/leaderboard.entity';
import { PresetQueueItem } from '../entities/preset-queue-item.entity';
import { WeeklySeed } from '../entities/weekly-seed.entity';
import { ConfigService } from '@nestjs/config';

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  const mockLeaderboard: Leaderboard = {
    id: 1,
    name: 'Weekly',
    presetWeights: '{"seed_s9": 100}',
    seeds: [],
    queue: [],
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockLeaderboardRepository = {
    count: jest.fn().mockResolvedValue(1),
    find: jest.fn().mockResolvedValue([mockLeaderboard]),
    create: jest.fn().mockImplementation((args: unknown) => args),
    save: jest.fn().mockResolvedValue(mockLeaderboard),
  };

  const mockPresetQueueRepository = {
    count: jest.fn().mockResolvedValue(5),
    findOne: jest.fn().mockResolvedValue({
      id: 1,
      preset: 'seed_s9',
      leaderboard: mockLeaderboard,
    }),
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((args: unknown) => args),
    save: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockSeedRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    save: jest.fn().mockResolvedValue({}),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultVal: unknown) => {
      if (key === 'PRESET_QUEUE_SIZE') return 5;
      return defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        {
          provide: getRepositoryToken(Leaderboard),
          useValue: mockLeaderboardRepository,
        },
        {
          provide: getRepositoryToken(PresetQueueItem),
          useValue: mockPresetQueueRepository,
        },
        {
          provide: getRepositoryToken(WeeklySeed),
          useValue: mockSeedRepository,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('weightedRandom (via popNextPreset fallback)', () => {
    it('should fall back to weighted random when queue is empty', async () => {
      mockPresetQueueRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.popNextPreset(mockLeaderboard);
      expect(result).toBe('seed_s9');
    });
  });

  describe('popNextPreset', () => {
    it('should pop the first item from the queue', async () => {
      const result = await service.popNextPreset(mockLeaderboard);
      expect(result).toBe('seed_s9');
      expect(mockPresetQueueRepository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('getLeaderboardsWithRulesets', () => {
    it('should return rulesets for each leaderboard', async () => {
      const result = await service.getLeaderboardsWithRulesets();
      expect(result).toHaveLength(1);
      expect(result[0].rulesets[0].key).toBe('seed_s9');
      expect(result[0].rulesets[0].probability).toBe(100);
    });
  });
});
