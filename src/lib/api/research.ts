import { apiClient } from './client';

export const researchApi = {
  webSearch: (dto: { query: string; count?: number; freshness?: string; site?: string }) =>
    apiClient.post('/research/web-search', dto),
  researchTrip: (
    tripId: string,
    dto?: {
      queries?: string[];
      countPerQuery?: number;
      maxQueries?: number;
      extractInsights?: boolean;
      persist?: boolean;
      freshness?: string;
    },
  ) => apiClient.post(`/trips/${tripId}/research`, dto || {}),
  listSources: (tripId: string) => apiClient.get(`/trips/${tripId}/research/sources`),
  getInsights: (tripId: string) => apiClient.get(`/trips/${tripId}/research/insights`),
};
