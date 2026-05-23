import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScoreService } from './score.service';
import { Score } from '../entities/score.entity';
import { SeedService } from '../seed/seed.service';
import { WeeklySeed } from '../entities/weekly-seed.entity';

describe('ScoreService', () => {
  let service: ScoreService;

  const mockScoreRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSeedService = {
    getCurrentSeedForLeaderboard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreService,
        { provide: getRepositoryToken(Score), useValue: mockScoreRepository },
        { provide: SeedService, useValue: mockSeedService },
      ],
    }).compile();

    service = module.get<ScoreService>(ScoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addScore', () => {
    it('should add a valid score', async () => {
      const currentSeed = { id: 1 } as WeeklySeed;
      mockSeedService.getCurrentSeedForLeaderboard.mockResolvedValue(
        currentSeed,
      );
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
      mockSeedService.getCurrentSeedForLeaderboard.mockResolvedValue({
        id: 1,
      });
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
      mockSeedService.getCurrentSeedForLeaderboard.mockResolvedValue({
        id: 1,
      });
      await expect(
        service.addScore('P', 'invalid', '', undefined, 1),
      ).rejects.toThrow('Invalid time format');
    });

    it('should throw error if no active seed', async () => {
      mockSeedService.getCurrentSeedForLeaderboard.mockResolvedValue(null);
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
});
