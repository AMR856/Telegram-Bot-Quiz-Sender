import { useEffect, useState } from 'react'
import { HealthState } from '@/types'

function buildHealthStreamUrl(backendUrl: string): string {
  return new URL('/health/stream', backendUrl.trim()).toString()
}

export function useHealthCheck(backendUrl: string) {
  const [health, setHealth] = useState<HealthState>({
    state: 'idle',
    code: null,
    at: null,
  })

  useEffect(() => {
    const target = backendUrl.trim()

    if (!target) {
      setHealth({
        state: 'idle',
        code: null,
        at: null,
      })
      return
    }

    setHealth((prev) => ({
      ...prev,
      state: 'checking',
    }))

    const source = new EventSource(buildHealthStreamUrl(target))

    const handleHealthEvent = (event: MessageEvent) => {
      try {
        const snapshot = JSON.parse(event.data) as HealthState

        setHealth({
          state: snapshot.state,
          code: snapshot.code,
          at: snapshot.at,
        })
      } catch {
        setHealth({
          state: 'down',
          code: null,
          at: new Date().toLocaleTimeString(),
        })
      }
    }

    source.addEventListener('health', handleHealthEvent)

    source.onerror = () => {
      setHealth({
        state: 'down',
        code: null,
        at: new Date().toLocaleTimeString(),
      })
    }

    return () => {
      source.removeEventListener('health', handleHealthEvent)
      source.close()
    }
  }, [backendUrl])

  return health
}