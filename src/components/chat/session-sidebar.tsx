import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionMeta } from '@/lib/storage'

interface SessionSidebarProps {
  sessions: SessionMeta[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, newTitle: string) => void
}

function getSessionUrl(sessionId: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('session', sessionId)
  return url.toString()
}

function getNewChatUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.delete('session')
  return url.toString()
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const startEditing = (session: SessionMeta) => {
    setEditingId(session.id)
    setEditingTitle(session.title)
  }

  const confirmRename = () => {
    if (editingId && editingTitle.trim()) {
      onRenameSession(editingId, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleSessionClick = (e: React.MouseEvent, sessionId: string) => {
    // Allow ctrl/cmd+click to open in new tab (default anchor behavior)
    if (e.ctrlKey || e.metaKey) {
      return
    }
    e.preventDefault()
    if (editingId !== sessionId) {
      onSelectSession(sessionId)
    }
  }

  const handleNewChatClick = (e: React.MouseEvent) => {
    // Allow ctrl/cmd+click to open in new tab
    if (e.ctrlKey || e.metaKey) {
      return
    }
    e.preventDefault()
    onNewSession()
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="p-4">
        <Button asChild className="w-full gap-2">
          <a href={getNewChatUrl()} onClick={handleNewChatClick}>
            <Plus className="h-4 w-4" />
            New Chat
          </a>
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {sessions.map((session) => (
            <a
              key={session.id}
              href={getSessionUrl(session.id)}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-accent cursor-pointer no-underline text-foreground',
                currentSessionId === session.id && 'bg-accent'
              )}
              onClick={(e) => handleSessionClick(e, session.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              {editingId === session.id ? (
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') cancelEditing()
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-background px-1 py-0.5 text-sm rounded border outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate">{session.title}</span>
              )}
              {editingId === session.id ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      confirmRename()
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      cancelEditing()
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      startEditing(session)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      onDeleteSession(session.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </a>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
