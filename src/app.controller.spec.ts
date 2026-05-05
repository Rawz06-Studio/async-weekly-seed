import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;

  const mockAppService = {
    getCurrentSeed: jest.fn(),
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
      expect(result).toEqual({ seed });
    });
  });

  describe('postScore', () => {
    it('should call addScore if playerName is provided', async () => {
      await controller.postScore('Player', '1:23', 'Comment', 'http://vod');
      expect(mockAppService.addScore).toHaveBeenCalledWith(
        'Player',
        '1:23',
        'Comment',
        'http://vod',
      );
    });

    it('should not call addScore if playerName is missing', async () => {
      mockAppService.addScore.mockClear();
      await controller.postScore('', '1:23', 'Comment', '');
      expect(mockAppService.addScore).not.toHaveBeenCalled();
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
      expect(result).toEqual({ seed });
    });
  });

  describe('forceGenerateSeed', () => {
    it('should call generateNewSeed', async () => {
      await controller.forceGenerateSeed();
      expect(mockAppService.generateNewSeed).toHaveBeenCalled();
    });
  });
});
