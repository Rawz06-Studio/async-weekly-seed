import { Test, TestingModule } from '@nestjs/testing';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import type { Response } from 'express';

describe('ScoreController', () => {
  let controller: ScoreController;

  const mockScoreService = {
    addScore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoreController],
      providers: [{ provide: ScoreService, useValue: mockScoreService }],
    }).compile();

    controller = module.get<ScoreController>(ScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('postScore', () => {
    const mockRes = { redirect: jest.fn() };
    const res = mockRes as unknown as Response;

    beforeEach(() => mockRes.redirect.mockClear());

    it('should call addScore and redirect on success', async () => {
      await controller.postScore(
        'Player',
        '1:23',
        'Comment',
        'http://vod',
        '1',
        res,
      );
      expect(mockScoreService.addScore).toHaveBeenCalledWith(
        'Player',
        '1:23',
        'Comment',
        'http://vod',
        1,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('/?lbId=1');
    });

    it('should redirect with error if playerName is missing', async () => {
      mockScoreService.addScore.mockClear();
      await controller.postScore('', '1:23', 'Comment', '', '1', res);
      expect(mockScoreService.addScore).not.toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/?error='),
      );
    });

    it('should redirect with error if addScore throws', async () => {
      mockScoreService.addScore.mockRejectedValueOnce(
        new Error('Invalid time format'),
      );
      await controller.postScore('Player', 'bad', '', '', '1', res);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('Invalid%20time%20format'),
      );
    });
  });
});
