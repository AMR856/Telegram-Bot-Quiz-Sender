import { useState, useCallback } from 'react'
import { Toast } from '@/types'
import { TOAST_DURATION } from '@/lib/constants'

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  const show = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      setToast({ message, type })
      setTimeout(() => setToast(null), TOAST_DURATION)
    },
    [],
  )

  const success = useCallback((message: string) => show(message, 'success'), [show])
  const error = useCallback((message: string) => show(message, 'error'), [show])
  const info = useCallback((message: string) => show(message, 'info'), [show])

  return {
    toast,
    show,
    success,
    error,
    info,
  }
}