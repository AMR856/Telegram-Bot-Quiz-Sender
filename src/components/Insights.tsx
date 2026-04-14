'use client'

import { InsightCard } from '@/types'
import { getToneClass } from '@/lib/utils'

interface InsightsProps {
  insights: InsightCard[]
}

export function Insights({ insights }: InsightsProps) {
  return (
    <section className="card">
      <h2 className="mb-3 text-lg font-semibold">Action Insights</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            className={`rounded-xl border p-3 text-sm ${getToneClass(item.tone)}`}
          >
            <p className="text-[11px] uppercase tracking-wide opacity-75">
              {item.title}
            </p>
            <p className="mt-1 break-all font-medium">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}