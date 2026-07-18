import { apiClient } from './client';
import { Trip, CreateTripDto, UpdateTripDto, TripQueryDto } from '@/types/trip';
import { PaginatedResponse } from '@/types/api';

export const tripsApi = {
  create: (dto: CreateTripDto) => apiClient.post<any, Trip>('/trips', dto),
  list: (query?: TripQueryDto) => apiClient.get<any, PaginatedResponse<Trip>>('/trips', { params: query }),
  getOne: (tripId: string) => apiClient.get<any, Trip>(`/trips/${tripId}`),
  update: (tripId: string, dto: UpdateTripDto) => apiClient.patch<any, Trip>(`/trips/${tripId}`, dto),
  delete: (tripId: string) => apiClient.delete(`/trips/${tripId}`),
};
