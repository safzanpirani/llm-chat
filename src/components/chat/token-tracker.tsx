import { useMemo } from 'react'
import { MODELS, type ModelId } from '@/lib/models'
import type { TokenUsage } from '@/lib/storage'

interface TokenTrackerProps {
  latestUsage: TokenUsage
  totalUsage: TokenUsage
  model: ModelId
}

export function TokenTracker({ latestUsage, totalUsage, model }: TokenTrackerProps) {
  const modelConfig = MODELS[model]
  
  const { latestCost, totalCost, contextPercent } = useMemo(() => {
    if (!modelConfig) {
      return { latestCost: 0, totalCost: 0, contextPercent: 0 }
    }

    const calcCost = (usage: TokenUsage) => {
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
    const contextPct = (contextUsed / modelConfig.maxContext) * 100

    return {
      latestCost: calcCost(latestUsage),
      totalCost: calcCost(totalUsage),
      contextPercent: contextPct,
    }
  }, [latestUsage, totalUsage, modelConfig])

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

  const contextColor = contextPercent > 80 
    ? 'text-red-500' 
    : contextPercent > 50 
      ? 'text-yellow-500' 
      : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">In:</span>
        <span>{formatTokens(latestUsage.inputTokens)}</span>
        {latestUsage.cacheReadTokens ? (
          <span className="text-green-500" title="Cache read">
            (+{formatTokens(latestUsage.cacheReadTokens)})
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Out:</span>
        <span>{formatTokens(latestUsage.outputTokens)}</span>
      </div>
      <div className={`flex items-center gap-1.5 ${contextColor}`}>
        <span>Context:</span>
        <span>{contextPercent.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-emerald-500">{formatCost(latestCost)}</span>
        <span className="text-muted-foreground">Total {formatCost(totalCost)}</span>
      </div>
    </div>
  )
}
