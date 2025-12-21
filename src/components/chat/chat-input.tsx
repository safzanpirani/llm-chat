import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Square, Paperclip, X, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChatInputHandle {
  setValue: (value: string) => void
  focus: () => void
  addFiles: (files: FileList | File[]) => Promise<void>
}

export interface Attachment {
  type: 'image' | 'document'
  name: string
  data: string
  mimeType: string
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
}

const MAX_HEIGHT = 400

async function fileToAttachment(file: File): Promise<Attachment> {
  const isImage = file.type.startsWith('image/')
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
  return {
    type: isImage ? 'image' : 'document',
    name: file.name || `pasted-${Date.now()}`,
    data: base64,
    mimeType: file.type,
  }
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  ({ onSend, onStop, isLoading, disabled }, ref) => {
    const [input, setInput] = useState('')
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => ({
      setValue: (value: string) => {
        setInput(value)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_HEIGHT)}px`
          }
        }, 0)
      },
      focus: () => {
        textareaRef.current?.focus()
      },
      addFiles: async (files: FileList | File[]) => {
        const fileArray = Array.from(files)
        const newAttachments = await Promise.all(fileArray.map(fileToAttachment))
        setAttachments(prev => [...prev, ...newAttachments])
      }
    }))

    const addFiles = async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const newAttachments = await Promise.all(fileArray.map(fileToAttachment))
      setAttachments(prev => [...prev, ...newAttachments])
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        await addFiles(e.target.files)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) imageFiles.push(file)
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault()
        await addFiles(imageFiles)
      }
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragging(false)
      }
    }

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        await addFiles(files)
      }
    }

    const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index))
    }

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_HEIGHT)}px`
      }
    }, [input])

    const handleSubmit = () => {
      if ((!input.trim() && attachments.length === 0) || disabled) return
      onSend(input.trim(), attachments)
      setInput('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          'border-t bg-background p-4 transition-colors',
          isDragging && 'bg-muted/50 border-primary'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mx-auto max-w-3xl">
          {isDragging && (
            <div className="flex items-center justify-center py-4 mb-3 border-2 border-dashed border-primary rounded-lg text-muted-foreground">
              Drop files here
            </div>
          )}
          {attachments.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
              {attachments.map((file, i) => (
                <div key={i} className="relative group flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
                    {file.type === 'image' ? (
                      <img src={file.data} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-transform hover:scale-110"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="sr-only">Remove {file.name}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2 items-end">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type a message..."
              disabled={disabled || isLoading}
              className={cn(
                'min-h-[44px] max-h-[400px] resize-none',
                'focus-visible:ring-1'
              )}
              rows={1}
            />
            {isLoading ? (
              <Button
                variant="destructive"
                size="icon"
                onClick={onStop}
                className="shrink-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={(!input.trim() && attachments.length === 0) || disabled}
                size="icon"
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }
)
ChatInput.displayName = 'ChatInput'
