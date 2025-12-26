import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, MessageSquare, Trash2, Pencil, Check, X, PanelLeftClose, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionMeta } from '@/lib/storage'

interface SessionSidebarProps {
  sessions: SessionMeta[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, newTitle: string) => void
  onForkSession?: (id: string) => void
  isOpen: boolean
  onClose: () => void
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
  onForkSession,
  isOpen,
  onClose,
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
    if (e.ctrlKey || e.metaKey) {
      return
    }
    e.preventDefault()
    if (editingId !== sessionId) {
      onSelectSession(sessionId)
      if (window.innerWidth < 768) {
        onClose()
      }
    }
  }

  const handleNewChatClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      return
    }
    e.preventDefault()
    onNewSession()
    if (window.innerWidth < 768) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'flex h-full w-64 flex-col border-r bg-muted/30 transition-all duration-300 ease-in-out',
          // Mobile: fixed overlay positioning
          'fixed inset-y-0 left-0 z-50',
          // Desktop: relative positioning, shrink width when closed
          'md:relative md:z-auto',
          // Transform based on open state
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        )}
      >
        <div className="flex items-center justify-between p-4">
          <Button asChild className="flex-1 gap-2">
            <a href={getNewChatUrl()} onClick={handleNewChatClick}>
              <Plus className="h-4 w-4" />
              New Chat
            </a>
          </Button>
          {/* Close button - visible on mobile and as collapse on desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 shrink-0"
            onClick={onClose}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 [&>[data-radix-scroll-area-viewport]]:!block">
          <div className="space-y-1 pb-4 w-full">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent cursor-pointer',
                  currentSessionId === session.id && 'bg-accent'
                )}
              >
                <a
                  href={getSessionUrl(session.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 no-underline text-foreground"
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
                      className="min-w-0 flex-1 bg-background px-1 py-0.5 text-sm rounded border outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate" title={session.title}>
                      {session.title.length > 12 ? session.title.slice(0, 12) + '…' : session.title}
                    </span>
                  )}
                </a>
                <div className="flex shrink-0 items-center gap-1">
                  {editingId === session.id ? (
                    <>
                      <button
                        type="button"
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-background/50"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          confirmRename()
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-background/50"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          cancelEditing()
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-background/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          startEditing(session)
                        }}
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      {onForkSession && (
                        <button
                          type="button"
                          className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-background/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            onForkSession(session.id)
                          }}
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-background/50 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          onDeleteSession(session.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
