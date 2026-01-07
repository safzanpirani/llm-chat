import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Pencil, Copy, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODELS, type ModelId } from '@/lib/models'
import type { TokenUsage } from '@/lib/storage'

interface ChatInfoSidebarProps {
  isOpen: boolean
  onClose: () => void
  sessionTitle: string
  latestUsage: TokenUsage
  totalUsage: TokenUsage
  model: ModelId
  onRename: (newTitle: string) => void
  onDuplicate: () => void
  onDelete: () => void
}

export function ChatInfoSidebar({
  isOpen,
  onClose,
  sessionTitle,
  latestUsage,
  totalUsage,
  model,
  onRename,
  onDuplicate,
  onDelete,
}: ChatInfoSidebarProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(sessionTitle)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)

  const modelConfig = MODELS[model]

  const calcCost = (usage: TokenUsage) => {
    if (!modelConfig) return 0
    const inputCost = (usage.inputTokens / 1_000_000) * modelConfig.inputPrice
    const outputCost = (usage.outputTokens / 1_000_000) * modelConfig.outputPrice
    const cacheReadCost = modelConfig.cacheReadPrice && usage.cacheReadTokens 
      ? (usage.cacheReadTokens / 1_000_000) * modelConfig.cacheReadPrice 
      : 0
    const cacheWriteCost = modelConfig.cacheWritePrice && usage.cacheWriteTokens
      ? (usage.cacheWriteTokens / 1_000_000) * modelConfig.cacheWritePrice
      : 0
    return inputCost + outputCost + cacheReadCost + cacheWriteCost
  }

  const contextUsed = latestUsage.inputTokens + latestUsage.outputTokens
  const contextPercent = modelConfig ? (contextUsed / modelConfig.maxContext) * 100 : 0
  const latestCost = calcCost(latestUsage)
  const totalCost = calcCost(totalUsage)

  const formatCost = (value: number) => {
    if (value < 0.01) return `$${value.toFixed(4)}`
    if (value < 1) return `$${value.toFixed(3)}`
    return `$${value.toFixed(2)}`
  }

  const formatTokens = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
    return value.toString()
  }

  const handleSaveTitle = () => {
    if (editValue.trim() && editValue.trim() !== sessionTitle) {
      onRename(editValue.trim())
    }
    setIsEditing(false)
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-72 bg-background border-l shadow-lg transition-transform duration-300 ease-in-out md:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Chat Info</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Title</label>
            {isEditing ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') {
                      setEditValue(sessionTitle)
                      setIsEditing(false)
                    }
                  }}
                  className="flex-1 px-2 py-1 text-sm border rounded bg-background"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm truncate flex-1">{sessionTitle}</span>
                <Button size="icon" variant="ghost" onClick={() => {
                  setEditValue(sessionTitle)
                  setIsEditing(true)
                }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {(latestUsage.totalTokens > 0 || totalUsage.totalTokens > 0) && (
            <>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Token Usage</label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Input</span>
                    <span className="font-mono">
                      {formatTokens(latestUsage.inputTokens)}
                      {latestUsage.cacheReadTokens ? (
                        <span className="text-green-500 ml-1">(+{formatTokens(latestUsage.cacheReadTokens)})</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output</span>
                    <span className="font-mono">{formatTokens(latestUsage.outputTokens)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Context</span>
                    <span className={cn(
                      'font-mono',
                      contextPercent > 80 ? 'text-red-500' : contextPercent > 50 ? 'text-yellow-500' : ''
                    )}>
                      {contextPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Cost</label>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This request</span>
                    <span className="font-mono text-emerald-500">{formatCost(latestCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-mono">{formatCost(totalCost)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t space-y-2">
            {showDuplicateConfirm ? (
              <div className="p-3 rounded-lg border border-primary/50 bg-primary/10 space-y-2">
                <p className="text-sm">Duplicate this chat?</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      onDuplicate()
                      onClose()
                    }}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDuplicateConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowDuplicateConfirm(true)}>
                <Copy className="h-4 w-4" />
                Duplicate Chat
              </Button>
            )}
            
            {showDeleteConfirm ? (
              <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/10 space-y-2">
                <p className="text-sm text-destructive">Delete this chat?</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      onDelete()
                      onClose()
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Chat
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
