import { useEffect, useState, useMemo, useCallback } from 'react'
import { AuthPayload, ApiResponse, ImageData, InsightCard, QuickStat } from '@/types'
import { apiClient } from '@/lib/api-client'
import {
  extractImages,
  buildQueryString,
  maskApiKey,
  getHealthLabel,
  encodeId,
} from '@/lib/utils'
import {
  SAMPLE_QUIZ_JSON,
  DEFAULT_BACKEND_URL,
  DEFAULT_IMAGES_LIMIT,
  DEFAULT_DELAY_MS,
  DEFAULT_RETRY_WRONG_AFTER_MINUTES,
  TAB_IDS,
} from '@/lib/constants'
import { useHealthCheck } from './useHealthCheck'
import { useImageCarousel } from './useImageCarousel'
import { useToast } from './useToast'
import { useLocalStorage } from './useLocalStorage'

type TabId = (typeof TAB_IDS)[keyof typeof TAB_IDS]
type ApiDataEnvelope = { data?: Record<string, unknown> }

export function useAppState() {
  const [backendUrl, setBackendUrl] = useLocalStorage('backendUrl', DEFAULT_BACKEND_URL)
  const [apiKey, setApiKey] = useLocalStorage('apiKey', '')

  const [activeTab, setActiveTab] = useState<TabId>(TAB_IDS.DASHBOARD)
  const [loading, setLoading] = useState(false)

  const [authData, setAuthData] = useState<AuthPayload>({
    chatId: '',
    botToken: '',
    isChannel: true,
  })

  const [imagesLimit, setImagesLimit] = useState(DEFAULT_IMAGES_LIMIT)
  const [imagesCursor, setImagesCursor] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [images, setImages] = useState<ImageData[]>([])

  const [quizzes, setQuizzes] = useState(SAMPLE_QUIZ_JSON)
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS)
  const [retryWrongAfterMinutes, setRetryWrongAfterMinutes] = useState(
    DEFAULT_RETRY_WRONG_AFTER_MINUTES,
  )
  const [jobId, setJobId] = useState('')

  const [lastAction, setLastAction] = useState('none')
  const [latestResponse, setLatestResponse] = useState<unknown>({
    message: 'Run an action to see details',
  })
  const [latestMeta, setLatestMeta] = useState('Ready')
  const [jobStatus, setJobStatus] = useState<unknown>(null)

  const health = useHealthCheck(backendUrl)
  const imageCarousel = useImageCarousel(images)
  const toast = useToast()

  useEffect(() => {
    apiClient.setBaseUrl(backendUrl)
  }, [backendUrl])

  const healthLabel = useMemo(() => getHealthLabel(health), [health])

  const getApiKeyOrThrow = useCallback(() => {
    const key = apiKey.trim()
    if (!key) throw new Error('x-api-key is required for this route')
    return key
  }, [apiKey])

  const updateResponse = useCallback(
    (label: string, response: ApiResponse<unknown>) => {
      setLatestMeta(`${label} - ${response.url}`)
      setLatestResponse(response)

      const resultImages = extractImages(response.data as Record<string, unknown>)
      setImages(resultImages)
      imageCarousel.setActiveIndex(0)
    },
    [imageCarousel],
  )

  const runAction = useCallback(
    async (label: string, action: () => Promise<ApiResponse<unknown>>) => {
      try {
        setLoading(true)
        setLastAction(label)
        const result = await action()
        updateResponse(label, result)
        return result
      } catch (error) {
        const errorPayload = {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        setLatestMeta(`${label} - client error`)
        setLatestResponse(errorPayload)
        toast.error(errorPayload.error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [updateResponse, toast],
  )

  const signIn = useCallback(async () => {
    const result = await runAction('POST /auth/sign-in', () =>
      apiClient.post('/auth/sign-in', JSON.stringify(authData), {
        'Content-Type': 'application/json',
      }),
    )

    const resultData = result?.data as ApiDataEnvelope | undefined
    const key = resultData?.data?.apiKey
    if (key) {
      setApiKey(String(key))
      toast.success('Signed in successfully')
    }
  }, [authData, runAction, toast, setApiKey])

  const uploadSingleImage = useCallback(async () => {
    if (!imageFile) {
      toast.error('Choose an image first')
      return
    }

    await runAction('POST /images/upload', async () => {
      const formData = new FormData()
      formData.append('file', imageFile)

      return apiClient.post('/images/upload', formData, {
        'x-api-key': getApiKeyOrThrow(),
      })
    })
  }, [imageFile, runAction, toast, getApiKeyOrThrow])

  const uploadMany = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0) {
        toast.error('Choose one or more images first')
        return
      }

      if (files.length > 10) {
        toast.error('You can upload up to 10 images')
        return
      }

      await runAction('POST /images/upload-many', async () => {
        const formData = new FormData()
        Array.from(files).forEach((file) => formData.append('files', file))

        return apiClient.post('/images/upload-many', formData, {
          'x-api-key': getApiKeyOrThrow(),
        })
      })
    },
    [runAction, toast, getApiKeyOrThrow],
  )

  const fetchImages = useCallback(async () => {
    await runAction('GET /images (all pages)', async () => {
      const requestedLimit = Number(imagesLimit)
      const pageLimit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(100, requestedLimit))
        : 30

      const allImages: ImageData[] = []
      let nextCursor: string | undefined = imagesCursor.trim() || undefined
      let lastResult: ApiResponse<unknown> | null = null
      let pages = 0

      do {
        const suffix = buildQueryString({
          limit: pageLimit,
          nextCursor,
        })

        const result = await apiClient.get(`/images${suffix}`, {
          'x-api-key': getApiKeyOrThrow(),
        })

        lastResult = result
        allImages.push(...extractImages(result.data as Record<string, unknown>))

        const resultData = result.data as ApiDataEnvelope
        const rawNext = resultData.data?.nextCursor
        nextCursor = typeof rawNext === 'string' && rawNext.trim() ? rawNext : undefined
        pages += 1
      } while (nextCursor && pages < 50)

      setImagesCursor('')

      if (!lastResult) {
        throw new Error('Failed to fetch images')
      }

      const payload = (lastResult.data as Record<string, unknown>) || {}
      const envelope = (payload.data as Record<string, unknown>) || {}

      return {
        ...lastResult,
        data: {
          ...payload,
          data: {
            ...envelope,
            images: allImages,
            count: allImages.length,
            nextCursor: null,
          },
        },
      }
    })
  }, [imagesLimit, imagesCursor, runAction, getApiKeyOrThrow])

  const deleteActiveImage = useCallback(async () => {
    const publicId = imageCarousel.activeImage?.publicId?.trim()

    if (!publicId) {
      toast.error('No active image selected')
      return
    }

    const result = await runAction('DELETE /images/:publicId', () =>
      apiClient.request(`/images/${encodeId(publicId)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': getApiKeyOrThrow(),
        },
      }),
    )

    if (result?.ok) {
      setImages((prev) => prev.filter((item) => item.publicId !== publicId))
      imageCarousel.setActiveIndex(0)
      setImagesCursor('')
      toast.success('Image deleted')
    }
  }, [imageCarousel, runAction, toast, getApiKeyOrThrow])

  const sendQuizzes = useCallback(async () => {
    await runAction('POST /quizzes/send', async () => {
      const parsed = JSON.parse(quizzes)

      const result = await apiClient.post(
        '/quizzes/send',
        JSON.stringify({
          quizzes: parsed,
          delayMs: Number(delayMs) || 0,
          retryWrongAfterMinutes: Math.max(0, Number(retryWrongAfterMinutes) || 0),
        }),
        {
          'Content-Type': 'application/json',
          'x-api-key': getApiKeyOrThrow(),
        },
      )

      const resultData = result.data as ApiDataEnvelope
      const id = resultData.data?.jobId
      if (id) {
        setJobId(String(id))
        toast.success('Quiz job queued')
      }

      return result
    })
  }, [quizzes, delayMs, retryWrongAfterMinutes, runAction, toast, getApiKeyOrThrow])

  const checkJob = useCallback(async () => {
    const result = await runAction('GET /jobs/:id', () =>
      apiClient.get(`/jobs/${encodeId(jobId)}`, {
        'x-api-key': getApiKeyOrThrow(),
      }),
    )

    if (result) {
      setJobStatus(result.data)
    }
  }, [jobId, runAction, getApiKeyOrThrow])

  const insights = useMemo((): InsightCard[] => {
    const cards: InsightCard[] = []
    const latest = latestResponse as Record<string, unknown>
    const status = latest?.status
    const payload = (latest?.data as ApiDataEnvelope | undefined)?.data

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
      value: apiKey ? maskApiKey(apiKey) : 'not set',
      tone: apiKey ? 'good' : 'warn',
    })

    if (lastAction.includes('/auth/sign-in') && (payload as Record<string, unknown>)?.apiKey) {
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

      if ((payload as Record<string, unknown>)?.nextCursor) {
        cards.push({
          title: 'Next Cursor',
          value: String((payload as Record<string, unknown>)?.nextCursor),
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

    if (lastAction.includes('/jobs/:id') && (jobStatus as Record<string, unknown>)?.data) {
      const state =
        ((jobStatus as Record<string, unknown>)?.data as Record<string, unknown>)?.state ||
        ((jobStatus as Record<string, unknown>)?.data as Record<string, unknown>)?.status ||
        'unknown'
      cards.push({
        title: 'Job State',
        value: String(state),
        tone: state === 'completed' ? 'good' : 'neutral',
      })
    }

    if ((latestResponse as Record<string, unknown>)?.error) {
      cards.push({
        title: 'Error',
        value: String((latestResponse as Record<string, unknown>)?.error),
        tone: 'warn',
      })
    }

    return cards
  }, [apiKey, images.length, jobId, jobStatus, lastAction, latestResponse])

  const quickStats = useMemo((): QuickStat[] => {
    return [
      { label: 'Backend', value: healthLabel },
      { label: 'Images', value: `${images.length}` },
      { label: 'Current Job', value: jobId || 'none' },
      { label: 'API Key', value: apiKey ? 'available' : 'missing' },
    ]
  }, [apiKey, healthLabel, images.length, jobId])

  return {
    activeTab,
    setActiveTab,
    loading,

    backendUrl,
    setBackendUrl,
    apiKey,
    setApiKey,

    authData,
    setAuthData,
    signIn,

    imagesLimit,
    setImagesLimit,
    imagesCursor,
    setImagesCursor,
    imageFile,
    setImageFile,
    images,
    setImages,
    uploadSingleImage,
    uploadMany,
    fetchImages,
    deleteActiveImage,
    ...imageCarousel,

    quizzes,
    setQuizzes,
    delayMs,
    setDelayMs,
    retryWrongAfterMinutes,
    setRetryWrongAfterMinutes,
    jobId,
    setJobId,
    sendQuizzes,
    checkJob,
    jobStatus,

    lastAction,
    latestResponse,
    latestMeta,
    health,
    healthLabel,
    insights,
    quickStats,

    ...toast,
  }
}
