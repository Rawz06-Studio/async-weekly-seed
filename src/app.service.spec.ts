import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WeeklySeed } from './entities/weekly-seed.entity';
import { Score } from './entities/score.entity';
import { ConfigService } from '@nestjs/config';

describe('AppService', () => {
  let service: AppService;

  const mockSeedRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockScoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: getRepositoryToken(WeeklySeed),
          useValue: mockSeedRepository,
        },
        {
          provide: getRepositoryToken(Score),
          useValue: mockScoreRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('weightedRandom', () => {
    it('should return a preset based on weights', () => {
      const weights = { a: 100, b: 0 };
      // Accessing private method for testing
      const result = (
        service as any as { weightedRandom: (w: any) => string }
      ).weightedRandom(weights);
      expect(result).toBe('a');
    });

    it('should return the first preset if weights are equal', () => {
      const weights = { a: 50, b: 50 };
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const result = (
        service as any as { weightedRandom: (w: any) => string }
      ).weightedRandom(weights);
      expect(result).toBe('a');
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const result2 = (
        service as any as { weightedRandom: (w: any) => string }
      ).weightedRandom(weights);
      expect(result2).toBe('b');
      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('addScore', () => {
    it('should add a valid score', async () => {
      const currentSeed = { id: 1 } as WeeklySeed;
      mockSeedRepository.findOne.mockResolvedValue(currentSeed);
      mockScoreRepository.create.mockReturnValue({
        id: 1,
        playerName: 'Player',
        time: '1:23:45',
      });
      mockScoreRepository.save.mockResolvedValue({
        id: 1,
        playerName: 'Player',
        time: '1:23:45',
      });

      const result = await service.addScore('Player', '1:23:45', 'GG');

      expect(result).toBeDefined();
      expect(mockScoreRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          playerName: 'Player',
          time: '1:23:45',
          seed: currentSeed,
        }),
      );
    });

    it('should handle forfeit strings', async () => {
      mockSeedRepository.findOne.mockResolvedValue({ id: 1 });
      mockScoreRepository.create.mockImplementation(
        (args: unknown) => args as Score,
      );
      mockScoreRepository.save.mockImplementation(
        (args: unknown) => args as Score,
      );

      const res1 = await service.addScore('P1', 'ff', '');
      expect(res1.time).toBe('Forfeit');

      const res2 = await service.addScore('P2', 'forfeit', '');
      expect(res2.time).toBe('Forfeit');

      const res3 = await service.addScore('P3', '', '');
      expect(res3.time).toBe('Forfeit');
    });

    it('should throw error for invalid time format', async () => {
      mockSeedRepository.findOne.mockResolvedValue({ id: 1 });
      await expect(service.addScore('P', 'invalid', '')).rejects.toThrow(
        'Invalid time format',
      );
    });

    it('should throw error if no active seed', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);
      await expect(service.addScore('P', '1:00', '')).rejects.toThrow(
        'No active seed found',
      );
    });
  });

  describe('getCurrentSeed', () => {
    it('should return the active seed', async () => {
      const seed = { id: 1, isActive: true };
      mockSeedRepository.findOne.mockResolvedValue(seed);
      const result = await service.getCurrentSeed();
      expect(result).toBe(seed);
    });
  });

  describe('generateNewSeed', () => {
    it('should generate a new seed and save it', async () => {
      const data = {
        seedUrl: 'https://newseed',
        version: '1.0',
        usedSettings: { opt: true },
      };

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(data),
      } as any);

      mockConfigService.get.mockImplementation(
        (key: string, defaultValue: string) => {
          if (key === 'PRESET_WEIGHTS') return '{"seed_s9": 100}';
          if (key === 'SEED_API_URL') return 'http://api';
          return defaultValue;
        },
      );

      mockSeedRepository.update.mockResolvedValue({});
      mockSeedRepository.create.mockReturnValue({ ...data, preset: 'seed_s9' });
      mockSeedRepository.save.mockResolvedValue({});

      await service.generateNewSeed();

      expect(mockSeedRepository.update).toHaveBeenCalledWith(
        { isActive: true },
        { isActive: false },
      );
      expect(mockSeedRepository.save).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith('http://api/seed_s9');
    });

    it('should handle API failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      mockConfigService.get.mockImplementation(
        (key: string, defaultValue: string) => {
          if (key === 'PRESET_WEIGHTS') return '{"seed_s9": 100}';
          if (key === 'SEED_API_URL') return 'http://api';
          return defaultValue;
        },
      );
      const loggerSpy = jest.spyOn(
        (service as any as { logger: any }).logger,
        'error',
      );

      await service.generateNewSeed();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('API responded with status: 500'),
      );
    });
  });

  describe('handleCron', () => {
    it('should call generateNewSeed if time matches', async () => {
      const now = new Date();
      // Ensure we use the values we'll mock
      const day = now.getDay();
      const hour = now.getHours();

      mockConfigService.get.mockImplementation((key: string, def: number) => {
        if (key === 'SEED_CHANGE_DAY') return day;
        if (key === 'SEED_CHANGE_HOUR') return hour;
        return def;
      });

      const generateSpy = jest
        .spyOn(service, 'generateNewSeed')
        .mockResolvedValue(undefined);

      await service.handleCron();
      expect(generateSpy).toHaveBeenCalled();
    });

    it('should not call generateNewSeed if time does not match', async () => {
      const now = new Date();
      const wrongHour = (now.getHours() + 1) % 24;

      mockConfigService.get.mockImplementation((key: string, def: number) => {
        if (key === 'SEED_CHANGE_DAY') return now.getDay();
        if (key === 'SEED_CHANGE_HOUR') return wrongHour;
        return def;
      });

      const generateSpy = jest
        .spyOn(service, 'generateNewSeed')
        .mockResolvedValue(undefined);

      await service.handleCron();
      expect(generateSpy).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should generate seed if none exists', async () => {
      mockSeedRepository.findOne.mockResolvedValue(null);
      const generateSpy = jest
        .spyOn(service, 'generateNewSeed')
        .mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(generateSpy).toHaveBeenCalled();
    });

    it('should not generate seed if one exists', async () => {
      mockSeedRepository.findOne.mockResolvedValue({ id: 1 });
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
      mockSeedRepository.findOne.mockResolvedValue(seed);
      const result = await service.getArchiveById(1);
      expect(result).toBe(seed);
    });
  });
});
