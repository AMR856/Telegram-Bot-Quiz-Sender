'use client'

import { formatJson } from '@/lib/utils'

interface ResponseDisplayProps {
  meta: string
  response: unknown
}

export function ResponseDisplay({ meta, response }: ResponseDisplayProps) {
  return (
    <section className="card">
      <h2 className="mb-2 text-lg font-semibold">Latest Response</h2>
      <p className="mb-3 text-xs text-slate-400">{meta}</p>
      <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
        {formatJson(response)}
      </pre>
    </section>
  )
}