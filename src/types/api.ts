export interface ApiResponse<T> {
  data: T;
  meta: { requestId: string; timestamp: string };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  path?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
