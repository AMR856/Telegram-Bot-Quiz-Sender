import { ApiResponse } from '@/types'

const FALLBACK_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3000'

class ApiClient {
  private baseUrl: string = FALLBACK_API_BASE_URL

  setBaseUrl(url: string): void {
    this.baseUrl = (url || '').trim() || FALLBACK_API_BASE_URL
  }

  async request<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`

    try {
      const response = await fetch(url, options)
      const raw = await response.text()

      let data: T | string = raw
      try {
        data = raw ? (JSON.parse(raw) as T) : (null as T)
      } catch {
        data = raw as T
      }

      return {
        ok: response.ok,
        status: response.status,
        url,
        data,
      }
    } catch (error) {
      throw new Error(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  async get<T = unknown>(
    path: string,
    headers: HeadersInit = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'GET',
      headers,
    })
  }

  async post<T = unknown>(
    path: string,
    body?: BodyInit,
    headers: HeadersInit = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      headers,
      body,
    })
  }
}

export const apiClient = new ApiClient()