/**
 * Health check response types
 */
export interface HealthState {
  state: 'idle' | 'checking' | 'up' | 'down'
  code: number | null
  at: string | null
}

/**
 * API request response wrapper
 */
export interface ApiResponse<T = unknown> {
  ok: boolean
  status: number
  url: string
  data: T
}

/**
 * Generic error response
 */
export interface ErrorPayload {
  error: string
}

/**
 * Auth request payload
 */
export interface AuthPayload {
  chatId: string
  botToken: string
  isChannel: boolean
}

/**
 * Auth response with API key
 */
export interface AuthResponse {
  data?: {
    apiKey: string
  }
}

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswerId: number
  explanation: string
}

/**
 * Quiz send request payload
 */
export interface QuizSendPayload {
  quizzes: QuizQuestion[]
  delayMs: number
  retryWrongAfterMinutes: number
}

/**
 * Quiz send response
 */
export interface QuizSendResponse {
  data?: {
    jobId: string
  }
}

/**
 * Image metadata
 */
export interface ImageData {
  url?: string
  secureUrl?: string
  path?: string
  publicId?: string
  originalName?: string
  images?: ImageData[]
}

/**
 * Images list response with pagination
 */
export interface ImagesResponse {
  data?: {
    images: ImageData[]
    nextCursor?: string
  }
}

/**
 * Job status response
 */
export interface JobStatus {
  data?: {
    state?: string
    status?: string
  }
}

/**
 * Toast notification
 */
export interface Toast {
  message: string
  type: 'info' | 'success' | 'error'
}

/**
 * Insight card in dashboard
 */
export interface InsightCard {
  title: string
  value: string
  tone: 'good' | 'warn' | 'neutral'
}

/**
 * Quick stat item
 */
export interface QuickStat {
  label: string
  value: string
}