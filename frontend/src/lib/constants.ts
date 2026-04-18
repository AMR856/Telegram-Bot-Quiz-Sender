import { QuizQuestion } from '@/types'

export const SAMPLE_QUIZ: QuizQuestion[] = [
  {
    question: 'What color is the Telegram logo?',
    options: ['Blue', 'Red', 'Green', 'Orange'],
    correctAnswerId: 0,
    explanation: 'Telegram branding uses blue tones.',
  },
]

export const SAMPLE_QUIZ_JSON = JSON.stringify(SAMPLE_QUIZ, null, 2)

export const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:3000'
export const DEFAULT_IMAGES_LIMIT = '30'
export const DEFAULT_DELAY_MS = 1000
export const DEFAULT_RETRY_WRONG_AFTER_MINUTES = 0
export const IMAGE_CAROUSEL_INTERVAL = 3500
export const TOAST_DURATION = 3000
export const MAX_UPLOAD_FILES = 10
export const IMAGE_HEIGHT_CLASS = 'h-[320px]'

export const TAB_IDS = {
  DASHBOARD: 'dashboard',
  AUTH: 'auth',
  IMAGES: 'images',
  QUIZZES: 'quizzes',
  JOBS: 'jobs',
} as const

export const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
} as const