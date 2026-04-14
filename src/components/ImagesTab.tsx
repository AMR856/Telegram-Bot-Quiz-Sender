'use client'

import { ImageData } from '@/types'
import { ImageCarousel } from './ImageCarousel'

interface ImagesTabProps {
  imagesLimit: string
  imagesCursor: string
  imageFile: File | null
  images: ImageData[]
  activeImage: ImageData | null
  loading: boolean
  onImagesLimitChange: (value: string) => void
  onImagesCursorChange: (value: string) => void
  onImageFileChange: (file: File | null) => void
  onUploadSingle: () => void
  onUploadMany: (files: FileList) => void
  onFetchImages: () => void
  onDeleteActiveImage: () => void
  onCarouselPrev: () => void
  onCarouselNext: () => void
}

export function ImagesTab({
  imagesLimit,
  imagesCursor,
  imageFile,
  images,
  activeImage,
  loading,
  onImagesLimitChange,
  onImagesCursorChange,
  onImageFileChange,
  onUploadSingle,
  onUploadMany,
  onFetchImages,
  onDeleteActiveImage,
  onCarouselPrev,
  onCarouselNext,
}: ImagesTabProps) {
  return (
    <section className="grid gap-4">
      <div className="card grid gap-3">
        <h2 className="text-lg font-semibold">Images</h2>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="number"
            min="1"
            max="100"
            value={imagesLimit}
            onChange={(e) => onImagesLimitChange(e.target.value)}
            className="input"
            placeholder="Limit"
          />
          <input
            type="text"
            value={imagesCursor}
            onChange={(e) => onImagesCursorChange(e.target.value)}
            className="input"
            placeholder="nextCursor"
          />
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => onImageFileChange(e.target.files?.[0] || null)}
          className="input"
        />

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={onUploadSingle}
            className="button-primary"
            disabled={loading}
          >
            Upload One
          </button>
          <label className="button-primary cursor-pointer text-center">
            Upload Many
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => onUploadMany(e.target.files!)}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={onFetchImages}
            className="button-primary"
            disabled={loading}
          >
            Get Images
          </button>
          <button
            type="button"
            onClick={onDeleteActiveImage}
            className="button-primary"
            disabled={loading || !activeImage?.publicId}
          >
            Delete Active
          </button>
        </div>
      </div>

      <div className="card grid gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-semibold">Gallery Carousel</h3>
          <span className="text-xs text-slate-400">{images.length} items</span>
        </div>

        <ImageCarousel
          activeImage={activeImage}
          totalImages={images.length}
          onPrev={onCarouselPrev}
          onNext={onCarouselNext}
        />
      </div>
    </section>
  )
}