import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PRESET_COLORS: Record<string, number> = {
  seed_s9: 0xd97706,
  seed_tot: 0x7c3aed,
  seed_mixed: 0x059669,
  seed_rsl: 0xdc2626,
  seed_franco_easy: 0x22c55e,
  seed_franco_hard: 0xef4444,
};

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(private configService: ConfigService) {}

  async notifySeedGenerated(
    leaderboardName: string,
    preset: string,
    nextDate: Date | null,
  ): Promise<void> {
    const raw = this.configService.get<string>('DISCORD_WEBHOOKS', '');
    const webhooks = raw
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean);

    if (webhooks.length === 0) return;

    const presetName = preset.replace('seed_', '').toUpperCase();
    const appUrl = this.configService.get<string>('APP_URL', '');
    const color = PRESET_COLORS[preset] ?? 0xd97706;

    const now = new Date();
    const nowTs = Math.floor(now.getTime() / 1000);

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Preset', value: presetName, inline: true },
      { name: 'Available from', value: `<t:${nowTs}:F>`, inline: true },
      ...(nextDate
        ? [
            {
              name: 'Until',
              value: `<t:${Math.floor(nextDate.getTime() / 1000)}:F>`,
              inline: true as const,
            },
          ]
        : []),
    ];

    if (appUrl) {
      fields.push({
        name: 'Website',
        value: `[Go to ${leaderboardName}](${appUrl})`,
        inline: true,
      });
    }

    const payload = {
      embeds: [
        {
          title: `🗡️ New seed available — ${leaderboardName}`,
          description: `This week's **${presetName}** seed is live! Jump in and race it before the next rotation.`,
          color,
          ...(appUrl ? { url: appUrl } : {}),
          fields,
          footer: { text: 'OoTR Async Weekly' },
          timestamp: now.toISOString(),
        },
      ],
    };

    await Promise.all(
      webhooks.map(async (url) => {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            this.logger.warn(
              `Discord webhook responded with status ${res.status} for "${leaderboardName}"`,
            );
          }
        } catch (err) {
          this.logger.warn(
            `Failed to send Discord notification for "${leaderboardName}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }
}
