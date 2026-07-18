import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import { CreateItemDto, UpdateItemDto, MoveItemDto, LockItemDto, ReorderItemsDto } from './dto/itinerary.dto';
import { CurrentUser } from '../../common';

@ApiTags('行程编辑')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('trips/:tripId')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Get('days')
  @ApiOperation({ summary: '获取所有天及活动项' })
  async getDays(@CurrentUser('id') userId: string, @Param('tripId') tripId: string) {
    return this.itineraryService.getDaysWithItems(userId, tripId);
  }

  @Post('items')
  @ApiOperation({ summary: '新增活动项' })
  async createItem(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.itineraryService.createItem(userId, tripId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: '修改活动项' })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itineraryService.updateItem(userId, tripId, itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: '删除活动项' })
  @HttpCode(HttpStatus.OK)
  async deleteItem(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.itineraryService.deleteItem(userId, tripId, itemId);
  }

  @Post('items/:itemId/move')
  @ApiOperation({ summary: '移动活动项（拖拽）' })
  async moveItem(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() dto: MoveItemDto,
  ) {
    return this.itineraryService.moveItem(userId, tripId, itemId, dto);
  }

  @Post('items/:itemId/lock')
  @ApiOperation({ summary: '锁定/解锁活动项' })
  async lockItem(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Param('itemId') itemId: string,
    @Body() dto: LockItemDto,
  ) {
    return this.itineraryService.lockItem(userId, tripId, itemId, dto);
  }

  @Post('items/reorder')
  @ApiOperation({ summary: '批量排序' })
  async reorderItems(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.itineraryService.reorderItems(userId, tripId, dto);
  }
}
