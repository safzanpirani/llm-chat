import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Streamdown } from 'streamdown'
import { User, Bot, Copy, Check, Pencil, FileText, ChevronDown, ChevronRight, ChevronLeft, Brain, Download, RotateCcw, Trash2, Plus, RefreshCw } from 'lucide-react'
import { Lightbox } from '@/components/ui/lightbox'
import type { GeneratedImage } from '@/lib/storage'

const VARIATION_ACCENT_COLORS: Record<number, string> = {
  0: 'border-l-[hsl(var(--variation-1))]',
  1: 'border-l-[hsl(var(--variation-2))]',
  2: 'border-l-[hsl(var(--variation-3))]',
  3: 'border-l-[hsl(var(--variation-4))]',
}

interface Attachment {
  type: 'image' | 'document'
  name: string
  data: string
  mimeType: string
}

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  attachments?: Attachment[]
  generatedImages?: GeneratedImage[]
  isStreaming?: boolean
  modelName?: string
  siblingCount?: number
  siblingIndex?: number
  variationIndex?: number
  isPrefill?: boolean
  originalPrefill?: string
  onEdit?: (newContent: string) => void
  onRetry?: () => void
  onReprefill?: () => void
  onNavigateSibling?: (direction: 'prev' | 'next') => void
  onDelete?: () => void
  onAddBefore?: (role: 'user' | 'assistant') => void
  onSaveAndRegenerate?: (newContent: string) => void
}

export function ChatMessage({ 
  role, 
  content, 
  thinking, 
  attachments, 
  generatedImages, 
  isStreaming, 
  modelName, 
  siblingCount = 1,
  siblingIndex = 0,
  variationIndex,
  isPrefill,
  originalPrefill,
  onEdit,
  onRetry,
  onReprefill,
  onNavigateSibling,
  onDelete,
  onAddBefore,
  onSaveAndRegenerate,
}: ChatMessageProps) {
  const isUser = role === 'user'
  const [isCopied, setIsCopied] = useState(false)
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isClaudeModel = modelName?.toLowerCase().includes('claude')
  
  const isInVariationGroup = variationIndex !== undefined && variationIndex >= 0
  const accentColor = isInVariationGroup
    ? VARIATION_ACCENT_COLORS[variationIndex] || VARIATION_ACCENT_COLORS[0]
    : isUser 
      ? 'border-l-yellow-500' 
      : isClaudeModel 
        ? 'border-l-orange-500' 
        : 'border-l-blue-500'

  const hasSiblings = siblingCount > 1

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [isEditing])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleStartEdit = () => {
    setEditContent(content)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(content)
  }

  const handleSaveEdit = () => {
    if (editContent.trim() !== content) {
      onEdit?.(editContent.trim())
    }
    setIsEditing(false)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (editContent.trim() !== content) {
        onSaveAndRegenerate?.(editContent.trim())
      } else {
        onRetry?.()
      }
      setIsEditing(false)
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
  }

  return (
    <div
      className={cn(
        'group flex gap-2 md:gap-3 px-2 md:px-4 py-4 md:py-6 border-l-4',
        isUser ? 'bg-background' : 'bg-muted/50',
        accentColor
      )}
    >
      <div
        className={cn(
          'hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold select-none">
              {isUser ? 'You' : modelName || 'Assistant'}
            </span>
            {hasSiblings && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  onClick={() => onNavigateSibling?.('prev')}
                  disabled={siblingIndex === 0}
                  className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span>{siblingIndex + 1}/{siblingCount}</span>
                <button
                  onClick={() => onNavigateSibling?.('next')}
                  disabled={siblingIndex === siblingCount - 1}
                  className="p-0.5 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          {!isStreaming && !isEditing && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                onClick={() => onAddBefore?.(isUser ? 'user' : 'assistant')}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-background/50"
                title="Add message before"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleStartEdit}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-background/50"
                title="Edit message"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {!isUser && onRetry && (
                <button
                  onClick={onRetry}
                  className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-background/50"
                  title="Retry"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              {!isUser && isPrefill && onReprefill && (
                <button
                  onClick={onReprefill}
                  className="p-1 text-violet-500 hover:text-violet-400 rounded hover:bg-background/50"
                  title="Continue again (regenerate prefill)"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleCopy}
                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-background/50"
                title="Copy message"
              >
                {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-background/50"
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="text-sm text-destructive">Delete this message?</span>
            <button
              onClick={() => {
                onDelete?.()
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
        )}

        {thinking && (
          <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              {isThinkingExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Brain className="h-4 w-4" />
              <span className="font-medium">Thinking</span>
              {isStreaming && !content && (
                <span className="ml-auto text-xs animate-pulse">thinking...</span>
              )}
            </button>
            {isThinkingExpanded && (
              <div className="px-3 pb-3 pt-1 text-sm text-muted-foreground border-t border-border/30">
                <div className="prose prose-sm dark:prose-invert max-w-none opacity-80">
                  <Streamdown>{thinking}</Streamdown>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {attachments && attachments.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="group relative">
                  {file.type === 'image' ? (
                    <div className="relative overflow-hidden rounded-lg border bg-muted/30 transition-all hover:bg-muted/50">
                      <img 
                        src={file.data} 
                        alt={file.name} 
                        className="max-h-[300px] max-w-full rounded-lg object-contain" 
                      />
                    </div>
                  ) : (
                    <a 
                      href={file.data} 
                      download={file.name}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="truncate text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">PDF Document</span>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onKeyDown={handleEditKeyDown}
                className="w-full min-h-[60px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80"
                >
                  Cancel
                </button>
                <span className="ml-auto text-xs text-muted-foreground self-center">
                  Enter to save, {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to save & regenerate
                </span>
              </div>
            </div>
          ) : (
            <>
              {(isStreaming || !isUser) ? (
                <Streamdown>{content}</Streamdown>
              ) : (
                <p className="whitespace-pre-wrap">{content}</p>
              )}
            </>
          )}
          
          {generatedImages && generatedImages.length > 0 && !isEditing && (
            <div className="mt-4 flex flex-wrap gap-3">
              {generatedImages.map((img, i) => (
                <div key={i} className="group relative">
                  <div 
                    className="relative overflow-hidden rounded-lg border-2 border-primary/20 bg-muted/30 transition-all hover:border-primary/50 cursor-pointer"
                    onClick={() => setLightboxImage(img)}
                  >
                    <img 
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={`Generated image ${i + 1}`}
                      className="max-h-[400px] max-w-full rounded-lg object-contain" 
                    />
                    <a
                      href={`data:${img.mimeType};base64,${img.data}`}
                      download={`generated-${Date.now()}-${i}.png`}
                      className="absolute bottom-2 right-2 p-2 bg-background/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                      title="Download image"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {lightboxImage && (
        <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  )
}
