'use client'

import { HealthState } from '@/types'
import { getStatusClass, getHealthLabel } from '@/lib/utils'

interface HeaderProps {
  health: HealthState
  backendUrl: string
  apiKey: string
  onBackendUrlChange: (value: string) => void
  onApiKeyChange: (value: string) => void
}

export function Header({
  health,
  backendUrl,
  apiKey,
  onBackendUrlChange,
  onApiKeyChange,
}: HeaderProps) {
  const healthLabel = getHealthLabel(health)

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text">Telegram Quiz Sender</h1>
          <p className="text-xs text-slate-400">Next.js panel for all backend routes</p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${getStatusClass(health.state)}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            <span className="font-semibold uppercase">{healthLabel}</span>
            <span className="text-[10px] opacity-80">{health.at || 'waiting'}</span>
          </div>

          <input
            type="text"
            placeholder="Backend URL"
            value={backendUrl}
            onChange={(e) => onBackendUrlChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
          />

          <input
            type="text"
            placeholder="x-api-key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
          />
        </div>
      </div>
    </header>
  )
}