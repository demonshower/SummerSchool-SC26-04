import { apiClient } from './client';

export const planningApi = {
  createPlan: (tripId: string, dto?: any) => apiClient.post(`/trips/${tripId}/planning/plan`, dto || {}),
  getStatus: (tripId: string) => apiClient.get(`/trips/${tripId}/planning/status`),
  getResult: (tripId: string) => apiClient.get(`/trips/${tripId}/planning/result`),
  applyPlan: (tripId: string, version: number) => apiClient.post(`/trips/${tripId}/planning/apply`, { version }),
};
