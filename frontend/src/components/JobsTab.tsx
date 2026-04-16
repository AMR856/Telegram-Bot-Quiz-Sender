'use client'

import { formatJson } from '@/lib/utils'

interface JobsTabProps {
  jobId: string
  jobStatus: unknown
  loading: boolean
  onJobIdChange: (value: string) => void
  onCheckJob: () => void
}

export function JobsTab({
  jobId,
  jobStatus,
  loading,
  onJobIdChange,
  onCheckJob,
}: JobsTabProps) {
  return (
    <section className="card grid gap-3">
      <h2 className="text-lg font-semibold">Job Status</h2>

      <input
        type="text"
        placeholder="Job ID"
        value={jobId}
        onChange={(e) => onJobIdChange(e.target.value)}
        className="input"
      />

      <button
        type="button"
        onClick={onCheckJob}
        className="button-primary"
        disabled={loading || !jobId.trim()}
      >
        Check Job
      </button>

      {jobStatus && (
        <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
          {formatJson(jobStatus)}
        </pre>
      )}
    </section>
  )
}