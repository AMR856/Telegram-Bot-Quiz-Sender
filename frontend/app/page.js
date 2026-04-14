'use client'

import { useEffect, useMemo, useState } from 'react'

const QUIZ_SAMPLE = `[
  {
    "question": "What color is the Telegram logo?",
    "options": ["Blue", "Red", "Green", "Orange"],
    "correctAnswerId": 0,
    "explanation": "Telegram branding uses blue tones."
  }
]`

function asPretty(value) {
  return JSON.stringify(value, null, 2)
}

function extractImages(payload) {
  const data = payload?.data?.data
  if (!data) return []

  if (Array.isArray(data.images)) return data.images
  if (data.url || data.secureUrl) return [data]
  return []
}

function statusClass(state) {
  if (state === 'up') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  if (state === 'down') return 'bg-red-500/20 text-red-300 border-red-500/40'
  return 'bg-slate-500/20 text-slate-200 border-slate-500/40'
}

export default function Page() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:3000')
  const [apiKey, setApiKey] = useState('')

  const [authData, setAuthData] = useState({
    chatId: '',
    botToken: '',
    isChannel: true,
  })

  const [quizzes, setQuizzes] = useState(QUIZ_SAMPLE)
  const [delayMs, setDelayMs] = useState(1000)
  const [jobId, setJobId] = useState('')

  const [imagesLimit, setImagesLimit] = useState('30')
  const [imagesCursor, setImagesCursor] = useState('')

  const [imageFile, setImageFile] = useState(null)
  const [images, setImages] = useState([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const [health, setHealth] = useState({ state: 'idle', code: null, at: null })
  const [jobStatus, setJobStatus] = useState(null)
  const [latestResponse, setLatestResponse] = useState({ message: 'Run an action to see details' })
  const [latestMeta, setLatestMeta] = useState('Ready')
  const [lastAction, setLastAction] = useState('none')

  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const activeImage = images[activeImageIndex] || null

  const healthLabel = useMemo(() => {
    if (health.state === 'up') return `up ${health.code || ''}`.trim()
    if (health.state === 'down') return `down ${health.code || ''}`.trim()
    if (health.state === 'checking') return 'checking'
    return 'idle'
  }, [health])

  const insights = useMemo(() => {
    const cards = []
    const status = latestResponse?.status
    const payload = latestResponse?.data?.data

    cards.push({
      title: 'Last Action',
      value: lastAction,
      tone: 'neutral',
    })

    cards.push({
      title: 'HTTP Status',
      value: typeof status === 'number' ? String(status) : 'n/a',
      tone: typeof status === 'number' && status < 400 ? 'good' : 'warn',
    })

    cards.push({
      title: 'API Key',
      value: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : 'not set',
      tone: apiKey ? 'good' : 'warn',
    })

    if (lastAction.includes('/auth/sign-in') && payload?.apiKey) {
      cards.push({
        title: 'Sign-In Result',
        value: 'Authenticated and key received',
        tone: 'good',
      })
    }

    if (lastAction.includes('/images')) {
      cards.push({
        title: 'Gallery Items',
        value: `${images.length} loaded`,
        tone: images.length > 0 ? 'good' : 'neutral',
      })

      if (payload?.nextCursor) {
        cards.push({
          title: 'Next Cursor',
          value: String(payload.nextCursor),
          tone: 'neutral',
        })
      }
    }

    if (lastAction.includes('/quizzes/send')) {
      cards.push({
        title: 'Queue Status',
        value: jobId ? `Queued with jobId ${jobId}` : 'No job id returned',
        tone: jobId ? 'good' : 'warn',
      })
    }

    if (lastAction.includes('/jobs/:id') && jobStatus?.data) {
      const state = jobStatus.data.state || jobStatus.data.status || 'unknown'
      cards.push({
        title: 'Job State',
        value: String(state),
        tone: state === 'completed' ? 'good' : 'neutral',
      })
    }

    if (latestResponse?.error) {
      cards.push({
        title: 'Error',
        value: String(latestResponse.error),
        tone: 'warn',
      })
    }

    return cards
  }, [apiKey, images.length, jobId, jobStatus, lastAction, latestResponse])

  const quickStats = useMemo(
    () => [
      { label: 'Backend', value: healthLabel },
      { label: 'Images', value: `${images.length}` },
      { label: 'Current Job', value: jobId || 'none' },
      { label: 'API Key', value: apiKey ? 'available' : 'missing' },
    ],
    [apiKey, healthLabel, images.length, jobId],
  )

  function showToast(message, type = 'info') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function request(path, options = {}) {
    const base = (backendUrl || '').trim() || 'http://localhost:3000'
    const url = `${base}${path}`
    const response = await fetch(url, options)
    const raw = await response.text()

    let data = raw
    try {
      data = raw ? JSON.parse(raw) : null
    } catch (_error) {
      data = raw
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      data,
    }
  }

  function updateResponse(label, response) {
    setLatestMeta(`${label} - ${response.url}`)
    setLatestResponse(response)

    const resultImages = extractImages(response)
    if (resultImages.length > 0) {
      setImages(resultImages)
      setActiveImageIndex(0)
    }
  }

  function getApiKeyOrThrow() {
    const key = apiKey.trim()
    if (!key) throw new Error('x-api-key is required for this route')
    return key
  }

  async function runAction(label, action) {
    try {
      setLoading(true)
      setLastAction(label)
      const result = await action()
      updateResponse(label, result)
      return result
    } catch (error) {
      const errorPayload = { error: error?.message || 'Unknown error' }
      setLatestMeta(`${label} - client error`)
      setLatestResponse(errorPayload)
      showToast(errorPayload.error, 'error')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function checkHealth() {
    if (!backendUrl.trim()) return

    setHealth((prev) => ({ ...prev, state: 'checking' }))
    try {
      const result = await request('/health')
      setHealth({
        state: result.ok ? 'up' : 'down',
        code: result.status,
        at: new Date().toLocaleTimeString(),
      })
    } catch (_error) {
      setHealth({ state: 'down', code: null, at: new Date().toLocaleTimeString() })
    }
  }

  useEffect(() => {
    const savedUrl = localStorage.getItem('backendUrl')
    const savedKey = localStorage.getItem('apiKey')

    if (savedUrl) {
      setBackendUrl(savedUrl)
    }
    if (savedKey) {
      setApiKey(savedKey)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('backendUrl', backendUrl)
  }, [backendUrl])

  useEffect(() => {
    localStorage.setItem('apiKey', apiKey)
  }, [apiKey])

  useEffect(() => {
    if (!backendUrl.trim()) return

    checkHealth()
    const timer = setInterval(checkHealth, 5000)
    return () => clearInterval(timer)
  }, [backendUrl])

  useEffect(() => {
    if (images.length <= 1) return

    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % images.length)
    }, 3500)

    return () => clearInterval(timer)
  }, [images])

  async function signIn() {
    const result = await runAction('POST /auth/sign-in', () =>
      request('/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      }),
    )

    const key = result?.data?.data?.apiKey
    if (key) {
      setApiKey(key)
      showToast('Signed in successfully', 'success')
    }
  }

  async function uploadSingleImage() {
    if (!imageFile) {
      showToast('Choose an image first', 'error')
      return
    }

    await runAction('POST /images/upload', async () => {
      const formData = new FormData()
      formData.append('image', imageFile)

      return request('/images/upload', {
        method: 'POST',
        headers: { 'x-api-key': getApiKeyOrThrow() },
        body: formData,
      })
    })
  }

  async function uploadMany(files) {
    if (!files || files.length === 0) {
      showToast('Choose one or more images first', 'error')
      return
    }

    if (files.length > 10) {
      showToast('You can upload up to 10 images', 'error')
      return
    }

    await runAction('POST /images/upload-many', async () => {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('images', file))

      return request('/images/upload-many', {
        method: 'POST',
        headers: { 'x-api-key': getApiKeyOrThrow() },
        body: formData,
      })
    })
  }

  async function fetchImages() {
    await runAction('GET /images', async () => {
      const params = new URLSearchParams()
      if (imagesLimit.trim()) params.set('limit', imagesLimit.trim())
      if (imagesCursor.trim()) params.set('nextCursor', imagesCursor.trim())

      const suffix = params.toString() ? `?${params.toString()}` : ''
      const result = await request(`/images${suffix}`, {
        headers: { 'x-api-key': getApiKeyOrThrow() },
      })

      const next = result?.data?.data?.nextCursor
      if (next) setImagesCursor(next)

      return result
    })
  }

  async function sendQuizzes() {
    await runAction('POST /quizzes/send', async () => {
      const parsed = JSON.parse(quizzes)

      const result = await request('/quizzes/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': getApiKeyOrThrow(),
        },
        body: JSON.stringify({ quizzes: parsed, delayMs: Number(delayMs) || 0 }),
      })

      const id = result?.data?.data?.jobId
      if (id) {
        setJobId(id)
        showToast('Quiz job queued', 'success')
      }

      return result
    })
  }

  async function checkJob() {
    const result = await runAction('GET /jobs/:id', () =>
      request(`/jobs/${encodeURIComponent(jobId.trim())}`, {
        headers: { 'x-api-key': getApiKeyOrThrow() },
      }),
    )

    if (result) {
      setJobStatus(result.data)
    }
  }

  function prevSlide() {
    if (!images.length) return
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  function nextSlide() {
    if (!images.length) return
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  function TabButton({ id, label }) {
    const active = activeTab === id
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={[
          'px-4 py-2 rounded-lg border text-sm font-semibold transition',
          active
            ? 'border-cyan-400/70 text-cyan-300 bg-cyan-500/10'
            : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500',
        ].join(' ')}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold gradient-text">Telegram Quiz Sender</h1>
            <p className="text-xs text-slate-400">Next.js panel for all backend routes</p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${statusClass(health.state)}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              <span className="font-semibold uppercase">{healthLabel}</span>
              <span className="text-[10px] opacity-80">{health.at || 'waiting'}</span>
            </div>
            <input
              type="text"
              placeholder="Backend URL"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
            />
            <input
              type="text"
              placeholder="x-api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-400/50 focus:ring"
            />
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap gap-2 p-3">
          <TabButton id="dashboard" label="Dashboard" />
          <TabButton id="auth" label="Auth" />
          <TabButton id="images" label="Images" />
          <TabButton id="quizzes" label="Quizzes" />
          <TabButton id="jobs" label="Jobs" />
        </div>
      </nav>

      <main className="mx-auto grid w-full max-w-7xl gap-5 p-5">
        {activeTab === 'dashboard' && (
          <section className="card">
            <h2 className="mb-3 text-lg font-semibold">Backend Health</h2>
            <p className="text-sm text-slate-300">
              Status: <span className="font-semibold text-cyan-300">{healthLabel}</span>
            </p>
            <p className="mt-2 text-xs text-slate-400">Checked every 5 seconds.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {quickStats.map((item) => (
                <article key={item.label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-cyan-300">{item.value}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'auth' && (
          <section className="card grid max-w-lg gap-3">
            <h2 className="text-lg font-semibold">Sign In</h2>
            <input
              type="text"
              placeholder="chatId"
              value={authData.chatId}
              onChange={(e) => setAuthData({ ...authData, chatId: e.target.value })}
              className="input"
            />
            <input
              type="text"
              placeholder="botToken"
              value={authData.botToken}
              onChange={(e) => setAuthData({ ...authData, botToken: e.target.value })}
              className="input"
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={authData.isChannel}
                onChange={(e) => setAuthData({ ...authData, isChannel: e.target.checked })}
              />
              <span>Is Channel</span>
            </label>
            <button type="button" onClick={signIn} className="button-primary" disabled={loading}>
              {loading ? 'Loading...' : 'Sign In'}
            </button>
          </section>
        )}

        {activeTab === 'images' && (
          <section className="grid gap-4">
            <div className="card grid gap-3">
              <h2 className="text-lg font-semibold">Images</h2>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={imagesLimit}
                  onChange={(e) => setImagesLimit(e.target.value)}
                  className="input"
                  placeholder="Limit"
                />
                <input
                  type="text"
                  value={imagesCursor}
                  onChange={(e) => setImagesCursor(e.target.value)}
                  className="input"
                  placeholder="nextCursor"
                />
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="input"
              />

              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={uploadSingleImage} className="button-primary" disabled={loading}>
                  Upload One
                </button>
                <label className="button-primary cursor-pointer text-center">
                  Upload Many
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => uploadMany(e.target.files)}
                    className="hidden"
                  />
                </label>
                <button type="button" onClick={fetchImages} className="button-primary" disabled={loading}>
                  Refresh Gallery
                </button>
              </div>
            </div>

            <div className="card grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold">Gallery Carousel</h3>
                <span className="text-xs text-slate-400">{images.length} items</span>
              </div>

              {activeImage ? (
                <div className="grid gap-2">
                  <div className="relative overflow-hidden rounded-xl border border-slate-700">
                    <img
                      src={activeImage.url || activeImage.secureUrl || activeImage.path}
                      alt={activeImage.publicId || 'uploaded image'}
                      className="h-[320px] w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={prevSlide} className="button-primary">Prev</button>
                    <p className="truncate text-xs text-slate-400">
                      {activeImage.publicId || activeImage.url || activeImage.secureUrl || activeImage.path}
                    </p>
                    <button type="button" onClick={nextSlide} className="button-primary">Next</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No images yet.</p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'quizzes' && (
          <section className="card grid gap-3">
            <h2 className="text-lg font-semibold">Send Quizzes</h2>
            <textarea
              value={quizzes}
              onChange={(e) => setQuizzes(e.target.value)}
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
              onChange={(e) => setDelayMs(Number(e.target.value))}
              className="w-full"
            />
            <button type="button" onClick={sendQuizzes} className="button-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Quizzes'}
            </button>
          </section>
        )}

        {activeTab === 'jobs' && (
          <section className="card grid gap-3">
            <h2 className="text-lg font-semibold">Job Status</h2>
            <input
              type="text"
              placeholder="Job ID"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="input"
            />
            <button type="button" onClick={checkJob} className="button-primary" disabled={loading || !jobId.trim()}>
              Check Job
            </button>
            {jobStatus && (
              <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
                {asPretty(jobStatus)}
              </pre>
            )}
          </section>
        )}

        <section className="card">
          <h2 className="mb-3 text-lg font-semibold">Action Insights</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((item, index) => (
              <article
                key={`${item.title}-${index}`}
                className={[
                  'rounded-xl border p-3 text-sm',
                  item.tone === 'good'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                    : item.tone === 'warn'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                      : 'border-slate-700 bg-slate-900/60 text-slate-200',
                ].join(' ')}
              >
                <p className="text-[11px] uppercase tracking-wide opacity-75">{item.title}</p>
                <p className="mt-1 break-all font-medium">{item.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 text-lg font-semibold">Latest Response</h2>
          <p className="mb-3 text-xs text-slate-400">{latestMeta}</p>
          <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs">
            {asPretty(latestResponse)}
          </pre>
        </section>
      </main>

      {toast && (
        <div
          className={[
            'fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg toast',
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
