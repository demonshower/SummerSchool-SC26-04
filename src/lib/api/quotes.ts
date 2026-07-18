import { apiClient } from './client';
import { Quote, QuoteSearchResult, SearchQuotesDto } from '@/types/quote';

export const quotesApi = {
  search: (tripId: string, dto: SearchQuotesDto) => apiClient.post<any, QuoteSearchResult>(`/trips/${tripId}/quotes/search`, dto),
  getTripQuotes: (tripId: string, productType?: string) => apiClient.get<any, Quote[]>(`/trips/${tripId}/quotes`, { params: productType ? { productType } : {} }),
  refreshQuote: (quoteId: string) => apiClient.post<any, Quote>(`/quotes/${quoteId}/refresh`),
  generateClickout: (quoteId: string) => apiClient.post<any, { deepLink: string; providerCode: string; totalPriceMinor: number; expiresAt: string }>(`/quotes/${quoteId}/clickout`),
};
