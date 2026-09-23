import { X } from 'lucide-react'

export interface GridImage {
  thumbUrl: string
  originalUrl: string
  width?: number
  height?: number
}

interface ImageGridProps {
  images: GridImage[]
  onRemove?: (index: number) => void
  editable?: boolean
}

export function ImageGrid({ images, onRemove, editable = false }: ImageGridProps) {
  if (!images.length) return null

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {images.map((img, idx) => (
        <a
          key={idx}
          href={img.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-lg bg-muted aspect-square"
          title="点击查看原图（新标签页）"
        >
          <img
            src={img.thumbUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
          {editable && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRemove(idx)
              }}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </a>
      ))}
    </div>
  )
}
