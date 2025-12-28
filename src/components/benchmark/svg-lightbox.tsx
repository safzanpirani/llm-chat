import { useEffect, useCallback } from 'react'
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SVGRenderer } from './svg-renderer'
import { MODEL_LIST, type ModelId } from '@/lib/models'

interface SVGLightboxProps {
  isOpen: boolean
  onClose: () => void
  svgContent: string
  modelId: ModelId
  promptName: string
  duration?: number
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export function SVGLightbox({
  isOpen,
  onClose,
  svgContent,
  modelId,
  promptName,
  duration,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: SVGLightboxProps) {
  const model = MODEL_LIST.find(m => m.id === modelId)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) onPrevious()
    if (e.key === 'ArrowRight' && hasNext && onNext) onNext()
  }, [onClose, onPrevious, onNext, hasPrevious, hasNext])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, handleKeyDown])

  const downloadSVG = useCallback(() => {
    const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/i)
    if (!svgMatch) return

    const blob = new Blob([svgMatch[0]], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${promptName}-${modelId}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [svgContent, promptName, modelId])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <span className={`h-3 w-3 rounded-full ${
            model?.provider === 'anthropic' ? 'bg-orange-500' : 'bg-blue-500'
          }`} />
          <span className="font-medium">{model?.name}</span>
          {duration && (
            <span className="text-white/60">• {(duration / 1000).toFixed(2)}s</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={downloadSVG} className="text-white hover:bg-white/20">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {hasPrevious && onPrevious && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onPrevious() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {hasNext && onNext && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onNext() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      <div 
        className="max-w-[90vw] max-h-[85vh] bg-white rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <SVGRenderer
          svgContent={svgContent}
          className="w-full h-full min-w-[60vw] min-h-[60vh]"
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Click outside or press ESC to close • Arrow keys to navigate
      </div>
    </div>
  )
}
