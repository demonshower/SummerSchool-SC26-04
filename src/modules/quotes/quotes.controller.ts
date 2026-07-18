import {
  Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { SearchQuotesDto, QuoteQueryDto } from './dto/quote.dto';
import { CurrentUser } from '../../common';

@ApiTags('报价比价')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('trips/:tripId/quotes/search')
  @ApiOperation({ summary: '搜索报价' })
  async searchQuotes(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: SearchQuotesDto,
  ) {
    return this.quotesService.searchQuotes(userId, tripId, dto);
  }

  @Get('trips/:tripId/quotes')
  @ApiOperation({ summary: '获取行程相关报价' })
  async getTripQuotes(
    @CurrentUser('id') userId: string,
    @Param('tripId') tripId: string,
    @Query() query: QuoteQueryDto,
  ) {
    return this.quotesService.getTripQuotes(userId, tripId, query);
  }

  @Post('quotes/:quoteId/refresh')
  @ApiOperation({ summary: '刷新报价' })
  async refreshQuote(
    @CurrentUser('id') userId: string,
    @Param('quoteId') quoteId: string,
  ) {
    return this.quotesService.refreshQuote(userId, quoteId);
  }

  @Post('quotes/:quoteId/clickout')
  @ApiOperation({ summary: '生成深链并记录跳转' })
  @HttpCode(HttpStatus.OK)
  async generateClickout(
    @CurrentUser('id') userId: string,
    @Param('quoteId') quoteId: string,
  ) {
    return this.quotesService.generateClickout(userId, quoteId);
  }
}
