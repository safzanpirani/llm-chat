import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SVGRenderer } from './svg-renderer'
import { SVGLightbox } from './svg-lightbox'
import { SVG_PROMPTS, PROMPT_CATEGORIES, DIFFICULTY_COLORS, type SVGPrompt } from '@/lib/svg-prompts'
import { MODEL_LIST, type ModelId } from '@/lib/models'
import {
  saveBenchmarkRun,
  getBenchmarkHistory,
  deleteBenchmarkRun,
  generateRunId,
  generateResultId,
  type BenchmarkRun,
  type BenchmarkResult,
} from '@/lib/benchmark-storage'
import { Play, Square, Download, Shuffle, ChevronLeft, History, Trash2, X, LayoutGrid, List, Rows3 } from 'lucide-react'

type LayoutMode = 'grid' | 'compact' | 'list'

interface SVGBenchmarkContainerProps {
  onBack: () => void
}

export function SVGBenchmarkContainer({ onBack }: SVGBenchmarkContainerProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPrompt, setSelectedPrompt] = useState<SVGPrompt | null>(null)
  const [selectedModels, setSelectedModels] = useState<ModelId[]>(['gemini-2.5-flash'])
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [streamingOutputs, setStreamingOutputs] = useState<Record<string, string>>({})
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<BenchmarkRun[]>([])
  const [viewingRun, setViewingRun] = useState<BenchmarkRun | null>(null)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const abortControllersRef = useRef<AbortController[]>([])

  useEffect(() => {
    setHistory(getBenchmarkHistory())
  }, [])

  const filteredPrompts = selectedCategory === 'all'
    ? SVG_PROMPTS
    : SVG_PROMPTS.filter(p => p.category === selectedCategory)

  const toggleModel = (modelId: ModelId) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(m => m !== modelId)
        : [...prev, modelId]
    )
  }

  const runBenchmark = useCallback(async () => {
    if (!selectedPrompt || selectedModels.length === 0) return

    setIsRunning(true)
    setResults([])
    setStreamingOutputs({})
    setViewingRun(null)
    abortControllersRef.current = []

    const runId = generateRunId()
    const runResults: BenchmarkResult[] = []

    const benchmarkPromises = selectedModels.map(async (modelId) => {
      const abortController = new AbortController()
      abortControllersRef.current.push(abortController)

      const startTime = Date.now()
      let rawOutput = ''

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: selectedPrompt.prompt }],
          }),
          signal: abortController.signal,
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
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  rawOutput += content
                  setStreamingOutputs(prev => ({
                    ...prev,
                    [modelId]: rawOutput,
                  }))
                }
              } catch {
              }
            }
          }
        }

        const endTime = Date.now()
        const result: BenchmarkResult = {
          id: generateResultId(),
          promptId: selectedPrompt.id,
          promptName: selectedPrompt.name,
          modelId,
          svgOutput: rawOutput,
          durationMs: endTime - startTime,
          timestamp: Date.now(),
        }

        runResults.push(result)
        setResults(prev => [...prev, result])
        return result
      } catch (error) {
        const endTime = Date.now()
        const result: BenchmarkResult = {
          id: generateResultId(),
          promptId: selectedPrompt.id,
          promptName: selectedPrompt.name,
          modelId,
          svgOutput: rawOutput,
          durationMs: endTime - startTime,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        runResults.push(result)
        setResults(prev => [...prev, result])
        return result
      }
    })

    await Promise.all(benchmarkPromises)
    
    const run: BenchmarkRun = {
      id: runId,
      promptId: selectedPrompt.id,
      promptName: selectedPrompt.name,
      timestamp: Date.now(),
      results: runResults,
    }
    saveBenchmarkRun(run)
    setHistory(getBenchmarkHistory())
    
    setIsRunning(false)
  }, [selectedPrompt, selectedModels])

  const stopBenchmark = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort())
    setIsRunning(false)
  }, [])

  const selectRandomPrompt = useCallback(() => {
    const prompts = selectedCategory === 'all' ? SVG_PROMPTS : filteredPrompts
    const randomIndex = Math.floor(Math.random() * prompts.length)
    setSelectedPrompt(prompts[randomIndex])
  }, [selectedCategory, filteredPrompts])

  const downloadSVG = useCallback((svgContent: string, modelId: string, promptName?: string) => {
    const svgMatch = svgContent.match(/<svg[\s\S]*?<\/svg>/i)
    if (!svgMatch) return

    const blob = new Blob([svgMatch[0]], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${promptName || selectedPrompt?.id || 'benchmark'}-${modelId}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedPrompt])

  const viewHistoryRun = useCallback((run: BenchmarkRun) => {
    setViewingRun(run)
    setResults(run.results)
    setStreamingOutputs({})
    setShowHistory(false)
    
    const prompt = SVG_PROMPTS.find(p => p.id === run.promptId)
    if (prompt) {
      setSelectedPrompt(prompt)
    }
    
    const modelIds = run.results.map(r => r.modelId)
    setSelectedModels(modelIds)
  }, [])

  const handleDeleteRun = useCallback((runId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteBenchmarkRun(runId)
    setHistory(getBenchmarkHistory())
    if (viewingRun?.id === runId) {
      setViewingRun(null)
      setResults([])
    }
  }, [viewingRun])

  const displayResults = viewingRun ? viewingRun.results : results
  const displayModels = viewingRun 
    ? viewingRun.results.map(r => r.modelId)
    : selectedModels

  const getGridClasses = () => {
    switch (layoutMode) {
      case 'list':
        return 'grid-cols-1'
      case 'compact':
        if (displayModels.length <= 2) return 'grid-cols-2'
        if (displayModels.length <= 4) return 'grid-cols-4'
        return 'grid-cols-6'
      case 'grid':
      default:
        if (displayModels.length === 1) return 'grid-cols-1'
        if (displayModels.length === 2) return 'grid-cols-2'
        if (displayModels.length <= 4) return 'grid-cols-2'
        return 'grid-cols-3'
    }
  }

  const getCardClasses = () => {
    switch (layoutMode) {
      case 'list':
        return 'flex flex-row h-48'
      case 'compact':
        return ''
      case 'grid':
      default:
        return ''
    }
  }

  const lightboxData = lightboxIndex !== null ? (() => {
    const modelId = displayModels[lightboxIndex]
    const result = displayResults.find(r => r.modelId === modelId)
    const streaming = streamingOutputs[modelId]
    return {
      svgContent: result?.svgOutput || streaming || '',
      modelId,
      promptName: result?.promptName || selectedPrompt?.name || 'benchmark',
      duration: result?.durationMs,
    }
  })() : null

  return (
    <div className="flex h-screen bg-background">
      <SVGLightbox
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        svgContent={lightboxData?.svgContent || ''}
        modelId={lightboxData?.modelId || 'gemini-2.5-flash'}
        promptName={lightboxData?.promptName || ''}
        duration={lightboxData?.duration}
        onPrevious={() => setLightboxIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
        onNext={() => setLightboxIndex(prev => prev !== null && prev < displayModels.length - 1 ? prev + 1 : prev)}
        hasPrevious={lightboxIndex !== null && lightboxIndex > 0}
        hasNext={lightboxIndex !== null && lightboxIndex < displayModels.length - 1}
      />

      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
            <Button
              variant={showHistory ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              title="History"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-lg font-semibold">SVG Benchmark</h1>
          <p className="text-sm text-muted-foreground">Test LLM visual reasoning</p>
        </div>

        {showHistory ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No benchmark history yet
                </p>
              ) : (
                history.map(run => (
                  <button
                    key={run.id}
                    onClick={() => viewHistoryRun(run)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors group ${
                      viewingRun?.id === run.id
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{run.promptName}</span>
                      <button
                        onClick={(e) => handleDeleteRun(run.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{run.results.length} model{run.results.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{new Date(run.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {run.results.map(r => {
                        const model = MODEL_LIST.find(m => m.id === r.modelId)
                        return (
                          <span
                            key={r.id}
                            className={`h-2 w-2 rounded-full ${
                              model?.provider === 'anthropic' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            title={model?.name}
                          />
                        )
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        ) : (
          <>
            <div className="p-4 border-b border-border space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectRandomPrompt} className="flex-1">
                  <Shuffle className="h-4 w-4 mr-2" />
                  Random
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {filteredPrompts.map(prompt => (
                  <button
                    key={prompt.id}
                    onClick={() => {
                      setSelectedPrompt(prompt)
                      setViewingRun(null)
                      setResults([])
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPrompt?.id === prompt.id
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-2 w-2 rounded-full ${DIFFICULTY_COLORS[prompt.difficulty]}`} />
                      <span className="font-medium text-sm">{prompt.name}</span>
                    </div>
                    {prompt.description && (
                      <p className="text-xs text-muted-foreground">{prompt.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">
                  {selectedPrompt ? selectedPrompt.name : 'Select a prompt'}
                </h2>
                {viewingRun && (
                  <span className="text-xs bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                    <History className="h-3 w-3" />
                    Viewing history
                    <button
                      onClick={() => {
                        setViewingRun(null)
                        setResults([])
                      }}
                      className="ml-1 hover:bg-accent rounded"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
              {selectedPrompt && (
                <p className="text-sm text-muted-foreground">{selectedPrompt.prompt}</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex border border-border rounded-md">
                <Button
                  variant={layoutMode === 'compact' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setLayoutMode('compact')}
                  title="Compact grid"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-none border-x border-border"
                  onClick={() => setLayoutMode('grid')}
                  title="Large grid"
                >
                  <Rows3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setLayoutMode('list')}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              {isRunning ? (
                <Button variant="destructive" onClick={stopBenchmark}>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button 
                  onClick={runBenchmark} 
                  disabled={!selectedPrompt || selectedModels.length === 0 || !!viewingRun}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run Benchmark
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {MODEL_LIST.map(model => (
              <button
                key={model.id}
                onClick={() => !viewingRun && toggleModel(model.id)}
                disabled={!!viewingRun}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  displayModels.includes(model.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-accent'
                } ${viewingRun ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                  model.provider === 'anthropic' ? 'bg-orange-500' : 'bg-blue-500'
                }`} />
                {model.name}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {displayModels.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select at least one model to compare
            </div>
          ) : (
            <div className={`grid gap-4 ${getGridClasses()}`}>
              {displayModels.map((modelId, index) => {
                const model = MODEL_LIST.find(m => m.id === modelId)
                const result = displayResults.find(r => r.modelId === modelId)
                const streaming = streamingOutputs[modelId]
                const content = result?.svgOutput || streaming || ''
                const duration = result ? (result.durationMs / 1000).toFixed(2) : null

                return (
                  <div 
                    key={modelId} 
                    className={`border border-border rounded-lg overflow-hidden ${getCardClasses()}`}
                  >
                    <div className={`p-2 border-b border-border bg-muted/50 flex items-center justify-between ${
                      layoutMode === 'list' ? 'border-b-0 border-r flex-col justify-start items-start w-48 shrink-0' : ''
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          model?.provider === 'anthropic' ? 'bg-orange-500' : 'bg-blue-500'
                        }`} />
                        <span className="font-medium text-xs">{model?.name}</span>
                      </div>
                      <div className={`flex items-center gap-2 ${layoutMode === 'list' ? 'mt-2' : ''}`}>
                        {duration && (
                          <span className="text-xs text-muted-foreground">{duration}s</span>
                        )}
                        {content && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadSVG(content, modelId, result?.promptName)
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div 
                      className={`cursor-pointer hover:opacity-90 transition-opacity ${
                        layoutMode === 'list' ? 'flex-1 h-full' : 
                        layoutMode === 'compact' ? 'aspect-square' : 'aspect-square'
                      }`}
                      onClick={() => setLightboxIndex(index)}
                      title="Click to view fullscreen"
                    >
                      <SVGRenderer
                        svgContent={content}
                        className="w-full h-full"
                      />
                    </div>
                    {result?.error && (
                      <div className="p-2 bg-destructive/10 text-destructive text-xs">
                        {result.error}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
