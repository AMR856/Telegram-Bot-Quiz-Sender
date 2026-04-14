import React, { useEffect, useState } from 'react'
import { getLocalStorage, setLocalStorage } from '@/lib/utils'

export function useLocalStorage(
  key: string,
  initialValue: string,
): [string, (value: string) => void] {
  const [value, setValue] = useState<string>(initialValue)

  useEffect(() => {
    const stored = getLocalStorage(key)
    if (stored) {
      setValue(stored)
    }
  }, [key])

  useEffect(() => {
    setLocalStorage(key, value)
  }, [key, value])

  return [value, setValue]
}