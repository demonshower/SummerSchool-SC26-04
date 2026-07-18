import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common';
import { ResearchService } from './research.service';
import { TripResearchDto, WebSearchDto } from './dto/research.dto';

@ApiTags('攻略研究')
@Controller()
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post('research/web-search')
  @ApiOperation({ summary: '博查网页搜索（需登录）' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async webSearch(@Body() dto: WebSearchDto) {
    return this.researchService.searchWeb(dto);
  }

  @Post('trips/:tripId/research')
  @ApiOperation({ summary: '对行程启动攻略研究（多查询搜索+LLM抽取+可选持久化）' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async researchTrip(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: TripResearchDto,
  ) {
    return this.researchService.researchTrip(userId, tripId, dto);
  }

  @Get('trips/:tripId/research/sources')
  @ApiOperation({ summary: '获取行程关联的攻略/研究来源列表' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async listSources(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
  ) {
    return this.researchService.listTripResearchSources(userId, tripId);
  }

  @Get('trips/:tripId/research/insights')
  @ApiOperation({ summary: '获取行程攻略聚合洞察（地点提及去重）' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async insights(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
  ) {
    return this.researchService.getTripInsights(userId, tripId);
  }
}
