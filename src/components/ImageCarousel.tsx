'use client'

import { ImageData } from '@/types'
import { IMAGE_HEIGHT_CLASS } from '@/lib/constants'

interface ImageCarouselProps {
  activeImage: ImageData | null
  totalImages: number
  onPrev: () => void
  onNext: () => void
}

export function ImageCarousel({
  activeImage,
  totalImages,
  onPrev,
  onNext,
}: ImageCarouselProps) {
  if (!activeImage) {
    return <p className="text-sm text-slate-400">No images yet.</p>
  }

  const imageUrl = activeImage.url || activeImage.secureUrl || activeImage.path
  const imageAlt = activeImage.originalName || activeImage.publicId || 'uploaded image'
  const imageLabel =
    activeImage.originalName ||
    activeImage.publicId ||
    activeImage.url ||
    activeImage.secureUrl ||
    activeImage.path

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-xl border border-slate-700">
        <img
          src={imageUrl}
          alt={imageAlt}
          className={`${IMAGE_HEIGHT_CLASS} w-full bg-slate-950 object-contain`}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onPrev} className="button-primary">
          Prev
        </button>
        <p className="truncate text-xs text-slate-400">{imageLabel}</p>
        <button type="button" onClick={onNext} className="button-primary">
          Next
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        {totalImages > 0 ? `Viewing images` : 'No images'}
      </p>
    </div>
  )
}