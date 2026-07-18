import { apiClient } from './client';
import { AuthResponse, LoginDto, RegisterDto, User } from '@/types/auth';

export const authApi = {
  register: (dto: RegisterDto) => apiClient.post<any, AuthResponse>('/auth/register', dto),
  login: (dto: LoginDto) => apiClient.post<any, AuthResponse>('/auth/login', dto),
  guestLogin: () => apiClient.post<any, AuthResponse>('/auth/guest', {}),
  getCurrentUser: () => apiClient.get<any, User>('/auth/me'),
};
