import { Test, TestingModule } from '@nestjs/testing';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';

describe('SeedController', () => {
  let controller: SeedController;

  const mockLeaderboard = {
    id: 1,
    name: 'Weekly',
    presetWeights: '{"seed_s9": 100}',
    seed: { id: 1, preset: 'seed_s9', scores: [] },
  };

  const mockSeedService = {
    getLeaderboardsWithActiveSeeds: jest
      .fn()
      .mockResolvedValue([mockLeaderboard]),
    getNextSeedDate: jest
      .fn()
      .mockReturnValue(new Date('2026-05-20T16:00:00.000Z')),
    getArchives: jest.fn(),
    getArchiveById: jest.fn(),
    handleCron: jest.fn(),
    getUpcomingPresets: jest
      .fn()
      .mockResolvedValue({ leaderboards: [], rows: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedController],
      providers: [{ provide: SeedService, useValue: mockSeedService }],
    }).compile();

    controller = module.get<SeedController>(SeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHome', () => {
    it('should return leaderboards with active seeds', async () => {
      const result = await controller.getHome();
      expect(result).toMatchObject({ leaderboards: [mockLeaderboard] });
    });
  });

  describe('getArchives', () => {
    it('should return archives', async () => {
      const archives = [{ id: 1 }];
      mockSeedService.getArchives.mockResolvedValue(archives);
      const result = await controller.getArchives();
      expect(result).toEqual({ archives });
    });
  });

  describe('getArchive', () => {
    it('should return seed by id', async () => {
      const seed = { id: 123 };
      mockSeedService.getArchiveById.mockResolvedValue(seed);
      const result = await controller.getArchive(123);
      expect(result).toMatchObject({ seed });
    });
  });

  describe('forceGenerateSeed', () => {
    it('should call handleCron', async () => {
      await controller.forceGenerateSeed();
      expect(mockSeedService.handleCron).toHaveBeenCalled();
    });
  });
});
