import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import type { Response } from 'express';

describe('AppController', () => {
  let controller: AppController;

  const mockAppService = {
    getCurrentSeed: jest.fn(),
    getNextSeedDate: jest
      .fn()
      .mockReturnValue(new Date('2026-05-13T18:00:00.000Z')),
    addScore: jest.fn(),
    getArchives: jest.fn(),
    getArchiveById: jest.fn(),
    generateNewSeed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHome', () => {
    it('should return current seed', async () => {
      const seed = { id: 1 };
      mockAppService.getCurrentSeed.mockResolvedValue(seed);
      const result = await controller.getHome();
      expect(result).toMatchObject({ seed });
    });
  });

  describe('postScore', () => {
    const mockRes = { redirect: jest.fn() };
    const res = mockRes as unknown as Response;

    beforeEach(() => mockRes.redirect.mockClear());

    it('should call addScore if playerName is provided', async () => {
      await controller.postScore(
        'Player',
        '1:23',
        'Comment',
        'http://vod',
        res,
      );
      expect(mockAppService.addScore).toHaveBeenCalledWith(
        'Player',
        '1:23',
        'Comment',
        'http://vod',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('/');
    });

    it('should redirect with error if playerName is missing', async () => {
      mockAppService.addScore.mockClear();
      await controller.postScore('', '1:23', 'Comment', '', res);
      expect(mockAppService.addScore).not.toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/?error='),
      );
    });

    it('should redirect with error if addScore throws', async () => {
      mockAppService.addScore.mockRejectedValueOnce(
        new Error('Invalid time format'),
      );
      await controller.postScore('Player', 'bad', '', '', res);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('Invalid%20time%20format'),
      );
    });
  });

  describe('getArchives', () => {
    it('should return archives', async () => {
      const archives = [{ id: 1 }];
      mockAppService.getArchives.mockResolvedValue(archives);
      const result = await controller.getArchives();
      expect(result).toEqual({ archives });
    });
  });

  describe('getArchive', () => {
    it('should return seed by id', async () => {
      const seed = { id: 123 };
      mockAppService.getArchiveById.mockResolvedValue(seed);
      const result = await controller.getArchive(123);
      expect(result).toMatchObject({ seed });
    });
  });

  describe('forceGenerateSeed', () => {
    it('should call generateNewSeed', async () => {
      await controller.forceGenerateSeed();
      expect(mockAppService.generateNewSeed).toHaveBeenCalled();
    });
  });
});
