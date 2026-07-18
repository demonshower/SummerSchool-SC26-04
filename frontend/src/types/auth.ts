export interface User {
  id: string;
  username: string;
  email: string | null;
  isGuest: boolean;
  locale: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RegisterDto {
  username: string;
  password: string;
  email?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
