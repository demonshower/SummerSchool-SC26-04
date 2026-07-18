import {
  Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { ImportTextDto, ImportLinkDto } from './dto/content.dto';
import { CurrentUser } from '../../common';

@ApiTags('攻略内容')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('imports/text')
  @ApiOperation({ summary: '导入文本攻略' })
  async importText(@CurrentUser('id') userId: string, @Body() dto: ImportTextDto) {
    return this.contentService.importText(userId, dto);
  }

  @Post('imports/link')
  @ApiOperation({ summary: '导入链接' })
  async importLink(@CurrentUser('id') userId: string, @Body() dto: ImportLinkDto) {
    return this.contentService.importLink(userId, dto);
  }

  @Get('sources/:sourceId')
  @ApiOperation({ summary: '获取攻略抽取结果' })
  async getExtract(@CurrentUser('id') userId: string, @Param('sourceId') sourceId: string) {
    return this.contentService.getExtract(userId, sourceId);
  }

  @Get('trips/:tripId/sources')
  @ApiOperation({ summary: '获取行程关联攻略' })
  async getTripSources(@CurrentUser('id') userId: string, @Param('tripId') tripId: string) {
    return this.contentService.getTripContentSources(userId, tripId);
  }

  @Delete('sources/:sourceId')
  @ApiOperation({ summary: '删除攻略' })
  @HttpCode(HttpStatus.OK)
  async deleteSource(@CurrentUser('id') userId: string, @Param('sourceId') sourceId: string) {
    return this.contentService.deleteSource(userId, sourceId);
  }

  @Post('mentions/:mentionId/resolve')
  @ApiOperation({ summary: '确认地点映射' })
  async resolveMention(
    @CurrentUser('id') userId: string,
    @Param('mentionId') mentionId: string,
    @Body('placeId') placeId: string,
  ) {
    return this.contentService.resolveMention(userId, mentionId, placeId);
  }
}
