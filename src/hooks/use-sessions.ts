import { useState, useEffect, useCallback, useRef } from 'react'
import type { SessionMeta, Message } from '@/lib/storage'
import * as storage from '@/lib/storage'

function getSessionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('session')
}

function updateUrlWithSession(sessionId: string | null) {
  const url = new URL(window.location.href)
  if (sessionId) {
    url.searchParams.set('session', sessionId)
  } else {
    url.searchParams.delete('session')
  }
  window.history.replaceState({}, '', url.toString())
}

async function generateTitle(message: string): Promise<string> {
  try {
    const res = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) return message.slice(0, 30) || 'New Chat'
    const data = await res.json()
    return data.title || message.slice(0, 30) || 'New Chat'
  } catch {
    return message.slice(0, 30) || 'New Chat'
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const titleRequestRef = useRef<Set<string>>(new Set())

  const loadSessions = useCallback(async () => {
    try {
      const data = await storage.getSessions()
      const sorted = [...data].sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt
        const bTime = b.updatedAt || b.createdAt
        return (bTime || '').localeCompare(aTime || '')
      })
      setSessions(sorted)
      return sorted
    } catch (error) {
      console.error('Failed to load sessions:', error)
      return []
    }
  }, [])

  const loadSession = useCallback(async (id: string) => {
    try {
      const session = await storage.getSession(id)
      setMessages(session.messages || [])
      setCurrentSessionId(id)
      updateUrlWithSession(id)
      return session
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }, [])

  const createSession = useCallback(async (model: string) => {
    try {
      const session = await storage.createSession('New Chat', model)
      setSessions((prev) => [session, ...prev])
      setCurrentSessionId(session.id)
      setMessages([])
      updateUrlWithSession(session.id)
      return session
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  }, [])

  const deleteSession = useCallback(async (id: string) => {
    try {
      await storage.deleteSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      if (currentSessionId === id) {
        setCurrentSessionId(null)
        setMessages([])
        updateUrlWithSession(null)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }, [currentSessionId])

  const renameSession = useCallback(async (id: string, newTitle: string) => {
    try {
      await storage.updateSession(id, { title: newTitle })
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, title: newTitle, updatedAt: new Date().toISOString() }
            : s
        )
      )
    } catch (error) {
      console.error('Failed to rename session:', error)
    }
  }, [])

  const saveMessages = useCallback(async (sessionId: string, newMessages: Message[]) => {
    try {
      const updatedAt = new Date().toISOString()
      const currentSession = sessions.find((s) => s.id === sessionId)
      const firstUserMessage = newMessages.find((m) => m.role === 'user')
      const firstPrefillMessage = newMessages.find((m) => m.role === 'assistant' && m.isPrefill)
      const titleSource = firstUserMessage || firstPrefillMessage
      const titleContent = firstUserMessage?.content || firstPrefillMessage?.originalPrefill || firstPrefillMessage?.content
      const fallbackTitle = titleContent?.slice(0, 30) || 'New Chat'
      const shouldGenerateTitle =
        Boolean(titleSource) &&
        !titleRequestRef.current.has(sessionId) &&
        (!currentSession || currentSession.title === 'New Chat')

      let title = currentSession?.title || 'New Chat'

      if (shouldGenerateTitle) {
        title = fallbackTitle
        titleRequestRef.current.add(sessionId)
      }

      await storage.updateSession(sessionId, { messages: newMessages, title })
      setMessages(newMessages)
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId
            ? { ...s, title, updatedAt }
            : s
        )
        const active = updated.find((s) => s.id === sessionId)
        const rest = updated.filter((s) => s.id !== sessionId)
        return active ? [active, ...rest] : updated
      })

      if (shouldGenerateTitle && titleContent) {
        generateTitle(titleContent).then((aiTitle) => {
          setSessions((prev) => {
            const target = prev.find((s) => s.id === sessionId)
            if (!target || (target.title !== fallbackTitle && target.title !== 'New Chat')) {
              return prev
            }
            storage.updateSession(sessionId, { title: aiTitle }).catch(() => {})
            return prev.map((s) =>
              s.id === sessionId ? { ...s, title: aiTitle } : s
            )
          })
        })
      }
    } catch (error) {
      console.error('Failed to save messages:', error)
    }
  }, [sessions])

  const forkSession = useCallback(async (id: string) => {
    try {
      const originalSession = await storage.getSession(id)
      if (!originalSession) return null

      const forkTitle = `Fork of ${originalSession.title}`
      const newSession = await storage.createSession(forkTitle, originalSession.model)

      const forkedMessages = originalSession.messages.map((m) => ({
        ...m,
        id: crypto.randomUUID(),
        siblings: undefined,
        activeSiblingIndex: undefined,
      }))

      await storage.updateSession(newSession.id, { messages: forkedMessages, title: forkTitle })

      setSessions((prev) => [{ ...newSession, title: forkTitle }, ...prev])
      setCurrentSessionId(newSession.id)
      setMessages(forkedMessages)
      updateUrlWithSession(newSession.id)

      return newSession
    } catch (error) {
      console.error('Failed to fork session:', error)
      return null
    }
  }, [])

  // Load sessions and restore from URL on mount
  useEffect(() => {
    const init = async () => {
      const loadedSessions = await loadSessions()
      const urlSessionId = getSessionIdFromUrl()
      if (urlSessionId && loadedSessions.some(s => s.id === urlSessionId)) {
        await loadSession(urlSessionId)
      }
      setIsLoading(false)
    }
    init()
  }, [loadSessions, loadSession])

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    loadSession,
    createSession,
    deleteSession,
    renameSession,
    forkSession,
    saveMessages,
    setMessages,
  }
}
