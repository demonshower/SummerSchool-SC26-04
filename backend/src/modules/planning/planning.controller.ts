import {
  Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { CreatePlanDto } from './dto/planning.dto';
import { CurrentUser } from '../../common';

@ApiTags('自动规划')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('trips/:tripId/planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post('plan')
  @ApiOperation({ summary: '触发自动规划' })
  async createPlan(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: CreatePlanDto,
  ) {
    return this.planningService.createPlan(userId, tripId, dto);
  }

  @Get('status')
  @ApiOperation({ summary: '查询规划状态' })
  async getStatus(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
  ) {
    return this.planningService.getPlanStatus(userId, tripId);
  }

  @Get('result')
  @ApiOperation({ summary: '获取规划结果' })
  async getResult(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
  ) {
    return this.planningService.getPlanResult(userId, tripId);
  }

  @Post('apply')
  @ApiOperation({ summary: '应用规划版本' })
  @HttpCode(HttpStatus.OK)
  async applyPlan(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body('version') version: number,
  ) {
    return this.planningService.applyPlan(userId, tripId, version);
  }
}
