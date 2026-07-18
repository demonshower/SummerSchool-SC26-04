export interface Quote {
  id: string;
  quoteSearchId: string;
  providerCode: string;
  productType: string;
  productName: string;
  comparableKey: string;
  basePriceMinor: number;
  taxesFeesMinor: number;
  totalPriceMinor: number;
  currency: string;
  priceUnit: string;
  conditions: Record<string, any>;
  inventoryStatus: 'available' | 'limited' | 'sold_out' | 'unknown';
  deepLink: string | null;
  observedAt: string;
  expiresAt: string;
  isExpired?: boolean;
}

export interface QuoteSearchResult {
  searchId: string;
  status: string;
  quotes: Quote[];
  cached?: boolean;
}

export interface SearchQuotesDto {
  productType: 'flight' | 'train' | 'hotel' | 'ticket';
  criteria: Record<string, any>;
  providerCodes?: string[];
}
