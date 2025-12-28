import type { ModelId } from './models'

export interface BenchmarkResult {
  id: string
  promptId: string
  promptName: string
  modelId: ModelId
  svgOutput: string
  durationMs: number
  timestamp: number
  error?: string
}

export interface BenchmarkRun {
  id: string
  promptId: string
  promptName: string
  timestamp: number
  results: BenchmarkResult[]
}

const STORAGE_KEY = 'svg-benchmark-history'
const MAX_RUNS = 50

export function saveBenchmarkRun(run: BenchmarkRun): void {
  const history = getBenchmarkHistory()
  history.unshift(run)
  
  if (history.length > MAX_RUNS) {
    history.splice(MAX_RUNS)
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

export function getBenchmarkHistory(): BenchmarkRun[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function getBenchmarkRun(id: string): BenchmarkRun | null {
  const history = getBenchmarkHistory()
  return history.find(run => run.id === id) || null
}

export function deleteBenchmarkRun(id: string): void {
  const history = getBenchmarkHistory()
  const filtered = history.filter(run => run.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function clearBenchmarkHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function generateResultId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
