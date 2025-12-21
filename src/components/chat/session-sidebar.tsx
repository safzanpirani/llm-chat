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

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="p-4">
        <Button onClick={onNewSession} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-accent cursor-pointer',
                currentSessionId === session.id && 'bg-accent'
              )}
              onClick={() => editingId !== session.id && onSelectSession(session.id)}
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
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      confirmRename()
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation()
                      cancelEditing()
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(session)
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
