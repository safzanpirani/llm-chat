import { cn } from '@/lib/utils'
import { ChatMessage } from './chat-message'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Message, GeneratedImage } from '@/lib/storage'

export const VARIATION_BORDER_COLORS: Record<number, string> = {
  0: 'border-l-[hsl(var(--variation-1))]',
  1: 'border-l-[hsl(var(--variation-2))]',
  2: 'border-l-[hsl(var(--variation-3))]',
  3: 'border-l-[hsl(var(--variation-4))]',
}

export const VARIATION_RING_COLORS: Record<number, string> = {
  0: 'ring-[hsl(var(--variation-1))]',
  1: 'ring-[hsl(var(--variation-2))]',
  2: 'ring-[hsl(var(--variation-3))]',
  3: 'ring-[hsl(var(--variation-4))]',
}

interface StreamingVariation {
  content: string
  thinking: string
  images: GeneratedImage[]
  retryIn: number | null
  error: string | null
}

interface VariationGroupProps {
  variations: Message[]
  activeIndex: number
  onSelectVariation: (index: number) => void
  isStreaming?: boolean
  streamingVariations?: StreamingVariation[]
  modelName?: string
  onEdit?: (variationIndex: number, newContent: string) => void
  onRetry?: (variationIndex: number) => void
  onSaveAndRegenerate?: (variationIndex: number, newContent: string) => void
  onDelete?: () => void
  retryingVariationIndex?: number
  retryingVariationHasToken?: boolean
}

export function VariationGroup({
  variations,
  activeIndex,
  onSelectVariation,
  isStreaming,
  streamingVariations,
  modelName,
  onEdit,
  onRetry,
  onSaveAndRegenerate,
  onDelete,
  retryingVariationIndex,
  retryingVariationHasToken,
}: VariationGroupProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const count = isStreaming && streamingVariations 
    ? streamingVariations.length 
    : variations.length

  if (count === 0) return null

  return (
    <div className="relative group">
      {onDelete && !isStreaming && (
        <div className="absolute -top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background border shadow-lg">
              <span className="text-xs text-destructive">Delete all variations?</span>
              <button
                onClick={() => {
                  onDelete()
                  setShowDeleteConfirm(false)
                }}
                className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg bg-background border shadow-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete all variations"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      
      <div className={cn(
        'grid gap-3',
        count === 1 && 'grid-cols-1',
        count === 2 && 'grid-cols-1 lg:grid-cols-2',
        count === 3 && 'grid-cols-1 lg:grid-cols-3',
        count === 4 && 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
      )}>
        {isStreaming && streamingVariations ? (
          streamingVariations.map((sv, index) => (
            <div
              key={index}
              className={cn(
                'relative cursor-pointer rounded-lg transition-all min-w-0',
                activeIndex === index && 'ring-2 ring-offset-2 ring-offset-background',
                activeIndex === index && VARIATION_RING_COLORS[index],
                activeIndex !== index && 'opacity-70 hover:opacity-90',
                sv.retryIn !== null && 'opacity-60'
              )}
              onClick={() => onSelectVariation(index)}
            >
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border text-xs font-medium">
                <div className={cn(
                  'h-2 w-2 rounded-full',
                  `bg-[hsl(var(--variation-${index + 1}))]`
                )} />
                <span>#{index + 1}</span>
              </div>
              
              {sv.retryIn !== null && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <RotateCcw className="h-5 w-5 text-muted-foreground animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Rate limited. Retrying in {sv.retryIn}s...
                    </span>
                  </div>
                </div>
              )}
              
              {sv.error && !sv.retryIn && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-destructive/10 backdrop-blur-sm rounded-lg">
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <span className="text-sm text-destructive font-medium">
                      {sv.error}
                    </span>
                  </div>
                </div>
              )}
              
              <ChatMessage
                role="assistant"
                content={sv.content}
                thinking={sv.thinking}
                generatedImages={sv.images}
                isStreaming
                modelName={modelName}
                variationIndex={index}
              />
            </div>
          ))
        ) : (
          variations.map((variation, index) => {
            const isRetrying = retryingVariationIndex === index
            const showRetryOverlay = isRetrying && !retryingVariationHasToken
            return (
              <div
                key={variation.id}
                className={cn(
                  'relative cursor-pointer rounded-lg transition-all min-w-0',
                  activeIndex === index && 'ring-2 ring-offset-2 ring-offset-background',
                  activeIndex === index && VARIATION_RING_COLORS[index],
                  activeIndex !== index && 'opacity-70 hover:opacity-90',
                  isRetrying && 'opacity-60'
                )}
                onClick={() => onSelectVariation(index)}
              >
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border text-xs font-medium">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    `bg-[hsl(var(--variation-${index + 1}))]`
                  )} />
                  <span>#{index + 1}</span>
                </div>
                {showRetryOverlay && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <RotateCcw className="h-5 w-5 text-muted-foreground animate-spin" />
                      <span className="text-sm text-muted-foreground">Regenerating...</span>
                    </div>
                  </div>
                )}
                <ChatMessage
                  role="assistant"
                  content={variation.content}
                  thinking={variation.thinking}
                  generatedImages={variation.generatedImages}
                  modelName={variation.model || modelName}
                  variationIndex={index}
                  isStreaming={isRetrying}
                  onEdit={onEdit ? (content) => onEdit(index, content) : undefined}
                  onRetry={onRetry && activeIndex === index && !isRetrying ? () => onRetry(index) : undefined}
                  onSaveAndRegenerate={onSaveAndRegenerate ? (content) => onSaveAndRegenerate(index, content) : undefined}
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
