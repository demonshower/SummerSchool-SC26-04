import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto, TripQueryDto } from './dto/trip.dto';
import { CurrentUser } from '../../common';

@ApiTags('旅行')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @ApiOperation({ summary: '创建旅行' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTripDto) {
    return this.tripsService.create(userId, dto);
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
