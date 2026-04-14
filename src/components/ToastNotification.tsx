'use client'

import { Toast } from '@/types'

interface ToastProps {
  toast: Toast | null
}

export function ToastNotification({ toast }: ToastProps) {
  if (!toast) return null

  const bgColor = toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'

  return (
    <div
      className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${bgColor}`}
    >
      {toast.message}
    </div>
  )
}