import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus, Inject, forwardRef, Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { PlanningService } from '../planning/planning.service';
import { CreateTripDto, UpdateTripDto, TripQueryDto } from './dto/trip.dto';
import { CurrentUser } from '../../common';

@ApiTags('旅行')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('trips')
export class TripsController {
  private readonly logger = new Logger(TripsController.name);

  constructor(
    private readonly tripsService: TripsService,
    @Inject(forwardRef(() => PlanningService))
    private readonly planningService: PlanningService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建旅行（可选 autoPlan=true 立即生成日程）' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTripDto) {
    const trip = await this.tripsService.create(userId, dto);

    if (dto.autoPlan) {
      try {
        const accepted = await this.planningService.createPlan(userId, trip.id, {
          strategy: dto.planStrategy || 'balanced',
        });
        const plan = await this.planningService.waitForJob(accepted.jobId);
        const detail = await this.tripsService.findOne(userId, trip.id);
        return {
          ...detail,
          autoPlan: {
            status: plan?.status || 'completed',
            jobId: accepted.jobId,
            stats: plan?.stats,
            explanation: plan?.explanation,
            stages: plan?.stages,
          },
        };
      } catch (e: any) {
        this.logger.warn(`autoPlan failed for trip ${trip.id}: ${e.message}`);
        const detail = await this.tripsService.findOne(userId, trip.id);
        return {
          ...detail,
          autoPlan: {
            status: 'failed',
            error: e.message || '自动规划失败，请在详情页点击重新规划',
          },
        };
      }
    }

    return trip;
  }

  @Get()
  @ApiOperation({ summary: '获取行程列表' })
  async findAll(@CurrentUser('id') userId: string, @Query() query: TripQueryDto) {
    return this.tripsService.findAll(userId, query);
  }

  @Get(':tripId')
  @ApiOperation({ summary: '获取行程详情' })
  async findOne(@CurrentUser('id') userId: string, @Param('tripId') tripId: string) {
    return this.tripsService.findOne(userId, tripId);
  }

  @Patch(':tripId')
  @ApiOperation({ summary: '更新旅行信息' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(userId, tripId, dto);
  }

  @Delete(':tripId')
  @ApiOperation({ summary: '删除行程' })
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser('id') userId: string, @Param('tripId') tripId: string) {
    return this.tripsService.remove(userId, tripId);
  }
}
