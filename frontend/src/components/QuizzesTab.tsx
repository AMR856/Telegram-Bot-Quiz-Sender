'use client'

interface QuizzesTabProps {
  quizzes: string
  delayMs: number
  loading: boolean
  onQuizzesChange: (value: string) => void
  onDelayChange: (value: number) => void
  onSend: () => void
}

export function QuizzesTab({
  quizzes,
  delayMs,
  loading,
  onQuizzesChange,
  onDelayChange,
  onSend,
}: QuizzesTabProps) {
  return (
    <section className="card grid gap-3">
      <h2 className="text-lg font-semibold">Send Quizzes</h2>

      <textarea
        value={quizzes}
        onChange={(e) => onQuizzesChange(e.target.value)}
        rows={9}
        className="input font-mono text-sm"
      />

      <label className="text-sm text-slate-300">Delay (ms): {delayMs}</label>
      <input
        type="range"
        min="100"
        max="5000"
        step="100"
        value={delayMs}
        onChange={(e) => onDelayChange(Number(e.target.value))}
        className="w-full"
      />

      <button
        type="button"
        onClick={onSend}
        className="button-primary"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Quizzes'}
      </button>
    </section>
  )
}