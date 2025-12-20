import { useEffect, useCallback } from 'react'
import { X, Download, Clock, Maximize2, Image as ImageIcon, FileText } from 'lucide-react'
import type { GeneratedImage } from '@/lib/storage'

interface LightboxProps {
  image: GeneratedImage
  onClose: () => void
}

export function Lightbox({ image, onClose }: LightboxProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const imageSrc = `data:${image.mimeType};base64,${image.data}`

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex max-h-[90vh] max-w-[90vw] gap-6">
        <div className="flex items-center justify-center">
          <img
            src={imageSrc}
            alt="Generated image"
            className="max-h-[85vh] max-w-[60vw] object-contain rounded-lg shadow-2xl"
          />
        </div>

        <div className="flex flex-col gap-4 w-80 bg-background/95 rounded-lg p-5 overflow-y-auto">
          <h3 className="text-lg font-semibold border-b pb-2">Image Details</h3>
          
          {image.generationTimeMs && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Generation Time</p>
                <p className="text-sm text-muted-foreground">
                  {(image.generationTimeMs / 1000).toFixed(2)}s
                </p>
              </div>
            </div>
          )}

          {image.aspectRatio && (
            <div className="flex items-start gap-3">
              <Maximize2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Aspect Ratio</p>
                <p className="text-sm text-muted-foreground">{image.aspectRatio}</p>
              </div>
            </div>
          )}

          {image.resolution && (
            <div className="flex items-start gap-3">
              <ImageIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Resolution</p>
                <p className="text-sm text-muted-foreground">{image.resolution}</p>
              </div>
            </div>
          )}

          {image.prompt && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Prompt</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {image.prompt}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto pt-4 border-t">
            <a
              href={imageSrc}
              download={`generated-${Date.now()}.${image.mimeType.split('/')[1] || 'png'}`}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
