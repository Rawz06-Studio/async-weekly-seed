import {
  Controller,
  Get,
  Render,
  Redirect,
  Param,
  Query,
  Post,
} from '@nestjs/common';
import { SeedService } from './seed.service';
import { secondsToTimeString } from '../utils/time';

@Controller()
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  @Render('index')
  async getHome(@Query('error') error?: string, @Query('lbId') lbId?: string) {
    const leaderboards =
      await this.seedService.getLeaderboardsWithActiveSeeds();
    const nextSeedDate = this.seedService.getNextSeedDate();
    return {
      leaderboards,
      nextSeedDate,
      formatTime: secondsToTimeString,
      error,
      activeLbId: lbId ? parseInt(lbId, 10) : null,
    };
  }

  @Get('archives')
  @Render('archives')
  async getArchives() {
    const archives = await this.seedService.getArchives();
    return { archives };
  }

  @Get('archive/:id')
  @Render('archive-detail')
  async getArchive(@Param('id') id: number) {
    const seed = await this.seedService.getArchiveById(id);
    return { seed, formatTime: secondsToTimeString };
  }

  @Get('upcoming')
  @Render('upcoming')
  async getUpcoming() {
    return this.seedService.getUpcomingPresets();
  }

  @Post('admin/generate-seed')
  @Redirect('/')
  async forceGenerateSeed() {
    await this.seedService.handleCron();
  }
}
