import { apiClient } from './client';

export const contentApi = {
  importText: (dto: { rawText: string; title?: string; tripId?: string }) => apiClient.post('/content/imports/text', dto),
  importLink: (dto: { sourceUrl: string; title?: string; tripId?: string }) => apiClient.post('/content/imports/link', dto),
  getExtract: (sourceId: string) => apiClient.get(`/content/sources/${sourceId}`),
  getTripSources: (tripId: string) => apiClient.get(`/content/trips/${tripId}/sources`),
  deleteSource: (sourceId: string) => apiClient.delete(`/content/sources/${sourceId}`),
  resolveMention: (mentionId: string, placeId: string) => apiClient.post(`/content/mentions/${mentionId}/resolve`, { placeId }),
};
