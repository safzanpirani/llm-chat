import { useState, useEffect, useCallback } from 'react'
import type { SessionMeta, Message } from '@/lib/storage'
import * as storage from '@/lib/storage'

export function useSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadSessions = useCallback(async () => {
    try {
      const data = await storage.getSessions()
      setSessions(data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [])

  const loadSession = useCallback(async (id: string) => {
    try {
      const session = await storage.getSession(id)
      setMessages(session.messages || [])
      setCurrentSessionId(id)
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
      const title = newMessages[0]?.content.slice(0, 50) || 'New Chat'
      await storage.updateSession(sessionId, { messages: newMessages, title })
      setMessages(newMessages)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, title, updatedAt: new Date().toISOString() }
            : s
        )
      )
    } catch (error) {
      console.error('Failed to save messages:', error)
    }
  }, [])

  useEffect(() => {
    loadSessions().finally(() => setIsLoading(false))
  }, [loadSessions])

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    loadSession,
    createSession,
    deleteSession,
    renameSession,
    saveMessages,
    setMessages,
  }
}
