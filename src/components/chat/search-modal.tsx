import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionMeta } from '@/lib/storage'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  sessions: SessionMeta[]
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

export function SearchModal({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onNewSession,
}: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = useCallback((index: number) => {
    if (query === '' && index === 0) {
      onNewSession()
      onClose()
    } else {
      const adjustedIndex = query === '' ? index - 1 : index
      const session = filteredSessions[adjustedIndex]
      if (session) {
        onSelectSession(session.id)
        onClose()
      }
    }
  }, [query, filteredSessions, onNewSession, onSelectSession, onClose])

  const totalItems = query === '' ? filteredSessions.length + 1 : filteredSessions.length

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement
    selectedElement?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        handleSelect(selectedIndex)
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-lg rounded-xl border bg-popover shadow-2xl">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search chats or press Enter for new chat..."
            className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-2">
          {query === '' && (
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                selectedIndex === 0
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              )}
              onClick={() => handleSelect(0)}
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </button>
          )}
          {filteredSessions.map((session, index) => {
            const itemIndex = query === '' ? index + 1 : index
            return (
              <button
                key={session.id}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  selectedIndex === itemIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                )}
                onClick={() => handleSelect(itemIndex)}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{session.title}</span>
              </button>
            )
          })}
          {filteredSessions.length === 0 && query !== '' && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No chats found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
