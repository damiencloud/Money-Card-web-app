import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';

// ─── API Client ────────────────────────────────────────────
// Centralized HTTP client abstraction.
// Supports: base URL from env, auth headers, JSON, centralized error handling,
// mid-session 401 response interception with token refresh & retry.

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:4000/api';

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];
  private onSessionExpiredCallbacks: Array<() => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    // Request interceptor — attach auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor — centralized error handling & mid-session 401 token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as RetryAxiosRequestConfig | undefined;

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;

          if (this.isRefreshing) {
            return new Promise<string>((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(this.normalizeError(err)));
          }

          this.isRefreshing = true;

          try {
            const refreshRes = await this.client.post<ApiResponse<{ accessToken: string }>>(
              '/v1/auth/refresh',
              {},
            );

            if (refreshRes.data?.success && refreshRes.data.data?.accessToken) {
              const newToken = refreshRes.data.data.accessToken;
              this.setAccessToken(newToken);
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              this.processQueue(null, newToken);
              return this.client(originalRequest);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (refreshErr) {
            this.processQueue(refreshErr, null);
            this.notifySessionExpired();
            return Promise.reject(this.normalizeError(refreshErr));
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.normalizeError(error));
      },
    );
  }

  private processQueue(error: unknown, token: string | null = null): void {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else if (token) {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  public onSessionExpired(callback: () => void): () => void {
    this.onSessionExpiredCallbacks.push(callback);
    return () => {
      this.onSessionExpiredCallbacks = this.onSessionExpiredCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  public notifySessionExpired(): void {
    this.setAccessToken(null);
    this.onSessionExpiredCallbacks.forEach((cb) => cb());
  }

  // ── Token Management ──────────────────────────────────────

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  // ── HTTP Methods ──────────────────────────────────────────

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // ── Error Normalization ───────────────────────────────────

  private normalizeError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      return {
        message: error.response?.data?.message || error.message || 'An unexpected error occurred',
        status: error.response?.status || 0,
        errors: error.response?.data?.errors || undefined,
      };
    }
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 0,
    };
  }
}

// ─── Error Type ────────────────────────────────────────────

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// ─── Singleton Export ──────────────────────────────────────

export const apiClient = new ApiClient();
