import { ImageData, HealthState } from '@/types'

/**
 * Format JSON with indentation
 */
export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

/**
 * Extract images from API response payload
 */
export function extractImages(payload?: Record<string, unknown>): ImageData[] {
  const envelope = payload?.data as Record<string, unknown> | undefined
  const data = (payload?.data || payload) as Record<string, unknown> | undefined

  if (Array.isArray((data as Record<string, unknown> | undefined)?.images)) {
    return ((data as Record<string, unknown>).images || []) as ImageData[]
  }

  if (
    (data as Record<string, unknown> | undefined)?.url ||
    (data as Record<string, unknown> | undefined)?.secureUrl
  ) {
    return [data as ImageData]
  }

  if (Array.isArray((envelope as Record<string, unknown> | undefined)?.images)) {
    return ((envelope as Record<string, unknown>).images || []) as ImageData[]
  }

  if (
    (envelope as Record<string, unknown> | undefined)?.url ||
    (envelope as Record<string, unknown> | undefined)?.secureUrl
  ) {
    return [envelope as ImageData]
  }

  return []
}

/**
 * Get Tailwind class names for health status badge
 */
export function getStatusClass(state: HealthState['state']): string {
  switch (state) {
    case 'up':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    case 'down':
      return 'bg-red-500/20 text-red-300 border-red-500/40'
    default:
      return 'bg-slate-500/20 text-slate-200 border-slate-500/40'
  }
}

/**
 * Get Tailwind class names for insight card tone
 */
export function getToneClass(tone: 'good' | 'warn' | 'neutral'): string {
  switch (tone) {
    case 'good':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
    case 'warn':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-100'
    default:
      return 'border-slate-700 bg-slate-900/60 text-slate-200'
  }
}

/**
 * Mask API key for display (show first 6 and last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (!key) return 'not set'
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

/**
 * Generate health label text
 */
export function getHealthLabel(health: HealthState): string {
  if (health.state === 'up') return `up ${health.code || ''}`.trim()
  if (health.state === 'down') return `down ${health.code || ''}`.trim()
  if (health.state === 'checking') return 'checking'
  return 'idle'
}

/**
 * Encode URI component safely
 */
export function encodeId(id: string): string {
  return encodeURIComponent(id.trim())
}

/**
 * Build query string from params
 */
export function buildQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

/**
 * Safe localStorage getter
 */
export function getLocalStorage(key: string, defaultValue: string = ''): string {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Safe localStorage setter
 */
export function setLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    console.warn(`Failed to set localStorage key: ${key}`)
  }
}