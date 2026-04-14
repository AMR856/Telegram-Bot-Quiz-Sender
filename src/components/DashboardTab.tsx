'use client'

import { QuickStat } from '@/types'

interface DashboardTabProps {
  healthLabel: string
  quickStats: QuickStat[]
}

export function DashboardTab({ healthLabel, quickStats }: DashboardTabProps) {
  return (
    <section className="card">
      <h2 className="mb-3 text-lg font-semibold">Backend Health</h2>
      <p className="text-sm text-slate-300">
        Status: <span className="font-semibold text-cyan-300">{healthLabel}</span>
      </p>
      <p className="mt-2 text-xs text-slate-400">Checked every 5 seconds.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-cyan-300">
              {item.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}