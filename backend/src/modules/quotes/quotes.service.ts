import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common';
import { SearchQuotesDto, QuoteQueryDto } from './dto/quote.dto';
import * as crypto from 'crypto';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 搜索报价 (V1 Mock)
   */
  async searchQuotes(userId: string, tripId: string, dto: SearchQuotesDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    // 请求去重哈希
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ tripId, ...dto }))
      .digest('hex');

    // 检查是否有缓存的搜索结果
    const existing = await this.prisma.quoteSearch.findFirst({
      where: { requestHash, status: 'completed' },
      include: { quotes: true },
    });
    if (existing) {
      // 检查是否过期
      const notExpired = existing.quotes.filter((q) => q.expiresAt > new Date());
      if (notExpired.length > 0) {
        return { searchId: existing.id, status: 'completed', quotes: notExpired, cached: true };
      }
    }

    // 创建搜索记录
    const search = await this.prisma.quoteSearch.create({
      data: {
        tripId,
        productType: dto.productType,
        requestHash,
        criteria: dto.criteria as any,
        status: 'completed',
      },
    });

    // V1 Mock: 生成模拟报价
    const mockQuotes = this.generateMockQuotes(trip, dto);

    // 保存报价
    for (const q of mockQuotes) {
      await this.prisma.quote.create({
        data: {
          quoteSearchId: search.id,
          providerCode: q.providerCode,
          productType: dto.productType,
          productName: q.productName,
          comparableKey: q.comparableKey,
          basePriceMinor: q.basePriceMinor,
          taxesFeesMinor: q.taxesFeesMinor,
          totalPriceMinor: q.totalPriceMinor,
          currency: 'CNY',
          priceUnit: q.priceUnit,
          conditions: q.conditions as any,
          inventoryStatus: q.inventoryStatus,
          deepLink: q.deepLink,
          observedAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟后过期
        },
      });
    }

    const quotes = await this.prisma.quote.findMany({
      where: { quoteSearchId: search.id },
    });

    return { searchId: search.id, status: 'completed', quotes };
  }

  /**
   * 获取行程相关报价
   */
  async getTripQuotes(userId: string, tripId: string, query: QuoteQueryDto) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: userId },
    });
    if (!trip) throw BusinessException.notFound('Trip', tripId);

    const where: any = { quoteSearch: { tripId } };
    if (query.productType) {
      where.productType = query.productType;
    }

    const quotes = await this.prisma.quote.findMany({
      where,
      orderBy: { observedAt: 'desc' },
      take: 50,
    });

    // 标记过期
    const now = new Date();
    return quotes.map((q) => ({
      ...q,
      isExpired: q.expiresAt < now,
    }));
  }

  /**
   * 刷新报价
   */
  async refreshQuote(userId: string, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { quoteSearch: { include: { trip: true } } },
    });
    if (!quote) throw BusinessException.notFound('Quote', quoteId);

    // 验证权限
    if (quote.quoteSearch.trip.ownerId !== userId) {
      throw BusinessException.notFound('Quote', quoteId);
    }

    // V1 Mock: 价格微调
    const priceDelta = Math.floor((Math.random() - 0.5) * 2000); // ±20元
    const newTotal = Math.max(100, quote.totalPriceMinor + priceDelta);

    const updated = await this.prisma.quote.create({
      data: {
        quoteSearchId: quote.quoteSearchId,
        providerCode: quote.providerCode,
        productType: quote.productType,
        productName: quote.productName,
        comparableKey: quote.comparableKey,
        basePriceMinor: quote.basePriceMinor + priceDelta,
        taxesFeesMinor: quote.taxesFeesMinor,
        totalPriceMinor: newTotal,
        currency: quote.currency,
        priceUnit: quote.priceUnit,
        conditions: (quote.conditions ?? {}) as any,
        inventoryStatus: 'available',
        deepLink: quote.deepLink,
        observedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return updated;
  }

  /**
   * 生成深链
   */
  async generateClickout(userId: string, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { quoteSearch: { include: { trip: true } } },
    });
    if (!quote) throw BusinessException.notFound('Quote', quoteId);
    if (quote.quoteSearch.trip.ownerId !== userId) {
      throw BusinessException.notFound('Quote', quoteId);
    }

    // 记录跳转事件
    await this.prisma.userEvent.create({
      data: {
        userId,
        tripId: quote.quoteSearch.tripId,
        eventType: 'quote_clicked',
        entityType: 'quote',
        entityId: quoteId,
      },
    });

    return {
      deepLink: quote.deepLink || `https://mock-booking.com/quote/${quoteId}`,
      providerCode: quote.providerCode,
      totalPriceMinor: quote.totalPriceMinor,
      expiresAt: quote.expiresAt,
    };
  }

  // ===== Mock 报价生成 =====

  private generateMockQuotes(trip: any, dto: SearchQuotesDto) {
    const providers = ['mock-ctrip', 'mock-qunar', 'mock-meituan'];
    const quotes: any[] = [];

    switch (dto.productType) {
      case 'train':
        quotes.push(
          { providerCode: 'mock-ctrip', productName: 'G7311 高铁二等座', comparableKey: 'train_G7311_2nd', basePriceMinor: 12000, taxesFeesMinor: 0, totalPriceMinor: 12000, priceUnit: 'total', conditions: { refundable: true, seatClass: '二等座' }, inventoryStatus: 'available', deepLink: 'https://mock.ctrip.com/train/G7311' },
          { providerCode: 'mock-qunar', productName: 'G7311 高铁二等座', comparableKey: 'train_G7311_2nd', basePriceMinor: 11800, taxesFeesMinor: 0, totalPriceMinor: 11800, priceUnit: 'total', conditions: { refundable: true, seatClass: '二等座' }, inventoryStatus: 'available', deepLink: 'https://mock.qunar.com/train/G7311' },
          { providerCode: 'mock-ctrip', productName: 'G7311 高铁一等座', comparableKey: 'train_G7311_1st', basePriceMinor: 20000, taxesFeesMinor: 0, totalPriceMinor: 20000, priceUnit: 'total', conditions: { refundable: true, seatClass: '一等座' }, inventoryStatus: 'available', deepLink: 'https://mock.ctrip.com/train/G7311-1st' },
        );
        break;
      case 'hotel':
        quotes.push(
          { providerCode: 'mock-ctrip', productName: '杭州西湖美居酒店 - 标准双床房', comparableKey: 'hotel_mercure_standard_twin', basePriceMinor: 35000, taxesFeesMinor: 0, totalPriceMinor: 35000, priceUnit: 'room-night', conditions: { breakfast: true, cancellation: 'free', deadline: '18:00' }, inventoryStatus: 'available', deepLink: 'https://mock.ctrip.com/hotel/mercure' },
          { providerCode: 'mock-meituan', productName: '杭州西湖美居酒店 - 标准双床房', comparableKey: 'hotel_mercure_standard_twin', basePriceMinor: 33800, taxesFeesMinor: 0, totalPriceMinor: 33800, priceUnit: 'room-night', conditions: { breakfast: true, cancellation: 'free', deadline: '18:00' }, inventoryStatus: 'available', deepLink: 'https://mock.meituan.com/hotel/mercure' },
          { providerCode: 'mock-ctrip', productName: '杭州君悦酒店 - 豪华大床房', comparableKey: 'hotel_grand_deluxe_king', basePriceMinor: 88000, taxesFeesMinor: 0, totalPriceMinor: 88000, priceUnit: 'room-night', conditions: { breakfast: true, cancellation: 'partial' }, inventoryStatus: 'limited', deepLink: 'https://mock.ctrip.com/hotel/grand' },
        );
        break;
      case 'ticket':
        quotes.push(
          { providerCode: 'mock-ctrip', productName: '西湖风景区 - 成人票', comparableKey: 'ticket_xihu_adult', basePriceMinor: 0, taxesFeesMinor: 0, totalPriceMinor: 0, priceUnit: 'total', conditions: { type: '免费' }, inventoryStatus: 'available', deepLink: 'https://mock.ctrip.com/ticket/xihu' },
          { providerCode: 'mock-ctrip', productName: '灵隐寺 - 成人票', comparableKey: 'ticket_lingyin_adult', basePriceMinor: 7500, taxesFeesMinor: 0, totalPriceMinor: 7500, priceUnit: 'total', conditions: { type: '门票' }, inventoryStatus: 'available', deepLink: 'https://mock.ctrip.com/ticket/lingyin' },
        );
        break;
      default:
        quotes.push(
          { providerCode: 'mock-ctrip', productName: 'Mock报价', comparableKey: 'mock_default', basePriceMinor: 10000, taxesFeesMinor: 0, totalPriceMinor: 10000, priceUnit: 'total', conditions: {}, inventoryStatus: 'available', deepLink: 'https://mock.ctrip.com' },
        );
    }

    return quotes;
  }
}
