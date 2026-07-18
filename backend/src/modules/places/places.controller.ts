import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlacesService } from './places.service';
import { SearchPlacesDto } from './dto/place.dto';
import { CurrentUser } from '../../common';

@ApiTags('地点')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  @ApiOperation({ summary: '搜索地点' })
  async search(@Query() dto: SearchPlacesDto) {
    return this.placesService.search(dto);
  }

  @Get('cities')
  @ApiOperation({ summary: '获取城市列表' })
  async getCities() {
    return this.placesService.getCities();
  }

  @Get(':placeId')
  @ApiOperation({ summary: '地点详情' })
  async findById(@Param('placeId') placeId: string) {
    return this.placesService.findById(placeId);
  }
}
