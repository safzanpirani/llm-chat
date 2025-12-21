import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './chat-message'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { ModelSelector } from './model-selector'
import { SessionSidebar } from './session-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { TokenTracker } from './token-tracker'
import { useSessions } from '@/hooks/use-sessions'
import { DEFAULT_MODEL, MODELS, type ModelId } from '@/lib/models'
import type { Message, GeneratedImage, TokenUsage } from '@/lib/storage'
import type { Attachment } from './chat-input'

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'] as const
const RESOLUTIONS = ['1K', '2K', '4K'] as const

const IMAGE_GENERATION_MODELS: ModelId[] = ['gemini-3-pro-image-preview']

export function ChatContainer() {
  const {
    sessions,
    currentSessionId,
    messages,
    loadSession,
    createSession,
    deleteSession,
    renameSession,
    saveMessages,
    setMessages,
  } = useSessions()

  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL)
  const [aspectRatio, setAspectRatio] = useState<typeof ASPECT_RATIOS[number]>('1:1')
  const [resolution, setResolution] = useState<typeof RESOLUTIONS[number]>('1K')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [streamingImages, setStreamingImages] = useState<GeneratedImage[]>([])
  const [streamingUsage, setStreamingUsage] = useState<TokenUsage | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const streamingContentRef = useRef('')
  const streamingThinkingRef = useRef('')
  const streamingImagesRef = useRef<GeneratedImage[]>([])
  const pendingMessagesRef = useRef<Message[]>([])
  const pendingSessionIdRef = useRef<string | null>(null)
  const pendingModelRef = useRef<ModelId>(DEFAULT_MODEL)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const userScrolledRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const streamingUsageRef = useRef<TokenUsage | null>(null)

  // Improved scroll logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' })
    }
  }, [])

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isScrollingUp = target.scrollTop < lastScrollTopRef.current
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 50
    
    if (isScrollingUp && !isAtBottom) {
      userScrolledRef.current = true
    } else if (isAtBottom) {
      userScrolledRef.current = false
    }
    
    lastScrollTopRef.current = target.scrollTop
  }, [])

  useEffect(() => {
    if (isStreaming && !userScrolledRef.current) {
      scrollToBottom('smooth')
    }
  }, [streamingContent, streamingThinking, isStreaming, scrollToBottom])

  // Scroll to bottom on new messages (non-streaming)
  useEffect(() => {
    if (!isStreaming) {
      scrollToBottom('auto') // Instant scroll for page load/navigation
    }
  }, [messages, isStreaming, scrollToBottom])

  // Global keyboard handler - focus input when typing anywhere
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if already in an input/textarea or if modifier keys are pressed (except shift)
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return
      }

      // Ignore non-printable keys
      if (e.key.length !== 1 && e.key !== 'Backspace') {
        return
      }

      // Focus the chat input
      chatInputRef.current?.focus()
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Global paste handler - capture image pastes anywhere
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      // Ignore if already in an input/textarea
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

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
        await chatInputRef.current?.addFiles(imageFiles)
        chatInputRef.current?.focus()
      }
    }

    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [])

  const sessionUsage = useMemo((): TokenUsage => {
    const baseUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
    }
    
    for (const msg of messages) {
      if (msg.usage) {
        baseUsage.inputTokens += msg.usage.inputTokens
        baseUsage.outputTokens += msg.usage.outputTokens
        baseUsage.cacheReadTokens = (baseUsage.cacheReadTokens || 0) + (msg.usage.cacheReadTokens || 0)
        baseUsage.cacheWriteTokens = (baseUsage.cacheWriteTokens || 0) + (msg.usage.cacheWriteTokens || 0)
        baseUsage.totalTokens += msg.usage.totalTokens
      }
    }
    
    if (streamingUsage) {
      baseUsage.inputTokens += streamingUsage.inputTokens
      baseUsage.outputTokens += streamingUsage.outputTokens
      baseUsage.cacheReadTokens = (baseUsage.cacheReadTokens || 0) + (streamingUsage.cacheReadTokens || 0)
      baseUsage.cacheWriteTokens = (baseUsage.cacheWriteTokens || 0) + (streamingUsage.cacheWriteTokens || 0)
      baseUsage.totalTokens += streamingUsage.totalTokens
    }
    
    return baseUsage
  }, [messages, streamingUsage])

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    // Reset scroll state on new message
    userScrolledRef.current = false
    
    let sessionId = currentSessionId

    if (!sessionId) {
      const newSession = await createSession(model)
      if (!newSession) return
      sessionId = newSession.id
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      attachments,
      createdAt: new Date().toISOString(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    
    // Smooth scroll to show the new message
    setTimeout(() => scrollToBottom('smooth'), 10)
    
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingThinking('')
    setStreamingImages([])
    setStreamingUsage(null)
    streamingContentRef.current = ''
    streamingThinkingRef.current = ''
    streamingImagesRef.current = []
    pendingMessagesRef.current = newMessages
    pendingSessionIdRef.current = sessionId
    pendingModelRef.current = model

    abortControllerRef.current = new AbortController()

    try {
      const isImageModel = IMAGE_GENERATION_MODELS.includes(model)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
            generatedImages: m.generatedImages,
          })),
          ...(isImageModel && {
            imageConfig: {
              aspectRatio,
              resolution,
            },
          }),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              
              if (parsed.usage) {
                streamingUsageRef.current = parsed.usage
                setStreamingUsage(parsed.usage)
              }
              if (delta?.thinking) {
                streamingThinkingRef.current += delta.thinking
                setStreamingThinking(streamingThinkingRef.current)
              }
              if (delta?.content) {
                streamingContentRef.current += delta.content
                setStreamingContent(streamingContentRef.current)
              }
              if (delta?.image) {
                streamingImagesRef.current = [...streamingImagesRef.current, delta.image]
                setStreamingImages(streamingImagesRef.current)
              }
            } catch {
              // Partial JSON chunk
            }
          }
        }
      }

      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6)
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta
            if (parsed.usage) {
              streamingUsageRef.current = parsed.usage
              setStreamingUsage(parsed.usage)
            }
            if (delta?.image) {
              console.log('Received image with thoughtSignature:', !!delta.image.thoughtSignature)
              streamingImagesRef.current = [...streamingImagesRef.current, delta.image]
              setStreamingImages(streamingImagesRef.current)
            }
          } catch {
            // Ignore trailing partial
          }
        }
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingContentRef.current,
        thinking: streamingThinkingRef.current || undefined,
        generatedImages: streamingImagesRef.current.length > 0 ? streamingImagesRef.current : undefined,
        createdAt: new Date().toISOString(),
        model: model,
        usage: streamingUsageRef.current || undefined,
      }

      const finalMessages = [...newMessages, assistantMessage]
      await saveMessages(sessionId, finalMessages)
      
      setIsStreaming(false)
      setTimeout(() => {
        setStreamingContent('')
        setStreamingThinking('')
        setStreamingImages([])
        setStreamingUsage(null)
        streamingUsageRef.current = null
      }, 0)
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        if (streamingContentRef.current || streamingThinkingRef.current || streamingImagesRef.current.length > 0) {
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: streamingContentRef.current,
            thinking: streamingThinkingRef.current || undefined,
            generatedImages: streamingImagesRef.current.length > 0 ? streamingImagesRef.current : undefined,
            createdAt: new Date().toISOString(),
            model: pendingModelRef.current,
            usage: streamingUsageRef.current || undefined,
          }
          const finalMessages = [...pendingMessagesRef.current, assistantMessage]
          await saveMessages(pendingSessionIdRef.current!, finalMessages)
        }
        setIsStreaming(false)
        setTimeout(() => {
          setStreamingContent('')
          setStreamingThinking('')
          setStreamingImages([])
          setStreamingUsage(null)
          streamingUsageRef.current = null
        }, 0)
      } else {
        console.error('Chat error:', error)
        setIsStreaming(false)
        setStreamingContent('')
        setStreamingThinking('')
        setStreamingImages([])
        setStreamingUsage(null)
        streamingUsageRef.current = null
      }
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
  }

  const handleSelectSession = async (id: string) => {
    const session = await loadSession(id)
    if (session?.model && session.model in MODELS) {
      setModel(session.model as ModelId)
    }
  }

  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    const message = messages[messageIndex]
    if (!message || !currentSessionId) return
    
    const updatedMessage = { ...message, content: newContent }
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = updatedMessage
    
    await saveMessages(currentSessionId, updatedMessages)
  }

  const handleRetryMessage = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant' || !currentSessionId) return
    
    const previousUserMessageIndex = messageIndex - 1
    if (previousUserMessageIndex < 0) return
    
    const previousMessages = messages.slice(0, messageIndex)
    
    const existingSiblings = message.siblings || []
    const currentAsFirstSibling = existingSiblings.length === 0 
      ? [{ ...message, siblings: undefined, activeSiblingIndex: undefined }]
      : existingSiblings
    
    setMessages(previousMessages)
    
    setIsStreaming(true)
    setStreamingContent('')
    setStreamingThinking('')
    setStreamingImages([])
    setStreamingUsage(null)
    streamingContentRef.current = ''
    streamingThinkingRef.current = ''
    streamingImagesRef.current = []
    streamingUsageRef.current = null
    pendingMessagesRef.current = previousMessages
    pendingSessionIdRef.current = currentSessionId
    pendingModelRef.current = model
    userScrolledRef.current = false

    abortControllerRef.current = new AbortController()

    try {
      const isImageModel = IMAGE_GENERATION_MODELS.includes(model)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: previousMessages.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
            generatedImages: m.generatedImages,
          })),
          ...(isImageModel && {
            imageConfig: { aspectRatio, resolution },
          }),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              
              if (parsed.usage) {
                streamingUsageRef.current = parsed.usage
                setStreamingUsage(parsed.usage)
              }
              if (delta?.thinking) {
                streamingThinkingRef.current += delta.thinking
                setStreamingThinking(streamingThinkingRef.current)
              }
              if (delta?.content) {
                streamingContentRef.current += delta.content
                setStreamingContent(streamingContentRef.current)
              }
              if (delta?.image) {
                streamingImagesRef.current = [...streamingImagesRef.current, delta.image]
                setStreamingImages(streamingImagesRef.current)
              }
            } catch {
            }
          }
        }
      }

      const newAssistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingContentRef.current,
        thinking: streamingThinkingRef.current || undefined,
        generatedImages: streamingImagesRef.current.length > 0 ? streamingImagesRef.current : undefined,
        createdAt: new Date().toISOString(),
        model: model,
        siblings: [...currentAsFirstSibling],
        activeSiblingIndex: currentAsFirstSibling.length,
        usage: streamingUsageRef.current || undefined,
      }

      const finalMessages = [...previousMessages, newAssistantMessage]
      await saveMessages(currentSessionId, finalMessages)
      
      setIsStreaming(false)
      setTimeout(() => {
        setStreamingContent('')
        setStreamingThinking('')
        setStreamingImages([])
        setStreamingUsage(null)
        streamingUsageRef.current = null
      }, 0)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Retry error:', error)
        const restoredMessages = [...previousMessages, message]
        setMessages(restoredMessages)
      }
      setIsStreaming(false)
      setStreamingContent('')
      setStreamingThinking('')
      setStreamingImages([])
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleNavigateSibling = async (messageIndex: number, direction: 'prev' | 'next') => {
    const message = messages[messageIndex]
    if (!message || !message.siblings || message.siblings.length === 0 || !currentSessionId) return
    
    const currentIndex = message.activeSiblingIndex ?? message.siblings.length
    const allVersions = [...message.siblings, { ...message, siblings: undefined, activeSiblingIndex: undefined }]
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(allVersions.length - 1, currentIndex + 1)
    
    if (newIndex === currentIndex) return
    
    const selectedVersion = allVersions[newIndex]
    const remainingSiblings = allVersions.filter((_, i) => i !== newIndex)
    
    const updatedMessage: Message = {
      ...selectedVersion,
      siblings: remainingSiblings,
      activeSiblingIndex: newIndex,
    }
    
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = updatedMessage
    
    await saveMessages(currentSessionId, updatedMessages)
  }

  const handleNewSession = () => {
    createSession(model)
  }

  return (
    <div className="flex h-screen bg-background">
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 gap-3">
          <div className="flex items-center gap-3">
            <ModelSelector
              value={model}
              onChange={setModel}
              disabled={isStreaming}
            />
            {IMAGE_GENERATION_MODELS.includes(model) && (
              <>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as typeof ASPECT_RATIOS[number])}
                  disabled={isStreaming}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as typeof RESOLUTIONS[number])}
                  disabled={isStreaming}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {sessionUsage.totalTokens > 0 && (
              <TokenTracker usage={sessionUsage} model={model} />
            )}
            <ThemeToggle />
          </div>
        </header>
        <ScrollArea 
          className="flex-1" 
          ref={scrollRef}
          onScrollCapture={handleScroll}
        >
          <div className="mx-auto max-w-3xl pb-4 flex flex-col gap-2">
            {messages.length === 0 && !streamingContent && streamingImages.length === 0 ? (
              <div className="flex h-[calc(100vh-200px)] items-center justify-center text-muted-foreground">
                <p>Start a new conversation</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const siblingCount = message.siblings ? message.siblings.length + 1 : 1
                  const siblingIndex = message.activeSiblingIndex ?? (siblingCount - 1)
                  
                  return (
                    <ChatMessage
                      key={message.id}
                      role={message.role as 'user' | 'assistant'}
                      content={message.content}
                      thinking={message.thinking}
                      attachments={message.attachments}
                      generatedImages={message.generatedImages}
                      modelName={message.model}
                      siblingCount={siblingCount}
                      siblingIndex={siblingIndex}
                      onEdit={(newContent) => handleEditMessage(index, newContent)}
                      onRetry={message.role === 'assistant' ? () => handleRetryMessage(index) : undefined}
                      onNavigateSibling={siblingCount > 1 ? (dir) => handleNavigateSibling(index, dir) : undefined}
                    />
                  )
                })}
                {(streamingContent || streamingThinking || streamingImages.length > 0) && (
                  <ChatMessage
                    role="assistant"
                    content={streamingContent}
                    thinking={streamingThinking}
                    generatedImages={streamingImages}
                    isStreaming
                    modelName={model}
                  />
                )}
                <div ref={messagesEndRef} className="h-24" />
              </>
            )}
          </div>
        </ScrollArea>
        <ChatInput
          ref={chatInputRef}
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isStreaming}
        />
      </div>
    </div>
  )
}
