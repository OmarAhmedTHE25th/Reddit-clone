import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PublicProfileUser extends AuthUser {
  counts: {
    posts: number;
    comments: number;
  };
  joinedCommunities: Array<{
    id: string;
    name: string;
    iconUrl?: string | null;
  }>;
  isOwnProfile: boolean;
}

// Keep access token strictly in JavaScript memory (never localStorage) to prevent XSS theft
let inMemoryAccessToken: string | null = null;

type AuthFailureHandler = () => void;
let onAuthFailure: AuthFailureHandler | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function registerAuthFailureHandler(handler: AuthFailureHandler): void {
  onAuthFailure = handler;
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Always send/receive HttpOnly refresh cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer access token to every outgoing request if present in memory
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryAccessToken && config.headers) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// Deduplicate simultaneous 401 refresh calls so rotating refresh tokens never collide
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      )
      .then((res) => {
        const nextToken = res.data.accessToken;
        setAccessToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        if (onAuthFailure) {
          onAuthFailure();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
