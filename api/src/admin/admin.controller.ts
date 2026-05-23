import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ScoreService } from '../score/score.service';
import { SeedService } from '../seed/seed.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly leaderboardService: LeaderboardService,
    private readonly scoreService: ScoreService,
    private readonly seedService: SeedService,
  ) {}

  // ── Auth ────────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body('password') password: string) {
    if (!(await this.adminService.validatePassword(password))) {
      throw new UnauthorizedException('Invalid password');
    }
    return { token: this.adminService.createSession() };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  logout() {
    this.adminService.invalidateSession();
    return { success: true };
  }

  // ── Leaderboards ────────────────────────────────────────────────────────────

  @Get('leaderboards')
  @UseGuards(AdminGuard)
  async getLeaderboards() {
    const lbs = await this.leaderboardService.getAll();
    return Promise.all(
      lbs.map(async (lb) => ({
        ...lb,
        queue: await this.leaderboardService.getQueueItems(lb.id),
      })),
    );
  }

  @Post('leaderboards')
  @UseGuards(AdminGuard)
  async createLeaderboard(
    @Body('name') name: string,
    @Body('presetWeights') presetWeights?: string,
  ) {
    return this.leaderboardService.createLeaderboard(name, presetWeights);
  }

  @Patch('leaderboards/:id')
  @UseGuards(AdminGuard)
  async updateLeaderboard(
    @Param('id') id: string,
    @Body() data: { name?: string; enabled?: boolean; presetWeights?: string },
  ) {
    return this.leaderboardService.updateLeaderboard(Number(id), data);
  }

  @Delete('leaderboards/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async deleteLeaderboard(@Param('id') id: string) {
    await this.leaderboardService.deleteLeaderboard(Number(id));
    return { success: true };
  }

  @Post('leaderboards/:id/generate-seed')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async generateSeed(@Param('id') id: string) {
    const lb = await this.leaderboardService.findById(Number(id));
    if (!lb) throw new NotFoundException('Leaderboard not found');
    await this.seedService.generateNewSeed(lb);
    return { success: true };
  }

  @Post('leaderboards/:id/queue/regenerate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async regenerateQueue(@Param('id') id: string) {
    await this.leaderboardService.regenerateQueue(Number(id));
    return { success: true };
  }

  // ── Queue items ─────────────────────────────────────────────────────────────

  @Delete('queue-items/:itemId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async deleteQueueItem(@Param('itemId') itemId: string) {
    await this.leaderboardService.deleteQueueItem(Number(itemId));
    return { success: true };
  }

  // ── Scores ──────────────────────────────────────────────────────────────────

  @Get('scores')
  @UseGuards(AdminGuard)
  async getScores() {
    return this.scoreService.getAllScoresAdmin();
  }

  @Patch('scores/:id')
  @UseGuards(AdminGuard)
  async updateScore(
    @Param('id') id: string,
    @Body() data: { time?: number | null; comment?: string | null; vodUrl?: string | null },
  ) {
    return this.scoreService.updateScore(Number(id), data);
  }

  @Delete('scores/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminGuard)
  async deleteScore(@Param('id') id: string) {
    await this.scoreService.deleteScore(Number(id));
    return { success: true };
  }
}
