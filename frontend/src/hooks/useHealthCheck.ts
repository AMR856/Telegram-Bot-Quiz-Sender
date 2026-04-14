import { useState, useEffect, useCallback } from 'react'
import { HealthState } from '@/types'
import { apiClient } from '@/lib/api-client'
import { HEALTH_CHECK_INTERVAL } from '@/lib/constants'

export function useHealthCheck(backendUrl: string) {
  const [health, setHealth] = useState<HealthState>({
    state: 'idle',
    code: null,
    at: null,
  })

  const checkHealth = useCallback(async () => {
    if (!backendUrl.trim()) return

    setHealth((prev) => ({ ...prev, state: 'checking' }))

    try {
      apiClient.setBaseUrl(backendUrl)
      const result = await apiClient.get('/health')

      setHealth({
        state: result.ok ? 'up' : 'down',
        code: result.status,
        at: new Date().toLocaleTimeString(),
      })
    } catch {
      setHealth({
        state: 'down',
        code: null,
        at: new Date().toLocaleTimeString(),
      })
    }
  }, [backendUrl])

  useEffect(() => {
    if (!backendUrl.trim()) return

    checkHealth()
    const timer = setInterval(checkHealth, HEALTH_CHECK_INTERVAL)

    return () => clearInterval(timer)
  }, [backendUrl, checkHealth])

  return health
}