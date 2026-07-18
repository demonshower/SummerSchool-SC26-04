import { apiClient } from './client';
import { Place, City } from '@/types/place';

export const placesApi = {
  search: (params: { city?: string; q?: string; category?: string; limit?: number }) => apiClient.get<any, Place[]>('/places/search', { params }),
  getCities: () => apiClient.get<any, City[]>('/places/cities'),
  getDetail: (placeId: string) => apiClient.get<any, Place>(`/places/${placeId}`),
};
