import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { WeeklySeed } from '../entities/weekly-seed.entity';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { DiscordService } from '../discord/discord.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    nextDate: jest.fn(),
  })),
}));

describe('SeedService', () => {
  let service: SeedService;

  const mockLeaderboard = {
    id: 1,
    name: 'Weekly',
    presetWeights: '{"seed_s9": 100}',
    seeds: [],
    queue: [],
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
    getOne: jest.fn(),
  };

  const mockSeedRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockLeaderboardService = {
    ensureDefaultLeaderboard: jest.fn().mockResolvedValue(undefined),
    fillAllQueues: jest.fn().mockResolvedValue(undefined),
    getAll: jest.fn().mockResolvedValue([mockLeaderboard]),
    popNextPreset: jest.fn().mockResolvedValue('seed_s9'),
    replenishQueue: jest.fn().mockResolvedValue(undefined),
    getQueueItems: jest.fn().mockResolvedValue([]),
  };

  const mockDiscordService = {
    notifySeedGenerated: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultVal: unknown) => {
      if (key === 'SEED_CHANGE_DAY') return 3;
      if (key === 'SEED_CHANGE_HOUR') return 20;
      return defaultVal;
    }),
  };

  const mockSchedulerRegistry = {
    addCronJob: jest.fn(),
    getCronJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getRepositoryToken(WeeklySeed),
          useValue: mockSeedRepository,
        },
        { provide: LeaderboardService, useValue: mockLeaderboardService },
        { provide: DiscordService, useValue: mockDiscordService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateNewSeed', () => {
    it('should generate a new seed and save it', async () => {
      const data = {
        seedUrl: 'https://newseed',
        version: '1.0',
        usedSettings: { opt: true },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(data),
      } as any);

      mockConfigService.get.mockImplementation(
        (key: string, defaultVal: unknown) => {
          if (key === 'SEED_API_URL') return 'http://api';
          return defaultVal;
        },
      );

      mockSeedRepository.create.mockReturnValue({ ...data, preset: 'seed_s9' });
      mockSeedRepository.save.mockResolvedValue({});

      await service.generateNewSeed(mockLeaderboard);

      expect(mockSeedRepository.save).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('http://api/seed_s9');
    });

    it('should call Discord notification on success', async () => {
      const data = {
        seedUrl: 'https://newseed',
        version: '1.0',
        usedSettings: {},
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(data),
      } as any);

      mockConfigService.get.mockImplementation(
        (key: string, defaultVal: unknown) => {
          if (key === 'SEED_API_URL') return 'http://api';
          return defaultVal;
        },
      );

      mockSeedRepository.create.mockReturnValue({ ...data, preset: 'seed_s9' });
      mockSeedRepository.save.mockResolvedValue({});
      mockDiscordService.notifySeedGenerated.mockClear();

      await service.generateNewSeed(mockLeaderboard);
      await new Promise((r) => setTimeout(r, 0));

      expect(mockDiscordService.notifySeedGenerated).toHaveBeenCalledWith(
        'Weekly',
        'seed_s9',
        null,
      );
    });

    it('should handle API failure', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500 } as any);

      mockConfigService.get.mockImplementation(
        (key: string, defaultVal: unknown) => {
          if (key === 'SEED_API_URL') return 'http://api';
          return defaultVal;
        },
      );

      type WithLogger = { logger: { error: (...args: unknown[]) => void } };
      const loggerSpy = jest.spyOn(
        (service as unknown as WithLogger).logger,
        'error',
      );

      await service.generateNewSeed(mockLeaderboard);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('API responded with status: 500'),
      );
    });
  });

  describe('handleCron', () => {
    it('should call generateNewSeed for each leaderboard', async () => {
      const generateSpy = jest
        .spyOn(service, 'generateNewSeed')
        .mockResolvedValue(undefined);

      await service.handleCron();

      expect(generateSpy).toHaveBeenCalledWith(mockLeaderboard);
    });
  });

  describe('getCurrentSeedForLeaderboard', () => {
    it('should return the active seed for the given leaderboard', async () => {
      const seed = { id: 1, isActive: true };
      mockQueryBuilder.getOne.mockResolvedValue(seed);
      const result = await service.getCurrentSeedForLeaderboard(1);
      expect(result).toBe(seed);
    });
  });

  describe('onModuleInit', () => {
    it('should generate seed if none exists for a leaderboard', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const generateSpy = jest
        .spyOn(service, 'generateNewSeed')
        .mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(generateSpy).toHaveBeenCalledWith(mockLeaderboard);
    });

    it('should not generate seed if one already exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 1 });
      const generateSpy = jest
        .spyOn(service, 'generateNewSeed')
        .mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(generateSpy).not.toHaveBeenCalled();
    });
  });

  describe('getArchiveById', () => {
    it('should return seed by id', async () => {
      const seed = { id: 1 };
      mockQueryBuilder.getOne.mockResolvedValue(seed);
      const result = await service.getArchiveById(1);
      expect(result).toBe(seed);
    });
  });
});
