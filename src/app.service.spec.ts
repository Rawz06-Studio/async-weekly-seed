import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WeeklySeed } from './entities/weekly-seed.entity';
import { Score } from './entities/score.entity';
import { PresetQueueItem } from './entities/preset-queue-item.entity';
import { Leaderboard } from './entities/leaderboard.entity';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    nextDate: jest.fn(),
  })),
}));

describe('AppService', () => {
  let service: AppService;

  const mockLeaderboard: Leaderboard = {
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
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
  };

  const mockSeedRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockScoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
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

  const mockLeaderboardRepository = {
    count: jest.fn().mockResolvedValue(1),
    find: jest.fn().mockResolvedValue([mockLeaderboard]),
    findOne: jest.fn().mockResolvedValue(mockLeaderboard),
    create: jest.fn().mockImplementation((args: unknown) => args),
    save: jest.fn().mockResolvedValue(mockLeaderboard),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultVal: unknown) => {
      if (key === 'SEED_CHANGE_DAY') return 3;
      if (key === 'SEED_CHANGE_HOUR') return 20;
      if (key === 'PRESET_QUEUE_SIZE') return 5;
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
        AppService,
        {
          provide: getRepositoryToken(WeeklySeed),
          useValue: mockSeedRepository,
        },
        { provide: getRepositoryToken(Score), useValue: mockScoreRepository },
        {
          provide: getRepositoryToken(PresetQueueItem),
          useValue: mockPresetQueueRepository,
        },
        {
          provide: getRepositoryToken(Leaderboard),
          useValue: mockLeaderboardRepository,
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('weightedRandom', () => {
    type WithPrivates = {
      weightedRandom: (w: Record<string, number>) => string;
    };

    it('should return a preset based on weights', () => {
      const weights = { a: 100, b: 0 };
      const result = (service as unknown as WithPrivates).weightedRandom(
        weights,
      );
      expect(result).toBe('a');
    });

    it('should return the first preset if weights are equal', () => {
      const weights = { a: 50, b: 50 };
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = (service as unknown as WithPrivates).weightedRandom(
        weights,
      );
      expect(result).toBe('a');
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const result2 = (service as unknown as WithPrivates).weightedRandom(
        weights,
      );
      expect(result2).toBe('b');
      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('addScore', () => {
    it('should add a valid score', async () => {
      const currentSeed = { id: 1 } as WeeklySeed;
      mockQueryBuilder.getOne.mockResolvedValue(currentSeed);
      mockScoreRepository.create.mockReturnValue({
        id: 1,
        playerName: 'Player',
        time: 5025,
      });
      mockScoreRepository.save.mockResolvedValue({
        id: 1,
        playerName: 'Player',
        time: 5025,
      });

      const result = await service.addScore(
        'Player',
        '1:23:45',
        'GG',
        undefined,
        1,
      );

      expect(result).toBeDefined();
      expect(mockScoreRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          playerName: 'Player',
          time: 5025,
          seed: currentSeed,
        }),
      );
    });

    it('should handle forfeit strings', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 1 });
      mockScoreRepository.create.mockImplementation(
        (args: unknown) => args as Score,
      );
      mockScoreRepository.save.mockImplementation(
        (args: unknown) => args as Score,
      );

      const res1 = await service.addScore('P1', 'ff', '', undefined, 1);
      expect(res1.time).toBeNull();

      const res2 = await service.addScore('P2', 'forfeit', '', undefined, 1);
      expect(res2.time).toBeNull();

      const res3 = await service.addScore('P3', '', '', undefined, 1);
      expect(res3.time).toBeNull();
    });

    it('should throw error for invalid time format', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 1 });
      await expect(
        service.addScore('P', 'invalid', '', undefined, 1),
      ).rejects.toThrow('Invalid time format');
    });

    it('should throw error if no active seed', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      await expect(
        service.addScore('P', '1:00', '', undefined, 1),
      ).rejects.toThrow('No active seed found');
    });

    it('should throw error if leaderboardId is missing', async () => {
      await expect(service.addScore('P', '1:00', '')).rejects.toThrow(
        'No active seed found',
      );
    });
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
        (key: string, defaultValue: unknown) => {
          if (key === 'SEED_API_URL') return 'http://api';
          if (key === 'PRESET_QUEUE_SIZE') return 5;
          return defaultValue;
        },
      );

      mockSeedRepository.create.mockReturnValue({ ...data, preset: 'seed_s9' });
      mockSeedRepository.save.mockResolvedValue({});

      await service.generateNewSeed(mockLeaderboard);

      expect(mockSeedRepository.save).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('http://api/seed_s9');
    });

    it('should handle API failure', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue({ ok: false, status: 500 } as any);

      mockConfigService.get.mockImplementation(
        (key: string, defaultValue: unknown) => {
          if (key === 'SEED_API_URL') return 'http://api';
          return defaultValue;
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
