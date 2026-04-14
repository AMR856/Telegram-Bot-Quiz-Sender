import { useState, useEffect } from 'react'
import { ImageData } from '@/types'

export function useImageCarousel(images: ImageData[]) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (images.length === 0) {
      setActiveIndex(0)
      return
    }

    setActiveIndex((prev) => Math.min(prev, images.length - 1))
  }, [images.length])

  const prev = () => {
    if (!images.length) return
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const next = () => {
    if (!images.length) return
    setActiveIndex((prev) => (prev + 1) % images.length)
  }

  return {
    activeIndex,
    setActiveIndex,
    prev,
    next,
    activeImage: images[activeIndex] || null,
  }
}