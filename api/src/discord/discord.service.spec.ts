import { Test, TestingModule } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import { ConfigService } from '@nestjs/config';

describe('DiscordService', () => {
  let service: DiscordService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultVal: unknown) => {
      if (key === 'DISCORD_WEBHOOKS') return '';
      if (key === 'APP_URL') return '';
      return defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifySeedGenerated', () => {
    it('should send to each webhook', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal: unknown) => {
          if (key === 'DISCORD_WEBHOOKS')
            return 'https://discord.example/wh1,https://discord.example/wh2';
          if (key === 'APP_URL') return '';
          return defaultVal;
        },
      );

      const fetchMock = jest.fn().mockResolvedValue({ ok: true } as any);
      global.fetch = fetchMock;

      await service.notifySeedGenerated('Weekly', 'seed_s9', null);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.example/wh1',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://discord.example/wh2',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should do nothing when DISCORD_WEBHOOKS is empty', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal: unknown) => {
          if (key === 'DISCORD_WEBHOOKS') return '';
          return defaultVal;
        },
      );

      const fetchMock = jest.fn();
      global.fetch = fetchMock;

      await service.notifySeedGenerated('Weekly', 'seed_s9', null);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should include Until field when nextDate is provided', async () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultVal: unknown) => {
          if (key === 'DISCORD_WEBHOOKS') return 'https://discord.example/wh1';
          if (key === 'APP_URL') return '';
          return defaultVal;
        },
      );

      type Payload = { embeds: [{ fields: { name: string }[] }] };
      let capturedBody: Payload | null = null;
      global.fetch = jest.fn().mockImplementation((_url, opts: RequestInit) => {
        capturedBody = JSON.parse(opts.body as string) as Payload;
        return Promise.resolve({ ok: true });
      });

      const nextDate = new Date('2026-05-27T18:00:00Z');
      await service.notifySeedGenerated('Weekly', 'seed_s9', nextDate);

      const fields = capturedBody!.embeds[0].fields;
      expect(fields.some((f) => f.name === 'Until')).toBe(true);
    });
  });
});
