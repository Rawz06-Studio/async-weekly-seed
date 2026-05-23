import { Controller, Get, Param, Post, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller()
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('leaderboards/active')
  async getHome() {
    const leaderboards = await this.seedService.getLeaderboardsWithActiveSeeds();
    const nextSeedDate = this.seedService.getNextSeedDate();
    return { leaderboards, nextSeedDate };
  }

  @Get('archives')
  async getArchives() {
    return this.seedService.getArchives();
  }

  @Get('archives/:id')
  async getArchive(@Param('id') id: number) {
    const seed = await this.seedService.getArchiveById(id);
    if (!seed) throw new NotFoundException('Archive not found');
    return seed;
  }

  @Get('upcoming')
  async getUpcoming() {
    return this.seedService.getUpcomingPresets();
  }

  @Post('admin/generate-seed')
  @HttpCode(HttpStatus.OK)
  async forceGenerateSeed() {
    await this.seedService.handleCron();
    return { success: true };
  }
}
