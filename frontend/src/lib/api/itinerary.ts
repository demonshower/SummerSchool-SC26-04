import { apiClient } from './client';
import { ItineraryItem, TripDay } from '@/types/trip';

export const itineraryApi = {
  getDaysWithItems: (tripId: string) => apiClient.get<any, TripDay[]>(`/trips/${tripId}/days`),
  createItem: (tripId: string, dto: any) => apiClient.post<any, ItineraryItem>(`/trips/${tripId}/items`, dto),
  updateItem: (tripId: string, itemId: string, dto: any) => apiClient.patch<any, ItineraryItem>(`/trips/${tripId}/items/${itemId}`, dto),
  deleteItem: (tripId: string, itemId: string) => apiClient.delete(`/trips/${tripId}/items/${itemId}`),
  moveItem: (tripId: string, itemId: string, dto: any) => apiClient.post(`/trips/${tripId}/items/${itemId}/move`, dto),
  lockItem: (tripId: string, itemId: string, locked: boolean) => apiClient.post(`/trips/${tripId}/items/${itemId}/lock`, { locked }),
};
