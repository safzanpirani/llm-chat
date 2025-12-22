import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './chat-message'
import { ChatInput, type ChatInputHandle } from './chat-input'
import { ModelSelector } from './model-selector'
import { SessionSidebar } from './session-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { TokenTracker } from './token-tracker'
import { VariationSelector } from './variation-selector'
import { VariationGroup } from './variation-group'
import { useSessions } from '@/hooks/use-sessions'
import { DEFAULT_MODEL, MODELS, type ModelId } from '@/lib/models'
import type { Message, GeneratedImage, TokenUsage, VariationCount } from '@/lib/storage'
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
  const [variationCount, setVariationCount] = useState<VariationCount>(1)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingThinking, setStreamingThinking] = useState('')
  const [streamingImages, setStreamingImages] = useState<GeneratedImage[]>([])
  const [streamingUsage, setStreamingUsage] = useState<TokenUsage | null>(null)
  const [streamingVariations, setStreamingVariations] = useState<Array<{
    content: string
    thinking: string
    images: GeneratedImage[]
    retryIn: number | null
    error: string | null
  }>>([])
  const [activeStreamingVariation, setActiveStreamingVariation] = useState(0)
  const [retryingVariation, setRetryingVariation] = useState<{
    messageIndex: number
    variationIndex: number
    hasToken: boolean
  } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const abortControllersRef = useRef<AbortController[]>([])
  const streamingContentRef = useRef('')
  const streamingThinkingRef = useRef('')
  const streamingImagesRef = useRef<GeneratedImage[]>([])
  const streamingVariationsRef = useRef<Array<{
    content: string
    thinking: string
    images: GeneratedImage[]
    retryIn: number | null
    error: string | null
  }>>([])
  const pendingMessagesRef = useRef<Message[]>([])
  const pendingSessionIdRef = useRef<string | null>(null)
  const pendingModelRef = useRef<ModelId>(DEFAULT_MODEL)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const userScrolledRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const streamingUsageRef = useRef<TokenUsage | null>(null)
  const suppressAutoScrollRef = useRef(false)

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
  }, [streamingContent, streamingThinking, streamingVariations, isStreaming, scrollToBottom])

  // Scroll to bottom on new messages (non-streaming)
  useEffect(() => {
    if (!isStreaming) {
      if (suppressAutoScrollRef.current) {
        suppressAutoScrollRef.current = false
        return
      }
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

  const latestUsage = useMemo((): TokenUsage => {
    if (streamingUsage) {
      return streamingUsage
    }

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i]
      if (msg.usage) {
        return msg.usage
      }
      if (msg.variations && msg.variations.length > 0) {
        const activeIndex = msg.activeVariationIndex ?? 0
        const activeVariation = msg.variations[activeIndex]
        if (activeVariation?.usage) {
          return activeVariation.usage
        }
      }
    }

    return {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
    }
  }, [messages, streamingUsage])

  const totalUsage = useMemo((): TokenUsage => {
    const total: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
    }

    const seen = new Set<string>()
    const addUsage = (msg?: Message) => {
      if (!msg?.usage || seen.has(msg.id)) return
      seen.add(msg.id)
      total.inputTokens += msg.usage.inputTokens
      total.outputTokens += msg.usage.outputTokens
      total.cacheReadTokens = (total.cacheReadTokens || 0) + (msg.usage.cacheReadTokens || 0)
      total.cacheWriteTokens = (total.cacheWriteTokens || 0) + (msg.usage.cacheWriteTokens || 0)
      total.totalTokens += msg.usage.totalTokens
    }

    for (const msg of messages) {
      if (msg.variations && msg.variations.length > 0) {
        for (const variation of msg.variations) {
          addUsage(variation)
        }
      } else {
        addUsage(msg)
      }
      if (msg.siblings && msg.siblings.length > 0) {
        for (const sibling of msg.siblings) {
          addUsage(sibling)
        }
      }
    }

    if (streamingUsage) {
      total.inputTokens += streamingUsage.inputTokens
      total.outputTokens += streamingUsage.outputTokens
      total.cacheReadTokens = (total.cacheReadTokens || 0) + (streamingUsage.cacheReadTokens || 0)
      total.cacheWriteTokens = (total.cacheWriteTokens || 0) + (streamingUsage.cacheWriteTokens || 0)
      total.totalTokens += streamingUsage.totalTokens
    }

    return total
  }, [messages, streamingUsage])

  const streamSingleResponse = async (
    messagesToSend: Message[],
    abortSignal: AbortSignal,
    onUpdate: (data: { content?: string; thinking?: string; image?: GeneratedImage; usage?: TokenUsage }) => void
  ): Promise<{ content: string; thinking: string; images: GeneratedImage[]; usage: TokenUsage | null }> => {
    const isImageModel = IMAGE_GENERATION_MODELS.includes(model)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messagesToSend.map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
          generatedImages: m.generatedImages,
        })),
        ...(isImageModel && {
          imageConfig: { aspectRatio, resolution },
        }),
      }),
      signal: abortSignal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader available')

    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let thinking = ''
    let images: GeneratedImage[] = []
    let usage: TokenUsage | null = null

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
              usage = parsed.usage
              onUpdate({ usage: parsed.usage })
            }
            if (delta?.thinking) {
              thinking += delta.thinking
              onUpdate({ thinking: delta.thinking })
            }
            if (delta?.content) {
              content += delta.content
              onUpdate({ content: delta.content })
            }
            if (delta?.image) {
              images = [...images, delta.image]
              onUpdate({ image: delta.image })
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
            usage = parsed.usage
          }
          if (delta?.image) {
            images = [...images, delta.image]
          }
        } catch {
          // Ignore trailing partial
        }
      }
    }

    return { content, thinking, images, usage }
  }

  const handleSend = async (content: string, attachments?: Attachment[]) => {
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
    
    setTimeout(() => scrollToBottom('smooth'), 10)
    
    setIsStreaming(true)
    pendingMessagesRef.current = newMessages
    pendingSessionIdRef.current = sessionId
    pendingModelRef.current = model

    if (variationCount === 1) {
      setStreamingContent('')
      setStreamingThinking('')
      setStreamingImages([])
      setStreamingUsage(null)
      streamingContentRef.current = ''
      streamingThinkingRef.current = ''
      streamingImagesRef.current = []

      abortControllerRef.current = new AbortController()

      try {
        const result = await streamSingleResponse(
          newMessages,
          abortControllerRef.current.signal,
          (data) => {
            if (data.content) {
              streamingContentRef.current += data.content
              setStreamingContent(streamingContentRef.current)
            }
            if (data.thinking) {
              streamingThinkingRef.current += data.thinking
              setStreamingThinking(streamingThinkingRef.current)
            }
            if (data.image) {
              streamingImagesRef.current = [...streamingImagesRef.current, data.image]
              setStreamingImages(streamingImagesRef.current)
            }
            if (data.usage) {
              streamingUsageRef.current = data.usage
              setStreamingUsage(data.usage)
            }
          }
        )

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.content,
          thinking: result.thinking || undefined,
          generatedImages: result.images.length > 0 ? result.images : undefined,
          createdAt: new Date().toISOString(),
          model: model,
          usage: result.usage || undefined,
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
        } else {
          console.error('Chat error:', error)
        }
        setIsStreaming(false)
        setTimeout(() => {
          setStreamingContent('')
          setStreamingThinking('')
          setStreamingImages([])
          setStreamingUsage(null)
          streamingUsageRef.current = null
        }, 0)
      } finally {
        abortControllerRef.current = null
      }
    } else {
      const initialVariations = Array.from({ length: variationCount }, () => ({
        content: '',
        thinking: '',
        images: [] as GeneratedImage[],
        retryIn: null as number | null,
        error: null as string | null,
      }))
      setStreamingVariations(initialVariations)
      streamingVariationsRef.current = initialVariations
      setActiveStreamingVariation(0)

      abortControllersRef.current = Array.from({ length: variationCount }, () => new AbortController())

      const streamWithRetry = async (
        index: number,
        attempt: number = 0
      ): Promise<{ content: string; thinking: string; images: GeneratedImage[]; usage: TokenUsage | null }> => {
        const maxRetries = 5
        const baseDelay = 2000

        try {
          abortControllersRef.current[index] = new AbortController()
          
          const result = await streamSingleResponse(
            newMessages,
            abortControllersRef.current[index].signal,
            (data) => {
              const current = streamingVariationsRef.current[index]
              const updated = {
                content: data.content ? current.content + data.content : current.content,
                thinking: data.thinking ? current.thinking + data.thinking : current.thinking,
                images: data.image ? [...current.images, data.image] : current.images,
                retryIn: null,
                error: null,
              }
              streamingVariationsRef.current = [
                ...streamingVariationsRef.current.slice(0, index),
                updated,
                ...streamingVariationsRef.current.slice(index + 1),
              ]
              setStreamingVariations([...streamingVariationsRef.current])
            }
          )
          return result
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            throw error
          }
          
          const isRateLimit = (error as Error).message?.includes('429') || 
                              (error as Error).message?.includes('rate') ||
                              (error as Error).message?.includes('Too Many')
          
          if (isRateLimit && attempt < maxRetries) {
            const delaySeconds = Math.pow(2, attempt) * (baseDelay / 1000)
            
            for (let remaining = delaySeconds; remaining > 0; remaining--) {
              const current = streamingVariationsRef.current[index]
              const updated = { ...current, retryIn: remaining, error: null }
              streamingVariationsRef.current = [
                ...streamingVariationsRef.current.slice(0, index),
                updated,
                ...streamingVariationsRef.current.slice(index + 1),
              ]
              setStreamingVariations([...streamingVariationsRef.current])
              
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            const current = streamingVariationsRef.current[index]
            const reset = { ...current, retryIn: null, content: '', thinking: '', images: [] }
            streamingVariationsRef.current = [
              ...streamingVariationsRef.current.slice(0, index),
              reset,
              ...streamingVariationsRef.current.slice(index + 1),
            ]
            setStreamingVariations([...streamingVariationsRef.current])
            
            return streamWithRetry(index, attempt + 1)
          }
          
          const current = streamingVariationsRef.current[index]
          const errorMsg = isRateLimit ? 'Max retries exceeded' : 'Request failed'
          const updated = { ...current, retryIn: null, error: errorMsg }
          streamingVariationsRef.current = [
            ...streamingVariationsRef.current.slice(0, index),
            updated,
            ...streamingVariationsRef.current.slice(index + 1),
          ]
          setStreamingVariations([...streamingVariationsRef.current])
          
          return { content: current.content, thinking: current.thinking, images: current.images, usage: null }
        }
      }

      const streamPromises = Array.from({ length: variationCount }, (_, index) =>
        streamWithRetry(index)
      )

      try {
        const results = await Promise.all(streamPromises)
        
        const variations: Message[] = results.map((result) => ({
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: result.content,
          thinking: result.thinking || undefined,
          generatedImages: result.images.length > 0 ? result.images : undefined,
          createdAt: new Date().toISOString(),
          model: model,
          usage: result.usage || undefined,
        }))

        const activeIndex = Math.min(
          Math.max(activeStreamingVariation, 0),
          Math.max(variations.length - 1, 0)
        )
        const activeVariation = variations[activeIndex] || variations[0]
        const messageWithVariations: Message = {
          ...activeVariation,
          variations: variations,
          activeVariationIndex: activeIndex,
        }

        const finalMessages = [...newMessages, messageWithVariations]
        await saveMessages(sessionId, finalMessages)
        
        setIsStreaming(false)
        setTimeout(() => {
          setStreamingVariations([])
          streamingVariationsRef.current = []
        }, 0)
      } catch (error) {
        console.error('Parallel streaming error:', error)
        setIsStreaming(false)
        setStreamingVariations([])
        streamingVariationsRef.current = []
      } finally {
        abortControllersRef.current = []
      }
    }
  }

  const handleStop = () => {
    abortControllerRef.current?.abort()
    abortControllersRef.current.forEach(controller => controller.abort())
  }

  const handleSelectSession = async (id: string) => {
    const session = await loadSession(id)
    if (session?.model && session.model in MODELS) {
      setModel(session.model as ModelId)
    }
  }

  const buildOrderedVersions = (message: Message) => {
    const baseVersion: Message = { ...message, siblings: undefined, activeSiblingIndex: undefined }
    const allVersions = [...(message.siblings ?? []), baseVersion]
    const seen = new Set<string>()
    const uniqueVersions: Message[] = []
    for (const version of allVersions) {
      if (!seen.has(version.id)) {
        seen.add(version.id)
        uniqueVersions.push(version)
      }
    }
    return uniqueVersions
      .map((version, index) => ({ version, index }))
      .sort((a, b) => {
        const aTime = a.version.createdAt ?? ''
        const bTime = b.version.createdAt ?? ''
        if (aTime === bTime) return a.index - b.index
        return aTime.localeCompare(bTime)
      })
      .map(({ version }) => version)
  }

  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    const message = messages[messageIndex]
    if (!message || !currentSessionId) return
    
    const updatedMessage = { ...message, content: newContent }
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = updatedMessage
    
    await saveMessages(currentSessionId, updatedMessages)
  }

  const handleEditAndRegenerate = async (messageIndex: number, newContent: string) => {
    const message = messages[messageIndex]
    if (!message || !currentSessionId) return
    
    if (message.role === 'user') {
      const updatedMessage = { ...message, content: newContent }
      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = updatedMessage
      
      const nextIndex = messageIndex + 1
      if (nextIndex < messages.length && messages[nextIndex].role === 'assistant') {
        const aiMessage = messages[nextIndex]
        const previousMessages = updatedMessages.slice(0, nextIndex)
        
        const orderedVersions = buildOrderedVersions(aiMessage)
        
        setMessages(previousMessages)
        await saveMessages(currentSessionId, previousMessages)
        
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

          if (!response.ok) throw new Error('Failed to send message')

          if (isImageModel) {
            const data = await response.json()
            const generatedImages: GeneratedImage[] = data.images || []
            const newMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: data.text || '',
              model,
              generatedImages,
              createdAt: new Date().toISOString(),
              siblings: orderedVersions.length > 0 ? orderedVersions : undefined,
              activeSiblingIndex: orderedVersions.length > 0 ? orderedVersions.length : undefined,
            }
            const finalMessages = [...previousMessages, newMessage]
            setMessages(finalMessages)
            await saveMessages(currentSessionId, finalMessages)
          } else {
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
                if (!line.startsWith('data: ')) continue
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta
                  
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
                } catch {}
              }
            }

            const newMessage: Message = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: streamingContentRef.current,
              thinking: streamingThinkingRef.current || undefined,
              model,
              createdAt: new Date().toISOString(),
              siblings: orderedVersions.length > 0 ? orderedVersions : undefined,
              activeSiblingIndex: orderedVersions.length > 0 ? orderedVersions.length : undefined,
              usage: streamingUsageRef.current || undefined,
            }
            const finalMessages = [...previousMessages, newMessage]
            setMessages(finalMessages)
            await saveMessages(currentSessionId, finalMessages)
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Failed to regenerate:', error)
          }
        } finally {
          setIsStreaming(false)
          setStreamingContent('')
          setStreamingThinking('')
          setStreamingImages([])
        }
      } else {
        await saveMessages(currentSessionId, updatedMessages)
      }
    } else if (message.role === 'assistant') {
      const updatedMessage = { ...message, content: newContent }
      const updatedMessages = [...messages]
      updatedMessages[messageIndex] = updatedMessage
      await saveMessages(currentSessionId, updatedMessages)
      handleRetryMessage(messageIndex)
    }
  }

  const handleRetryMessage = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant' || !currentSessionId) return
    
    const previousUserMessageIndex = messageIndex - 1
    if (previousUserMessageIndex < 0) return
    
    const previousMessages = messages.slice(0, messageIndex)

    const orderedVersions = buildOrderedVersions(message)

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
        siblings: [...orderedVersions],
        activeSiblingIndex: orderedVersions.length,
        usage: streamingUsageRef.current || undefined,
      }

      const finalMessages = [...previousMessages, newAssistantMessage]
      await saveMessages(currentSessionId, finalMessages)
      
      setIsStreaming(false)
      setTimeout(() => {
        setStreamingContent('')
        setStreamingThinking('')
        setStreamingImages([])
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

  const handleRetryVariation = async (messageIndex: number, variationIndex: number) => {
    const message = messages[messageIndex]
    if (!message || message.role !== 'assistant' || !message.variations || !currentSessionId) return

    const activeIndex = message.activeVariationIndex ?? 0
    if (variationIndex !== activeIndex) return

    const previousMessages = messages.slice(0, messageIndex)
    let nextContent = ''
    let nextThinking = ''
    let nextImages: GeneratedImage[] = []
    let nextUsage: TokenUsage | undefined
    let latestMessages = messages

    const applyUpdate = () => {
      const updatedMessages = [...latestMessages]
      const currentMessage = updatedMessages[messageIndex]
      if (!currentMessage || !currentMessage.variations) return

      const variations = [...currentMessage.variations]
      const currentVariation = variations[variationIndex]
      if (!currentVariation) return

      const updatedVariation: Message = {
        ...currentVariation,
        content: nextContent,
        thinking: nextThinking || undefined,
        generatedImages: nextImages.length > 0 ? nextImages : undefined,
        ...(nextUsage ? { usage: nextUsage } : {}),
      }

      variations[variationIndex] = updatedVariation

      const updatedMessage: Message = {
        ...currentMessage,
        variations,
        content: nextContent,
        thinking: nextThinking || undefined,
        generatedImages: nextImages.length > 0 ? nextImages : undefined,
        ...(nextUsage ? { usage: nextUsage } : {}),
      }

      updatedMessages[messageIndex] = updatedMessage
      latestMessages = updatedMessages
      setMessages(updatedMessages)
    }

    let hasToken = false

    setRetryingVariation({ messageIndex, variationIndex, hasToken: false })
    setIsStreaming(true)
    userScrolledRef.current = false
    applyUpdate()

    abortControllerRef.current = new AbortController()

    try {
      await streamSingleResponse(
        previousMessages,
        abortControllerRef.current.signal,
        (data) => {
          const receivedToken = Boolean(data.content || data.thinking || data.image)
          if (receivedToken && !hasToken) {
            hasToken = true
            setRetryingVariation((prev) =>
              prev && prev.messageIndex === messageIndex && prev.variationIndex === variationIndex
                ? { ...prev, hasToken: true }
                : prev
            )
          }
          if (data.content) {
            nextContent += data.content
          }
          if (data.thinking) {
            nextThinking += data.thinking
          }
          if (data.image) {
            nextImages = [...nextImages, data.image]
          }
          if (data.usage) {
            nextUsage = data.usage
          }
          applyUpdate()
        }
      )

      await saveMessages(currentSessionId, latestMessages)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Variation retry error:', error)
      }
    } finally {
      setRetryingVariation(null)
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleNavigateSibling = async (messageIndex: number, direction: 'prev' | 'next') => {
    const message = messages[messageIndex]
    if (!message || !message.siblings || message.siblings.length === 0 || !currentSessionId) return

    const orderedVersions = buildOrderedVersions(message)
    const currentIndex = orderedVersions.findIndex((version) => version.id === message.id)
    if (currentIndex < 0) return

    const newIndex = direction === 'prev'
      ? Math.max(0, currentIndex - 1)
      : Math.min(orderedVersions.length - 1, currentIndex + 1)

    if (newIndex === currentIndex) return

    const selectedVersion = orderedVersions[newIndex]
    const remainingSiblings = orderedVersions.filter((_, i) => i !== newIndex)

    const updatedMessage: Message = {
      ...selectedVersion,
      siblings: remainingSiblings,
      activeSiblingIndex: newIndex,
    }

    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = updatedMessage

    suppressAutoScrollRef.current = true
    await saveMessages(currentSessionId, updatedMessages)
  }

  const handleDeleteMessage = async (messageIndex: number) => {
    if (!currentSessionId) return
    const updatedMessages = messages.filter((_, i) => i !== messageIndex)
    await saveMessages(currentSessionId, updatedMessages)
  }

  const handleAddMessageBefore = (messageIndex: number, role: 'user' | 'assistant') => {
    if (!currentSessionId) return
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content: '',
      createdAt: new Date().toISOString(),
      ...(role === 'assistant' && { model }),
    }
    const updatedMessages = [
      ...messages.slice(0, messageIndex),
      newMessage,
      ...messages.slice(messageIndex),
    ]
    setMessages(updatedMessages)
  }

  const handleSelectVariation = async (messageIndex: number, variationIndex: number) => {
    const message = messages[messageIndex]
    if (!message || !message.variations || !currentSessionId) return

    const selected = message.variations[variationIndex]
    if (!selected) return
    
    const updatedMessage: Message = {
      ...message,
      activeVariationIndex: variationIndex,
      content: selected.content,
      thinking: selected.thinking,
      generatedImages: selected.generatedImages,
      usage: selected.usage,
    }
    
    const updatedMessages = [...messages]
    updatedMessages[messageIndex] = updatedMessage
    
    suppressAutoScrollRef.current = true
    await saveMessages(currentSessionId, updatedMessages)
  }

  const getFlowColorIndex = (messageIndex: number): number | undefined => {
    for (let i = messageIndex; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'assistant' && msg.variations && msg.variations.length > 1) {
        return msg.activeVariationIndex ?? 0
      }
    }
    return undefined
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
            />
            {IMAGE_GENERATION_MODELS.includes(model) && (
              <>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as typeof ASPECT_RATIOS[number])}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar} value={ar}>{ar}</option>
                  ))}
                </select>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as typeof RESOLUTIONS[number])}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {RESOLUTIONS.map((res) => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(latestUsage.totalTokens > 0 || totalUsage.totalTokens > 0) && (
              <TokenTracker latestUsage={latestUsage} totalUsage={totalUsage} model={model} />
            )}
            <ThemeToggle />
          </div>
        </header>
        <ScrollArea 
          className="flex-1" 
          ref={scrollRef}
          onScrollCapture={handleScroll}
        >
          <div className="px-4 pb-4 flex flex-col gap-2">
            {messages.length === 0 && !streamingContent && streamingImages.length === 0 && streamingVariations.length === 0 ? (
              <div className="flex h-[calc(100vh-200px)] items-center justify-center text-muted-foreground">
                <p>Start a new conversation</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const siblingCount = message.siblings ? message.siblings.length + 1 : 1
                  const siblingIndex = message.activeSiblingIndex ?? (siblingCount - 1)
                  const hasVariations = message.variations && message.variations.length > 1
                  const flowColorIndex = getFlowColorIndex(index)
                  
                  if (hasVariations && message.role === 'assistant') {
                    return (
                      <VariationGroup
                        key={message.id}
                        variations={message.variations!}
                        activeIndex={message.activeVariationIndex ?? 0}
                        onSelectVariation={(varIndex) => handleSelectVariation(index, varIndex)}
                        modelName={message.model}
                        onEdit={(varIndex, content) => {
                          const variation = message.variations![varIndex]
                          if (variation && currentSessionId) {
                            const activeIndex = message.activeVariationIndex ?? 0
                            const updatedVariations = [...message.variations!]
                            const updatedVariation = { ...variation, content }
                            updatedVariations[varIndex] = updatedVariation
                            const updatedMessage: Message = activeIndex === varIndex
                              ? {
                                  ...message,
                                  variations: updatedVariations,
                                  content,
                                  thinking: updatedVariation.thinking,
                                  generatedImages: updatedVariation.generatedImages,
                                  usage: updatedVariation.usage,
                                }
                              : { ...message, variations: updatedVariations }
                            const updatedMessages = [...messages]
                            updatedMessages[index] = updatedMessage
                            saveMessages(currentSessionId, updatedMessages)
                          }
                        }}
                        onRetry={(varIndex) => handleRetryVariation(index, varIndex)}
                        onSaveAndRegenerate={(varIndex, content) => {
                          const variation = message.variations![varIndex]
                          if (variation && currentSessionId) {
                            const activeIdx = message.activeVariationIndex ?? 0
                            const updatedVariations = [...message.variations!]
                            const updatedVariation = { ...variation, content }
                            updatedVariations[varIndex] = updatedVariation
                            const updatedMessage: Message = activeIdx === varIndex
                              ? {
                                  ...message,
                                  variations: updatedVariations,
                                  content,
                                  thinking: updatedVariation.thinking,
                                  generatedImages: updatedVariation.generatedImages,
                                  usage: updatedVariation.usage,
                                }
                              : { ...message, variations: updatedVariations }
                            const updatedMessages = [...messages]
                            updatedMessages[index] = updatedMessage
                            saveMessages(currentSessionId, updatedMessages).then(() => {
                              handleRetryVariation(index, varIndex)
                            })
                          }
                        }}
                        onDelete={() => handleDeleteMessage(index)}
                        retryingVariationIndex={
                          retryingVariation && retryingVariation.messageIndex === index
                            ? retryingVariation.variationIndex
                            : undefined
                        }
                        retryingVariationHasToken={
                          retryingVariation && retryingVariation.messageIndex === index
                            ? retryingVariation.hasToken
                            : undefined
                        }
                      />
                    )
                  }
                  
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
                      variationIndex={flowColorIndex}
                      onEdit={(newContent) => handleEditMessage(index, newContent)}
                      onRetry={message.role === 'assistant' ? () => handleRetryMessage(index) : undefined}
                      onNavigateSibling={siblingCount > 1 ? (dir) => handleNavigateSibling(index, dir) : undefined}
                      onDelete={() => handleDeleteMessage(index)}
                      onAddBefore={() => handleAddMessageBefore(index, message.role as 'user' | 'assistant')}
                      onSaveAndRegenerate={(newContent) => handleEditAndRegenerate(index, newContent)}
                    />
                  )
                })}
                {streamingVariations.length > 0 && (
                  <VariationGroup
                    variations={[]}
                    activeIndex={activeStreamingVariation}
                    onSelectVariation={setActiveStreamingVariation}
                    isStreaming
                    streamingVariations={streamingVariations}
                    modelName={model}
                  />
                )}
                {streamingVariations.length === 0 && (streamingContent || streamingThinking || streamingImages.length > 0) && (
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
        <div className="border-t px-4 py-2 flex items-center gap-3">
          <VariationSelector
            value={variationCount}
            onChange={setVariationCount}
            disabled={isStreaming}
          />
          <div className="flex-1">
            <ChatInput
              ref={chatInputRef}
              onSend={handleSend}
              onStop={handleStop}
              isLoading={isStreaming}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
